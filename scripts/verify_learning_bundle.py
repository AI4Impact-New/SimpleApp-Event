#!/usr/bin/env python3
"""Reject incomplete shared learning/Programme Lambda deployment bundles."""
import sys
from pathlib import Path
from zipfile import ZipFile

REQUIRED = (
    'learning/handler.py', 'learning/payments.py', 'learning/billing.py',
    'learning/fee_ledger.py', 'learning/email_delivery.py',
    'shared/email_templates.py', 'programme/worker.py',
    'learning/assets/logo.png', 'reportlab/pdfgen/canvas.py',
)

def verify_bundle(archive):
    with ZipFile(archive) as bundle:
        missing = sorted(set(REQUIRED) - set(bundle.namelist()))
        if missing:
            raise ValueError('Incomplete learning/Programme bundle: '+', '.join(missing))
    return len(REQUIRED)

if __name__ == '__main__':
    try:
        count=verify_bundle(Path(sys.argv[1]))
    except (ValueError,IndexError) as error:
        raise SystemExit(str(error))
    print(f'Learning/Programme bundle verified: {count} required modules/assets')
