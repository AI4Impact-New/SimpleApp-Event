"""Resend transport. Credentials stay in Secrets Manager, never browser settings."""
import base64
import json
import os
import time
import boto3
import requests
from botocore.config import Config

secret_client = boto3.client('secretsmanager', config=Config(connect_timeout=3, read_timeout=5, retries={'mode':'standard','total_max_attempts':2}))
_key_cache = None


class DeliveryError(Exception):
    def __init__(self, code, status=502, uncertain=False):
        self.code, self.status, self.uncertain = code, status, uncertain
        super().__init__('Email outcome is uncertain. Check Resend before sending again.' if uncertain else 'Email could not be sent. Check email configuration or delivery status before trying again.')


def api_key():
    global _key_cache
    arn=os.environ.get('RESEND_API_KEY_SECRET_ARN')
    if not arn: raise DeliveryError('not_configured',503)
    if _key_cache and _key_cache[0]==arn and time.monotonic()<_key_cache[2]: return _key_cache[1]
    try:
        raw=secret_client.get_secret_value(SecretId=arn).get('SecretString','')
    except (secret_client.exceptions.ResourceNotFoundException, secret_client.exceptions.InvalidRequestException):
        raise DeliveryError('missing_secret_version',503) from None
    try: key=json.loads(raw).get('api_key')
    except (ValueError,AttributeError): raise DeliveryError('invalid_secret',503) from None
    if not isinstance(key,str) or not key.startswith('re_') or any(c.isspace() for c in key): raise DeliveryError('invalid_secret',503)
    _key_cache=(arn,key,time.monotonic()+300)
    return key


def send_quote_email(*, recipient, subject, plain, html, pdf, idempotency_key):
    sender=os.environ.get('TRANSACTIONAL_FROM_EMAIL','')
    if not sender or '\r' in sender or '\n' in sender: raise DeliveryError('invalid_sender',503)
    payload={'from':f'AI4Impact <{sender}>','to':[recipient],'subject':subject,'html':html,'text':plain,
             'attachments':[{'filename':'AI4Impact-pro-forma.pdf','content':base64.b64encode(pdf).decode('ascii')}]}
    try:
        # No automatic HTTP retry. A lost response may already represent a sent email.
        response=requests.post('https://api.resend.com/emails',json=payload,
            headers={'Authorization':'Bearer '+api_key(),'Idempotency-Key':idempotency_key},timeout=(3,10),allow_redirects=False)
    except requests.RequestException:
        raise DeliveryError('network_outcome_unknown',uncertain=True) from None
    if not 200 <= response.status_code < 300:
        raise DeliveryError('resend_http_'+str(response.status_code),uncertain=response.status_code>=500)
    try: message_id=response.json()['id']
    except (ValueError,KeyError,TypeError): raise DeliveryError('invalid_response',uncertain=True) from None
    if not isinstance(message_id,str) or not message_id: raise DeliveryError('invalid_response',uncertain=True)
    return message_id
