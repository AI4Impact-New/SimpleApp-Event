"""A stale web artifact must never silently replace the current student release."""
import importlib.util
import json
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location('student_deploy', Path(__file__).resolve().parents[1] / 'scripts/deploy_student_portal.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


@pytest.mark.parametrize('manifest', [None, {'commit': 'older', 'dirty': False}, {'commit': 'current', 'dirty': True}, {'commit': 'current'}])
def test_missing_stale_or_dirty_export_is_rejected(tmp_path, manifest):
    if manifest is not None:
        (tmp_path / 'release.json').write_text(json.dumps(manifest))
    with pytest.raises(ValueError):
        deploy.validate_release(tmp_path, 'current')


def test_clean_export_matches_expected_commit(tmp_path):
    (tmp_path / 'release.json').write_text(json.dumps({'commit': 'current', 'dirty': False}))
    assert deploy.validate_release(tmp_path, 'current')['commit'] == 'current'
