"""
Attendance Lambda handler.
Entry point for attendance-related API requests.
"""

import json
import logging
from typing import Dict, Any

from shared.auth import require_auth, create_response, create_error_response

logger = logging.getLogger(__name__)


def _parse_limit(value: Any, default: int = 50) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(limit, 200))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for attendance."""
    try:
        path = event.get("path", "/attendance")
        method = event.get("httpMethod", event.get("method", "GET"))
        
        # Route: POST /events/{event_id}/join
        if "/events/" in path and "/join" in path:
            parts = path.split("/")
            # /events/{event_id}/join
            if len(parts) >= 4 and parts[-1] == "join":
                event["pathParameters"] = {**(event.get("pathParameters") or {}), "event_id": parts[2]}
                if method == "POST":
                    return join_event(event, context)
        
        # Route: GET /attendance/event/{event_id}
        if path.startswith("/attendance/event/"):
            parts = path.split("/")
            if len(parts) >= 4:
                event["pathParameters"] = {**(event.get("pathParameters") or {}), "event_id": parts[3]}
                if method == "GET":
                    return get_event_attendance(event, context)

        # Route: GET /attendance (user's attendance history)
        if path == "/attendance":
            if method == "GET":
                return list_attendance(event, context)
        
        return create_error_response(404, "Endpoint not found")
        
    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        return create_error_response(500, "Internal server error")


@require_auth
def join_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Join an event (mark attendance).
    POST /events/{event_id}/join
    """
    from attendance.service import AttendanceService
    from shared.user_repository import get_or_create_user_from_claims
    event_id = (event.get("pathParameters") or {}).get("event_id")
    if not event_id:
        return create_error_response(400, "event_id is required")
    
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    if not app_user:
        return create_error_response(401, "User identity not found")
    
    service = AttendanceService()
    from shared.db import execute_query
    from shared.entitlements import enrolled, is_admin
    linked = execute_query("SELECT course_id FROM events WHERE id=%s", (event_id,), fetch="one")
    if linked and linked.get("course_id") and not is_admin(event.get("user", {})) and not enrolled(app_user.id, linked["course_id"]):
        return create_error_response(403, "Registration is required to join course classes")
    result = service.join_event(user_id=app_user.id, event_id=event_id)
    
    if result is None:
        return create_error_response(404, "Event not found")
    
    if result == "duplicate":
        return create_error_response(400, "User already checked into this event")
    
    if result == "not_started":
        return create_error_response(400, "Event has not started yet")
    
    if result == "ended":
        return create_error_response(400, "Event has already ended")
    
    return create_response(200, result)


@require_auth
def get_event_attendance(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get attendance records for an event."""
    from attendance.service import AttendanceService
    event_id = (event.get("pathParameters") or {}).get("event_id")
    if not event_id:
        return create_error_response(400, "event_id is required")
    
    service = AttendanceService()
    result = service.get_event_attendance(event_id)
    
    return create_response(200, {"attendance": result})


@require_auth
def list_attendance(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """List attendance records for current user."""
    from attendance.service import AttendanceService
    from shared.user_repository import get_or_create_user_from_claims
    
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    if not app_user:
        return create_error_response(401, "User identity not found")
    params = event.get("queryStringParameters", {}) or {}
    
    service = AttendanceService()
    result = service.list_user_attendance(
        user_id=app_user.id,
        limit=_parse_limit(params.get("limit", 50)),
    )
    
    return create_response(200, {"attendance": result})
