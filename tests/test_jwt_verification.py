"""Exercise actual signatures and algorithm restrictions after the JWT upgrade."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import time

from cryptography.hazmat.primitives.asymmetric import rsa
import jwt
import pytest


@pytest.fixture
def verifier(monkeypatch):
    spec = importlib.util.spec_from_file_location('jwt_regression_auth', Path(__file__).resolve().parents[1] / 'shared/auth.py')
    auth = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(auth)
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    monkeypatch.setattr(auth, 'COGNITO_REGION', 'ap-south-1')
    monkeypatch.setattr(auth, 'COGNITO_USER_POOL_ID', 'qa-pool')
    monkeypatch.setattr(auth, 'COGNITO_APP_CLIENT_ID', 'qa-client')
    monkeypatch.setattr(auth, 'get_jwks_client', lambda: SimpleNamespace(get_signing_key_from_jwt=lambda token: SimpleNamespace(key=private.public_key())))
    claims = {'sub': 'qa-subject', 'iss': 'https://cognito-idp.ap-south-1.amazonaws.com/qa-pool', 'aud': 'qa-client', 'exp': int(time.time()) + 300}
    return auth, private, claims


def test_valid_cognito_rsa_signature_is_accepted(verifier):
    auth, key, claims = verifier
    assert auth.verify_token(jwt.encode(claims, key, algorithm='RS256'))['sub'] == claims['sub']


@pytest.mark.parametrize('changes', [{'aud': 'other-client'}, {'iss': 'https://untrusted.example'}, {'exp': 1}])
def test_wrong_audience_issuer_or_expiry_is_denied(verifier, changes):
    auth, key, claims = verifier
    with pytest.raises(jwt.InvalidTokenError):
        auth.verify_token(jwt.encode({**claims, **changes}, key, algorithm='RS256'))


def test_hmac_cannot_replace_cognito_rsa(verifier):
    auth, _, claims = verifier
    token = jwt.encode(claims, 'synthetic-test-key-that-is-at-least-32-bytes', algorithm='HS256')
    with pytest.raises(jwt.InvalidAlgorithmError):
        auth.verify_token(token)
