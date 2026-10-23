"""
Courses Lambda handler.
Entry point for course-related API requests.
"""

import json
import logging
from typing import Dict, Any

from shared.auth import require_auth, require_role, create_response, create_error_response

from shared.user_repository import IdentityConflictError

logger = logging.getLogger(__name__)


def _request_path(event: Dict[str, Any]) -> str:
    """Normalize request path for routing (strip stage prefix if present)."""
    path = event.get("rawPath") or event.get("path") or "/courses"
    path = path.rstrip("/")
    # Strip stage prefix e.g. /default or /$default so /default/courses/enquiries -> /courses/enquiries
    parts = path.split("/")
    if len(parts) >= 2 and parts[1] in ("default", "$default"):
        path = "/" + "/".join(parts[2:]) if len(parts) > 2 else "/"
    return path or "/courses"


def _extract_course_id(event: Dict[str, Any]) -> str:
    """Extract course_id from path or pathParameters."""
    params = event.get("pathParameters") or {}
    if params.get("course_id"):
        return params["course_id"]
    path = _request_path(event)
    parts = path.rstrip("/").split("/")
    if len(parts) >= 3 and parts[1] == "courses":
        return parts[2]
    return ""


def _load_json_body(event: Dict[str, Any]) -> Dict[str, Any]:
    body = event.get("body", "{}") or "{}"
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON body") from exc


def _parse_limit(value: Any, default: int = 50) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(limit, 200))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for courses.
    Routes: GET/POST /courses, GET/PUT/DELETE /courses/{id}, POST /courses/{id}/register.
    """
    try:
        path = _request_path(event)
        method = (
            event.get("httpMethod")
            or (event.get("requestContext") or {}).get("http", {}).get("method")
            or event.get("method", "GET")
        )
        parts = path.rstrip("/").split("/")

        if path == "/courses" or path.startswith("/courses?"):
            if method == "GET":
                return list_courses(event, context)
            if method == "POST":
                return create_course(event, context)
            return create_error_response(404, "Endpoint not found")

        if path == "/courses/enquiries" or path.startswith("/courses/enquiries?"):
            if method == "GET":
                return list_course_enquiries(event, context)
            return create_error_response(404, "Endpoint not found")

        if len(parts) >= 3 and parts[1] == "me" and parts[2] == "courses" and method == "GET":
            return list_my_courses(event, context)

        if len(parts) >= 3 and parts[1] == "courses":
            course_id = parts[2]
            # Do not treat literal segments as course_id (UUID only)
            if course_id in ("enquiries",):
                return create_error_response(404, "Endpoint not found")
            if len(parts) == 3:
                if method == "GET":
                    return get_course(event, context)
                if method == "PUT":
                    return update_course(event, context)
                if method == "DELETE":
                    return delete_course(event, context)
            if len(parts) == 4:
                if parts[3] == "register" and method == "POST":
                    return register_course(event, context)
                if parts[3] == "interest" and method == "POST":
                    return mark_interest(event, context)
                if parts[3] == "registrations":
                    if method == "GET":
                        return list_registrations(event, context)
                    if method in ("PUT", "PATCH"):
                        return update_registration(event, context)
                if parts[3] == "calendar.ics" and method == "GET":
                    return get_course_calendar_ics(event, context)

        return create_error_response(404, "Endpoint not found")
    except IdentityConflictError as exc:
        return create_error_response(409, str(exc))
    except Exception as e:
        logger.error("Handler error: %s", e, exc_info=True)
        return create_error_response(500, "Internal server error")


def list_courses(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """List courses; optional query: status, full, limit."""
    from courses.service import CourseService
    params = event.get("queryStringParameters") or {}
    service = CourseService()
    from shared.entitlements import is_admin
    from shared.auth import get_current_user
    status_filter = params.get("status") if is_admin(get_current_user(event) or {}) else "published"
    full = (params.get("full") or "").lower() in ("1", "true", "yes")
    limit = _parse_limit(params.get("limit", 50))
    result = service.list_courses(limit=limit, status_filter=status_filter, full=full)
    result = [_catalog_content(item, event) for item in result]
    return create_response(200, result)


def get_course(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get single course by ID."""
    from courses.service import CourseService
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    service = CourseService()
    result = service.get_course(course_id)
    if not result:
        return create_error_response(404, "Course not found")
    from shared.auth import get_current_user
    from shared.entitlements import is_admin
    if result.get("status") != "published" and not is_admin(get_current_user(event) or {}):
        return create_error_response(404, "Course not found")
    return create_response(200, _catalog_content(result, event))


