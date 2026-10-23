from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from psycopg2.errors import UniqueViolation
from shared.user_repository import UserRepository, IdentityConflictError


def test_existing_subject_ignores_email_reassignment(monkeypatch):
    repo=UserRepository();original=SimpleNamespace(id='retained-profile',cognito_id='original')
    monkeypatch.setattr(repo,'get_by_cognito_id',lambda sub:original)
    email=Mock();monkeypatch.setattr(repo,'get_by_email',email)
    assert repo.get_or_create_from_cognito('original','changed@example.invalid') is original
    email.assert_not_called()


def test_recreated_account_never_rebinds_email_owner(monkeypatch):
    repo=UserRepository();original=SimpleNamespace(id='retained-profile',cognito_id='old-sub')
    monkeypatch.setattr(repo,'get_by_cognito_id',lambda sub:None)
    monkeypatch.setattr(repo,'get_by_email',lambda email:original)
    create=Mock();monkeypatch.setattr(repo,'create',create)
    with pytest.raises(IdentityConflictError,match='identity-link review'):
        repo.get_or_create_from_cognito('new-sub','same@example.invalid')
    assert original.cognito_id=='old-sub'
    create.assert_not_called()


def test_concurrent_first_request_returns_subject_winner(monkeypatch):
    repo=UserRepository();winner=SimpleNamespace(id='winner',cognito_id='same-sub')
    monkeypatch.setattr(repo,'get_by_cognito_id',Mock(side_effect=[None,winner]))
    monkeypatch.setattr(repo,'get_by_email',lambda email:None)
    monkeypatch.setattr(repo,'create',Mock(side_effect=UniqueViolation('race')))
    assert repo.get_or_create_from_cognito('same-sub','same@example.invalid') is winner


def test_concurrent_different_subject_email_collision_is_blocked(monkeypatch):
    repo=UserRepository()
    monkeypatch.setattr(repo,'get_by_cognito_id',lambda sub:None)
    monkeypatch.setattr(repo,'get_by_email',Mock(side_effect=[None,SimpleNamespace(cognito_id='another-sub')]))
    monkeypatch.setattr(repo,'create',Mock(side_effect=UniqueViolation('race')))
    with pytest.raises(IdentityConflictError):repo.get_or_create_from_cognito('new-sub','same@example.invalid')


def test_unrelated_integrity_error_is_not_hidden(monkeypatch):
    repo=UserRepository()
    monkeypatch.setattr(repo,'get_by_cognito_id',lambda sub:None)
    monkeypatch.setattr(repo,'get_by_email',lambda email:None)
    monkeypatch.setattr(repo,'create',Mock(side_effect=UniqueViolation('other constraint')))
    with pytest.raises(UniqueViolation):repo.get_or_create_from_cognito('new-sub','new@example.invalid')


def test_authenticated_handler_returns_actionable_conflict():
    from shared.auth import require_auth
    @require_auth
    def endpoint(event,context):raise IdentityConflictError()
    r=endpoint({'requestContext':{'authorizer':{'jwt':{'claims':{'sub':'new'}}}}},None)
    assert r['statusCode']==409 and 'identity-link review' in r['body']


def test_learning_returns_conflict_before_course_queries(monkeypatch):
    from learning import handler
    monkeypatch.setattr(handler,'_actor',Mock(side_effect=IdentityConflictError()))
    r=handler.handler({'rawPath':'/admin/learning/overview','requestContext':{'http':{'method':'GET'}}},None)
    assert r['statusCode']==409


def test_public_catalog_returns_conflict_for_signed_in_identity(monkeypatch):
    from courses import handler
    monkeypatch.setattr(handler,'list_courses',Mock(side_effect=IdentityConflictError()))
    r=handler.handler({'rawPath':'/courses','httpMethod':'GET'},None)
    assert r['statusCode']==409
