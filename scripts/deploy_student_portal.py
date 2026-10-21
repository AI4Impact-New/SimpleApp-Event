#!/usr/bin/env python3
"""Upload an Expo web export to the Terraform-managed Amplify portal.

Run `npm ci && npx expo export --platform web` in mobile-app first.
Credentials use the local AWS CLI profile, never bundled frontend secrets.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from urllib.request import Request, urlopen
from zipfile import ZipFile, ZIP_DEFLATED


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', default='jm')
    parser.add_argument('--region', default='ap-south-1')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    dist = root / 'mobile-app' / 'dist'
    if not (dist / 'index.html').exists():
        parser.error('Export mobile-app for web before deploying')
    app = subprocess.check_output(['terraform', f'-chdir={root / "infra/terraform"}', 'output', '-raw', 'student_portal_amplify_app_id'], text=True).strip()
    aws = ['aws', '--profile', args.profile, '--region', args.region, 'amplify']
    with tempfile.TemporaryDirectory(prefix='ai4impact-portal-') as temporary:
        archive = Path(temporary) / 'portal.zip'
        with ZipFile(archive, 'w', ZIP_DEFLATED) as output:
            for item in sorted(dist.rglob('*')):
                if item.is_file():
                    output.write(item, item.relative_to(dist))
        deployment = json.loads(subprocess.check_output(aws + ['create-deployment', '--app-id', app, '--branch-name', 'main'], text=True))
        # Upload URL is a short-lived credential. Never print or persist it.
        with urlopen(Request(deployment['zipUploadUrl'], data=archive.read_bytes(), method='PUT'), timeout=120) as response:
            if response.status not in (200, 201):
                raise RuntimeError('Amplify artifact upload failed')
        job = json.loads(subprocess.check_output(aws + ['start-deployment', '--app-id', app, '--branch-name', 'main', '--job-id', deployment['jobId']], text=True))
        print(json.dumps({'app_id': app, 'job_id': job['jobSummary']['jobId'], 'status': job['jobSummary']['status']}))


if __name__ == '__main__':
    main()
