"""
Users Lambda handler.
"""

import json
import logging
from typing import Any, Dict

from shared.auth import create_error_response, create_response, require_role, require_auth

logger = logging.getLogger(__name__)


def _parse_limit(value: Any, default: int = 50) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(limit, 200))


def _normalize_group_values(raw_groups):
    from shared.auth import _normalize_groups
    return list(_normalize_groups(raw_groups))


def _enrich_users_with_profile(users: list) -> list:
    """Merge DB profile (user_type, university, company, etc.) into each user dict by cognito_id (sub). One batch DB lookup for speed."""
    if not users:
        return users
    try:
        from shared.user_repository import UserRepository
        repo = UserRepository()
        subs = [u.get("sub") for u in users if u.get("sub")]
        profile_by_sub = repo.get_by_cognito_ids(subs) if subs else {}
        enriched = []
        for u in users:
            out = dict(u)
            groups = _normalize_group_values(out.get("groups"))
            out["access_role"] = "admin" if "Admins" in groups else "student"
            db_user = profile_by_sub.get(out.get("sub")) if out.get("sub") else None
            if db_user:
                out["user_type"] = getattr(db_user, "user_type", None)
                out["university"] = getattr(db_user, "university", None)
                out["course"] = getattr(db_user, "course", None)
                out["year_of_study"] = getattr(db_user, "year_of_study", None)
                out["city"] = getattr(db_user, "city", None)
                out["state"] = getattr(db_user, "state", None)
                out["designation"] = getattr(db_user, "designation", None)
                out["company"] = getattr(db_user, "company", None)
            enriched.append(out)
        return enriched
    except Exception as e:
        logger.warning("Could not enrich users with profile: %s", e)
        return users


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main users handler routing for /admin-users, /users, and /users/me endpoints."""
    try:
        path = event.get("path", "/users")
        method = event.get("httpMethod", event.get("method", "GET"))

        if path == "/admin-users":
            if method == "GET":
                return list_admin_users(event, context)
            if method == "POST":
                return create_admin_user(event, context)

        if path == "/users" and method == "GET":
            return list_app_users(event, context)

        if path == "/users/me" and method == "GET":
            return get_users_me(event, context)

        if path == "/users/me" and method in ("PUT", "POST"):
            return put_users_me(event, context)

        if path == "/users/me/privacy-consent" and method == "POST":
            return post_privacy_consent(event, context)

        return create_error_response(404, "Endpoint not found")
    except Exception as exc:
        logger.error("Users handler error: %s", exc, exc_info=True)
        return create_error_response(500, "Internal server error")


@require_auth
def get_users_me(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """GET /users/me – fetch current user profile from DB, creating a minimal row if needed."""
    from shared.user_repository import get_or_create_user_from_claims

    user_claims = event.get("user") or {}
    db_user = get_or_create_user_from_claims(user_claims)
    if not db_user:
        return create_error_response(400, "Missing user identity")

    payload = db_user.to_dict()
    groups = _normalize_group_values(user_claims.get("cognito:groups") or user_claims.get("groups"))
    payload["access_role"] = "admin" if "Admins" in groups else "student"
    return create_response(200, payload)


@require_auth
def put_users_me(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """PUT /users/me – create or update current user profile (auth required)."""
    from shared.user_repository import UserRepository

    user_claims = event.get("user") or {}
    cognito_id = user_claims.get("sub")
    email = (user_claims.get("email") or user_claims.get("email_verified") or "").strip() or None
    if not cognito_id:
        return create_error_response(400, "Missing user identity (sub)")

    try:
        body = json.loads(event.get("body", "{}") or "{}")
    except json.JSONDecodeError:
        return create_error_response(400, "Invalid JSON body")

    name = (body.get("name") or "").strip() or None
    user_type = (body.get("user_type") or "").strip() or None
    if user_type and user_type not in ("student", "professional"):
        return create_error_response(400, "user_type must be 'student' or 'professional'")
    university = (body.get("university") or "").strip() or None
    course = (body.get("course") or "").strip() or None
    year_of_study = (body.get("year_of_study") or "").strip() or None
    city = (body.get("city") or "").strip() or None
    state = (body.get("state") or "").strip() or None
    designation = (body.get("designation") or "").strip() or None
    company = (body.get("company") or "").strip() or None

    if not email:
        email = (user_claims.get("cognito:username") or user_claims.get("username") or "").strip() or None
    if not email:
        return create_error_response(400, "Email is required for profile")

    repo = UserRepository()
    updated = repo.upsert_profile(
        cognito_id=cognito_id,
        email=email,
        name=name,
        user_type=user_type,
        university=university,
        course=course,
        year_of_study=year_of_study,
        city=city,
        state=state,
        designation=designation,
        company=company,
    )
    return create_response(200, updated.to_dict())


@require_auth
def post_privacy_consent(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """POST /users/me/privacy-consent – record privacy policy acceptance (version and timestamp)."""
    from shared.user_repository import get_or_create_user_from_claims, UserRepository

    user_claims = event.get("user") or {}
    db_user = get_or_create_user_from_claims(user_claims)
    if not db_user:
        return create_error_response(400, "User profile could not be resolved")

    try:
        body = json.loads(event.get("body", "{}") or "{}")
    except json.JSONDecodeError:
        return create_error_response(400, "Invalid JSON body")
    version = (body.get("version") or "").strip()
    if not version:
        return create_error_response(400, "version is required")

    repo = UserRepository()
    success = repo.update_privacy_consent(db_user.id, version)
    if not success:
        return create_error_response(500, "Failed to record consent")
    return create_response(200, {"accepted": True, "version": version})


@require_role("admin")
def list_admin_users(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """GET /admin-users."""
    from users.service import UsersService

    params = event.get("queryStringParameters", {}) or {}
    limit = _parse_limit(params.get("limit", 50))
    next_token = params.get("next_token")

    service = UsersService()
    result = service.list_users(group="Admins", limit=limit, next_token=next_token)
    result["users"] = _enrich_users_with_profile(result.get("users") or [])
    return create_response(200, result)


@require_role("admin")
def list_app_users(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """GET /users?group=Students."""
    from users.service import UsersService

    params = event.get("queryStringParameters", {}) or {}
    raw_group = (params.get("group") or "All").strip()
    group = None if raw_group.lower() == "all" else raw_group
    limit = _parse_limit(params.get("limit", 50))
    next_token = params.get("next_token")

    service = UsersService()
    result = service.list_users(group=group, limit=limit, next_token=next_token)
    result["users"] = _enrich_users_with_profile(result.get("users") or [])
    return create_response(200, result)


@require_role("admin")
def create_admin_user(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """POST /admin-users."""
    from users.service import UsersService

    body = json.loads(event.get("body", "{}"))
    email = (body.get("email") or "").strip().lower()
    temp_password = body.get("temp_password") or ""
    given_name = (body.get("given_name") or "").strip() or None
    family_name = (body.get("family_name") or "").strip() or None

    if not email:
        return create_error_response(400, "email is required")
    if not temp_password:
        return create_error_response(400, "temp_password is required")

    service = UsersService()
    user, error = service.create_admin_user(
        email=email,
        temp_password=temp_password,
        given_name=given_name,
        family_name=family_name,
    )

    if error:
        if "already exists" in error.lower():
            return create_error_response(409, error)
        return create_error_response(400, error)

    return create_response(
        201,
        {
            "message": "Admin user created successfully. Temporary password sent via email.",
            "user": user,
        },
    )
