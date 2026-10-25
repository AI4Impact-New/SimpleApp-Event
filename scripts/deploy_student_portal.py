#!/usr/bin/env python3
"""Upload an Expo web export to the Terraform-managed Amplify portal.

Run `npm ci && npm run export:web` in mobile-app first.
Credentials use the local AWS CLI profile, never bundled frontend secrets.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.request import Request, urlopen
from zipfile import ZipFile, ZIP_DEFLATED


def validate_release(dist, expected_commit):
    """Reject stale or uncommitted exports before creating a remote deployment."""
    manifest = dist / 'release.json'
    if not manifest.exists():
        raise ValueError('Build provenance missing; run npm run export:web')
    release = json.loads(manifest.read_text())
    if release.get('commit') != expected_commit or release.get('dirty') is not False:
        raise ValueError('Export must come from the current, clean commit; rebuild before deploying')
    return release


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', default='jm')
    parser.add_argument('--region', default='ap-south-1')
    parser.add_argument('--app-id', help='Existing student Amplify app; otherwise read Terraform output')
    parser.add_argument('--wait', action='store_true', help='Wait for Amplify and verify the hosted release commit')
    parser.add_argument('--timeout', type=int, default=600)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    dist = root / 'mobile-app' / 'dist'
    if not (dist / 'index.html').exists():
        parser.error('Export mobile-app for web before deploying')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    try:
        release = validate_release(dist, commit)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    app = args.app_id or subprocess.check_output(['terraform', f'-chdir={root / "infra/terraform"}', 'output', '-raw', 'student_portal_amplify_app_id'], text=True).strip()
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
        summary = job['jobSummary']
        if args.wait:
            deadline = time.monotonic() + args.timeout
            while summary['status'] not in ('SUCCEED', 'FAILED', 'CANCELLED'):
                if time.monotonic() >= deadline:
                    raise TimeoutError(f'Amplify job {summary["jobId"]} did not finish before timeout')
                time.sleep(5)
                summary = json.loads(subprocess.check_output(aws + ['get-job', '--app-id', app, '--branch-name', 'main', '--job-id', summary['jobId']], text=True))['job']['summary']
            if summary['status'] != 'SUCCEED':
                raise RuntimeError(f'Amplify job {summary["jobId"]}: {summary["status"]}')
            app_info = json.loads(subprocess.check_output(aws + ['get-app', '--app-id', app], text=True))
            domain = app_info['app']['defaultDomain']
            # A unique query avoids serving an older manifest from an intermediary cache.
            url = f'https://main.{domain}/release.json?commit={commit}'
            with urlopen(Request(url, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
                hosted = json.load(response)
            if hosted.get('commit') != release['commit'] or hosted.get('dirty') is not False:
                raise RuntimeError('Hosted student release does not match the deployed source commit')
        print(json.dumps({'app_id': app, 'job_id': summary['jobId'], 'status': summary['status'], 'commit': commit}))


if __name__ == '__main__':
    main()
