import json
from unittest.mock import Mock

import pytest
from shared import db


@pytest.fixture(autouse=True)
def reset_secret(monkeypatch):
    monkeypatch.delenv("DB_SECRET_ARN", raising=False)
    monkeypatch.setattr(db, "_secret_client", None)
    monkeypatch.setattr(db, "_password_cache", None)


def test_local_password_without_aws(monkeypatch):
    monkeypatch.setenv("DB_PASSWORD", "local-only")
    client = Mock()
    monkeypatch.setattr(db.boto3, "client", client)
    assert db.get_db_config()["password"] == "local-only"
    client.assert_not_called()


def test_secret_overrides_environment_and_caches(monkeypatch):
    monkeypatch.setenv("DB_SECRET_ARN", "secret-one")
    monkeypatch.setenv("DB_PASSWORD", "must-not-use")
    client = Mock()
    client.get_secret_value.return_value = {"SecretString": json.dumps({"password": "secret-value"})}
    monkeypatch.setattr(db.boto3, "client", Mock(return_value=client))
    assert db.get_db_config()["password"] == "secret-value"
    assert db.get_db_config()["password"] == "secret-value"
    client.get_secret_value.assert_called_once_with(SecretId="secret-one")


def test_expired_secret_cache_refreshes(monkeypatch):
    monkeypatch.setenv("DB_SECRET_ARN", "secret-one")
    clock = Mock(return_value=10)
    monkeypatch.setattr(db.time, "monotonic", clock)
    client = Mock()
    client.get_secret_value.side_effect = [{"SecretString": '{"password":"first"}'}, {"SecretString": '{"password":"rotated"}'}]
    monkeypatch.setattr(db.boto3, "client", Mock(return_value=client))
    assert db.get_db_config()["password"] == "first"
    clock.return_value = 311
    assert db.get_db_config()["password"] == "rotated"


def test_secret_failure_never_falls_back(monkeypatch):
    monkeypatch.setenv("DB_SECRET_ARN", "secret-one")
    monkeypatch.setenv("DB_PASSWORD", "must-not-use")
    client = Mock()
    client.get_secret_value.side_effect = RuntimeError("retrieval failed")
    monkeypatch.setattr(db.boto3, "client", Mock(return_value=client))
    with pytest.raises(RuntimeError, match="retrieval failed"):
        db.get_db_config()


def test_missing_password_fails_closed(monkeypatch):
    monkeypatch.setenv("DB_SECRET_ARN", "secret-one")
    client = Mock()
    client.get_secret_value.return_value = {"SecretString": '{}'}
    monkeypatch.setattr(db.boto3, "client", Mock(return_value=client))
    with pytest.raises(ValueError, match="missing a password"):
        db.get_db_config()
