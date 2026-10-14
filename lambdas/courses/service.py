"""
Course service layer.
Business logic for course operations.
"""

import uuid
import logging
from typing import Dict, Any, Optional, List

from shared.models import Course, CourseStatus
from courses.repository import CourseRepository

logger = logging.getLogger(__name__)


class CourseService:
    """Service for course-related business logic."""

    def __init__(self):
        self.repository = CourseRepository()

    def list_courses(
        self,
        limit: int = 50,
        status_filter: Optional[str] = None,
        full: bool = False,
    ) -> List[Dict[str, Any]]:
        """List courses; optionally filter by status and return full payload."""
        return self.repository.list(limit=limit, status_filter=status_filter, full=full)

    def get_course(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get single course with all nested data."""
        return self.repository.get_by_id(course_id)

    def create_course(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create course and all child entities from payload."""
        course_id = str(uuid.uuid4())
        status = payload.get("status", "draft")
        try:
            status_enum = CourseStatus(status) if status else CourseStatus.DRAFT
        except ValueError:
            status_enum = CourseStatus.DRAFT
        delivery_modes = payload.get("delivery_modes") or []
        if isinstance(delivery_modes, str):
            import json
            try:
                delivery_modes = json.loads(delivery_modes) if delivery_modes else []
            except Exception:
                delivery_modes = []
        course = Course(
            id=course_id,
            title=payload.get("title") or "",
            slug=payload.get("slug"),
            short_description=payload.get("short_description"),
            full_description=payload.get("full_description"),
            status=status_enum,
            display_order=int(payload.get("display_order") or 0),
            delivery_modes=delivery_modes,
        )
        children = {
            "highlights": payload.get("highlights") or [],
            "phases": payload.get("phases") or [],
            "benefits": payload.get("benefits") or [],
            "audience": payload.get("audience") or [],
            "career_outcomes": payload.get("career_outcomes") or [],
            "certificate": payload.get("certificate"),
            "classes": payload.get("classes") or [],
        }
        self.repository.create(course, children)
        result = self.repository.get_by_id(course_id)
        return result or course.to_dict()

    def update_course(self, course_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update course and replace child entities."""
        existing = self.repository.get_by_id(course_id)
        if not existing:
            return None
        status = payload.get("status", existing.get("status", "draft"))
        try:
            status_enum = CourseStatus(status) if status else CourseStatus.DRAFT
        except ValueError:
            status_enum = CourseStatus.DRAFT
        delivery_modes = payload.get("delivery_modes")
        if delivery_modes is None:
            delivery_modes = existing.get("delivery_modes") or []
        if isinstance(delivery_modes, str):
            import json
            try:
                delivery_modes = json.loads(delivery_modes) if delivery_modes else []
            except Exception:
                delivery_modes = []
        course = Course(
            id=course_id,
            title=payload.get("title") or existing.get("title", ""),
            slug=payload.get("slug") if "slug" in payload else existing.get("slug"),
            short_description=payload.get("short_description") if "short_description" in payload else existing.get("short_description"),
            full_description=payload.get("full_description") if "full_description" in payload else existing.get("full_description"),
            status=status_enum,
            display_order=int(payload.get("display_order") if "display_order" in payload else existing.get("display_order", 0)),
            delivery_modes=delivery_modes,
        )
        children = {
            "highlights": payload.get("highlights", existing.get("highlights", [])),
            "phases": payload.get("phases", existing.get("phases", [])),
            "benefits": payload.get("benefits", existing.get("benefits", [])),
            "audience": payload.get("audience", existing.get("audience", [])),
            "career_outcomes": payload.get("career_outcomes", existing.get("career_outcomes", [])),
            "certificate": payload.get("certificate") if "certificate" in payload else existing.get("certificate"),
            "classes": payload.get("classes", existing.get("classes", [])),
        }
        self.repository.update(course_id, course, children)
        return self.repository.get_by_id(course_id)

    def delete_course(self, course_id: str) -> bool:
        """Delete course."""
        existing = self.repository.get_by_id(course_id)
        if not existing:
            return False
        return self.repository.delete(course_id)

    def register_course(self, course_id: str, user_id: str, source: Optional[str] = None) -> bool:
        """Register for published courses only (idempotent; payments excluded)."""
        existing = self.repository.get_by_id(course_id)
        if not existing or existing.get("status") != "published":
            return False
        return self.repository.register(course_id, user_id, status="registered", source=source)

    def mark_interest(self, course_id: str, user_id: str, source: Optional[str] = "mobile") -> bool:
        """Mark user as interested in a published course."""
        existing = self.repository.get_by_id(course_id)
        if not existing or existing.get("status") != "published":
            return False
        return self.repository.mark_interest(course_id, user_id, source=source)

    def list_registrations(self, course_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """List registrations for a course."""
        return self.repository.list_registrations(course_id, status_filter=status_filter)

    def list_user_registrations(self, user_id: str) -> List[Dict[str, Any]]:
        """List courses the user is registered/interested in."""
        return self.repository.list_user_registrations(user_id)

    def update_registration_status(self, course_id: str, user_id: str, status: str, notes: Optional[str] = None) -> bool:
        """Update registration status (admin)."""
        return self.repository.update_registration_status(course_id, user_id, status, notes=notes)

    def list_enquiries(self, status: str = "interested") -> List[Dict[str, Any]]:
        """List all registrations with given status across courses (for enquiries page)."""
        return self.repository.list_all_registrations_by_status(status)

    def get_course_ics(self, course_id: str) -> Optional[str]:
        """Get .ics calendar content for course (all classes)."""
        course = self.repository.get_by_id(course_id)
        if not course or not course.get("classes"):
            return None
        from shared.calendar.ics import course_classes_to_ics
        return course_classes_to_ics(
            course["classes"],
            course_id,
            course.get("title") or "Course",
        )
