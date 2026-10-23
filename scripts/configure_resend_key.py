#!/usr/bin/env python3
"""Store a Resend sending key without putting it in shell history or Terraform."""
import getpass
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

if not sys.stdin.isatty():
    raise SystemExit('Run this script in your local interactive terminal.')
key=getpass.getpass('Resend sending API key (hidden): ').strip()
if not key.startswith('re_') or any(c.isspace() for c in key):
    raise SystemExit('Expected a Resend API key beginning re_. Nothing saved.')
with tempfile.TemporaryDirectory(prefix='ai4impact-resend-') as directory:
    path=Path(directory)/'secret.json'
    descriptor=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(descriptor,'w') as file:json.dump({'api_key':key},file)
    result=subprocess.run(['aws','secretsmanager','put-secret-value','--profile','jm','--region','ap-south-1',
        '--secret-id','pilearn/resend-api-key','--secret-string','file://'+str(path)],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    if result.returncode:raise SystemExit('Could not save the key. Check AWS login and secret permissions. The key was not printed.')
print('Resend key saved securely. Sending remains disabled until sender verification and activation.')
