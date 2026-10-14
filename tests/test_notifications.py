from contextlib import contextmanager
from unittest.mock import Mock
import pytest
from learning import devices
from learning.validation import ApiError
from notifications import handler as worker

ACTOR={'id':'00000000-0000-0000-0000-000000000001','admin':False}
PROJECT='00000000-0000-0000-0000-000000000099'


def test_push_registration_disabled_without_project(monkeypatch):
    monkeypatch.delenv('EXPO_PROJECT_ID',raising=False)
    with pytest.raises(ApiError) as error: devices.register(ACTOR,{})
    assert error.value.status==503


def test_push_registration_rejects_other_project(monkeypatch):
    monkeypatch.setenv('EXPO_PROJECT_ID',PROJECT)
    with pytest.raises(ApiError) as error:
        devices.register(ACTOR,{'project_id':ACTOR['id'],'platform':'android','token':'ExponentPushToken[TemporaryToken12345]'})
    assert error.value.status==400


def test_disabled_worker_does_not_contact_provider(monkeypatch):
    monkeypatch.delenv('EXPO_PROJECT_ID',raising=False)
    cur=Mock()
    @contextmanager
    def cursor(): yield cur
    monkeypatch.setattr(worker,'get_db_cursor',cursor)
    provider=Mock(side_effect=AssertionError('Provider must not be contacted'))
    monkeypatch.setattr(worker,'_post',provider)
    assert worker.handler({},None)['disabled'] is True
    provider.assert_not_called()


def test_transport_retries_stop_after_five_attempts():
    cur=Mock()
    worker._retry(cur,[{'id':'job','attempts':4}],'TransportError')
    assert cur.execute.call_args.args[1][1]=='failed'


def test_provider_batch_error_is_not_treated_as_delivery(monkeypatch):
    response=Mock();response.json.return_value={'errors':[{'message':'Rejected'}]}
    monkeypatch.setattr(worker.http,'post',Mock(return_value=response))
    with pytest.raises(ValueError): worker._post('send',[{'to':'fake'}])