@require_role("admin")
def create_course(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Create a new course (admin)."""
    from courses.service import CourseService
    try:
        body = _load_json_body(event)
    except ValueError as exc:
        return create_error_response(400, str(exc))
    service = CourseService()
    result = service.create_course(body)
    return create_response(201, result)


@require_role("admin")
def update_course(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Update an existing course (admin)."""
    from courses.service import CourseService
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    try:
        body = _load_json_body(event)
    except ValueError as exc:
        return create_error_response(400, str(exc))
    service = CourseService()
    result = service.update_course(course_id, body)
    if not result:
        return create_error_response(404, "Course not found")
    return create_response(200, result)


@require_role("admin")
def delete_course(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Delete a course (admin)."""
    from courses.service import CourseService
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    service = CourseService()
    from courses.repository import CourseDeletionConflict
    try:
        success = service.delete_course(course_id)
    except CourseDeletionConflict as error:
        return create_error_response(409, str(error))
    if not success:
        return create_error_response(404, "Course not found")
    return create_response(200, {"message": "Course deleted"})


@require_auth
def register_course(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Register current user for a course."""
    from courses.service import CourseService
    from shared.user_repository import get_or_create_user_from_claims
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    if not app_user:
        return create_error_response(400, "Authenticated user profile could not be resolved")
    body = event.get("body") or "{}"
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {}
    source = body.get("source", "mobile")
    service = CourseService()
    success = service.register_course(course_id, app_user.id, source=source)
    if not success:
        return create_error_response(404, "Course not found")
    return create_response(200, {"registered": True, "message": "Registered for course"})


@require_auth
def mark_interest(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Mark current user as interested in a course."""
    from courses.service import CourseService
    from shared.user_repository import get_or_create_user_from_claims
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    if not app_user:
        return create_error_response(400, "Authenticated user profile could not be resolved")
    service = CourseService()
    success = service.mark_interest(course_id, app_user.id, source="mobile")
    if not success:
        return create_error_response(404, "Course not found")
    return create_response(200, {"interested": True, "message": "Marked as interested"})


@require_role("admin")
def list_registrations(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """List all registrations for a course (admin)."""
    from courses.service import CourseService
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    params = event.get("queryStringParameters") or {}
    from shared.entitlements import is_admin
    from shared.auth import get_current_user
    status_filter = params.get("status") if is_admin(get_current_user(event) or {}) else "published"
    service = CourseService()
    result = service.list_registrations(course_id, status_filter=status_filter)
    return create_response(200, {"registrations": result})


@require_role("admin")
def list_course_enquiries(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """List all course enquiries (registrations with status=interested)."""
    from courses.service import CourseService
    params = event.get("queryStringParameters") or {}
    status = params.get("status", "interested")
    service = CourseService()
    result = service.list_enquiries(status=status)
    return create_response(200, {"enquiries": result})


@require_auth
def list_my_courses(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """List courses the current user is registered/interested in."""
    from courses.service import CourseService
    from shared.user_repository import get_or_create_user_from_claims
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    if not app_user:
        return create_error_response(400, "Authenticated user profile could not be resolved")
    service = CourseService()
    result = service.list_user_registrations(app_user.id)
    return create_response(200, {"courses": result})


def get_course_calendar_ics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get .ics calendar for course (public or auth)."""
    from courses.service import CourseService
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    from shared.auth import get_current_user
    from shared.entitlements import enrolled, is_admin
    from shared.user_repository import get_or_create_user_from_claims
    claims = get_current_user(event) or {}
    app_user = get_or_create_user_from_claims(claims) if claims else None
    if not is_admin(claims) and (not app_user or not enrolled(app_user.id, course_id)):
        return create_error_response(403, "Registration required for the class calendar")
    service = CourseService()
    ics_content = service.get_course_ics(course_id)
    if not ics_content:
        return create_error_response(404, "Course or classes not found")
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="course.ics"',
        },
        "body": ics_content,
        "isBase64Encoded": False,
    }


@require_role("admin")
def update_registration(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Update a registration status/notes (admin). Body: { user_id, status, notes }."""
    from courses.service import CourseService
    course_id = _extract_course_id(event)
    if not course_id:
        return create_error_response(400, "course_id is required")
    try:
        body = _load_json_body(event)
    except ValueError as exc:
        return create_error_response(400, str(exc))
    user_id = body.get("user_id")
    if not user_id:
        return create_error_response(400, "user_id is required")
    status = body.get("status")
    notes = body.get("notes")
    if not status:
        return create_error_response(400, "status is required")
    service = CourseService()
    success = service.update_registration_status(course_id, user_id, status, notes=notes)
    if not success:
        return create_error_response(500, "Failed to update registration")
    return create_response(200, {"updated": True})


def _catalog_content(item, event):
    from shared.auth import get_current_user
    from shared.entitlements import enrolled, is_admin
    from shared.user_repository import get_or_create_user_from_claims
    claims = get_current_user(event) or {}
    staff = is_admin(claims)
    if not staff and item.get("status") != "published":
        return create_error_response(404, "Course not found")
    user = get_or_create_user_from_claims(claims) if claims else None
    unlocked = staff or (user and enrolled(user.id, item["id"]))
    result = dict(item)
    result["learning_access"] = bool(unlocked)
    if not unlocked:
        result["classes"] = [{**cl, "zoom_link":None, "recording_material_id":None} for cl in item.get("classes",[])]
    return result
