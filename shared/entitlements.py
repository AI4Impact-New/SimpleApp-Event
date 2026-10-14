"""Shared enrollment checks used by every content delivery path."""
from shared.db import execute_query


def enrolled(user_id, course_id):
    return bool(execute_query(
        "SELECT 1 FROM course_registrations WHERE user_id=%s AND course_id=%s AND status IN ('registered','completed')",
        (user_id, course_id), fetch="one",
    ))


def material_courses(material_id):
    rows = execute_query(
        """SELECT DISTINCT course_id FROM (
            SELECT course_id FROM materials WHERE id=%s
            UNION SELECT course_id FROM course_classes WHERE recording_material_id=%s
            UNION SELECT e.course_id FROM materials m JOIN events e ON e.id=m.event_id WHERE m.id=%s
        ) linked WHERE course_id IS NOT NULL""",
        (material_id, material_id, material_id), fetch="all",
    )
    return [str(row["course_id"]) for row in rows]


def is_admin(claims):
    from shared.auth import _normalize_groups
    return "admins" in {str(group).lower() for group in _normalize_groups(claims.get("cognito:groups"))}
