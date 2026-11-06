#!/usr/bin/env python3
"""Import local Razorpay CLI TEST credentials into AWS Secrets Manager, without printing secrets."""
import argparse
import json
from pathlib import Path
import secrets
import os
import requests
import boto3
from botocore.config import Config
import yaml


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile',default='jm')
    parser.add_argument('--qa-email',action='append',required=True)
    parser.add_argument('--webhook-secret-file',type=Path,help='Optional private local file for Dashboard webhook setup')
    args=parser.parse_args()
    path=Path.home()/'.razorpay/config.yaml'
    config=yaml.safe_load(path.read_text()); path.chmod(0o600)
    if not config.get('key_id','').startswith('rzp_test_') or not config.get('key_secret'):
        raise SystemExit('Valid test credentials required. No live activation is supported by this script.')
    check=requests.get('https://api.razorpay.com/v1/orders',params={'count':1},auth=(config['key_id'],config['key_secret']),timeout=(5,10))
    if check.status_code!=200: raise SystemExit('Razorpay rejected test authentication (HTTP '+str(check.status_code)+'). Reconfigure the matching test key pair. Nothing updated.')
    client=boto3.Session(profile_name=args.profile,region_name='ap-south-1').client('secretsmanager',config=Config(
        connect_timeout=3,read_timeout=5,retries={'mode':'standard','total_max_attempts':3}))
    name='pilearn/razorpay'
    try:
        old=json.loads(client.get_secret_value(SecretId=name)['SecretString'])
    except client.exceptions.ResourceNotFoundException:
        client.create_secret(Name=name,Description='Razorpay server credentials and webhook signing secret')
        old={}
    value={'mode':'test','key_id':config['key_id'],'key_secret':config['key_secret'],
        'webhook_secret':old.get('webhook_secret') or secrets.token_urlsafe(48),
        'test_buyer_emails':sorted(set(args.qa_email))}
    result=client.put_secret_value(SecretId=name,SecretString=json.dumps(value))
    if args.webhook_secret_file:
        fd=os.open(args.webhook_secret_file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as file:file.write(value['webhook_secret'])
    print(json.dumps({'secret_arn':result['ARN'],'mode':'test','qa_accounts':len(value['test_buyer_emails'])}))

if __name__=='__main__':main()
