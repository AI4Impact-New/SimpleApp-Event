"""Playback identity and token expiry remain server-controlled."""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
import pytest
from learning import service, access_windows, media
from learning.validation import ApiError

UID = '00000000-0000-0000-0000-000000000001'
CID = '00000000-0000-0000-0000-000000000002'
ACTOR = {'id': UID, 'admin': False}

@pytest.mark.parametrize('remaining,expected', [(None,900),(60,60),(1800,900)])
def test_playback_issues_verified_identity_and_bounds_url_expiry(monkeypatch,remaining,expected):
    monkeypatch.setattr(service, 'class_row', lambda _: {'course_id':CID})
    monkeypatch.setattr(service, 'access', lambda *_: {})
    monkeypatch.setattr(service, 'execute_query', lambda *_a,**_k: {'id': CID,'object_key':'private.mp4','duration_seconds':1358})
    deadline = datetime.now(timezone.utc)+timedelta(seconds=remaining+0.9) if remaining else None
    monkeypatch.setattr(access_windows, 'require_window', lambda *_: deadline)
    signer = Mock(return_value='https://private.example/signed')
    monkeypatch.setattr(media, 'playback_url', signer)
    cursor = Mock();cursor.fetchone.return_value = None
    @contextmanager
    def db(): yield cursor
    monkeypatch.setattr(service, 'get_db_cursor', db)
    result = service.playback(ACTOR,CID)
    assert result['expires_in'] == expected
    assert result['watermark'] == {'company':'AI4Impact','student_id':UID,'move_interval_seconds':25}
    signer.assert_called_once_with('private.mp4',expected)


def test_unenrolled_request_never_signs_video(monkeypatch):
    monkeypatch.setattr(service,'class_row',lambda _: {'course_id':CID})
    def denied(*_): raise ApiError(403,'Registration required')
    monkeypatch.setattr(service,'access',denied)
    signer=Mock();monkeypatch.setattr(media,'playback_url',signer)
    with pytest.raises(ApiError) as exc: service.playback(ACTOR,CID)
    assert exc.value.status == 403
    signer.assert_not_called()
