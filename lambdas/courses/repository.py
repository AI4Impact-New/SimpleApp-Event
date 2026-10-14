"""
Course repository layer.
Data access for course operations.
"""

import logging
import uuid
from typing import Optional, List, Dict, Any

from shared.db import execute_query, get_db_cursor
from shared.models import (
    Course,
    CourseStatus,
    CourseHighlight,
    CoursePhase,
    CoursePhaseItem,
    CourseBenefit,
    CourseAudience,
    CourseCareerOutcome,
    CourseCertificate,
    CourseRepository as ICourseRepository,
)

logger = logging.getLogger(__name__)


def _row_to_course(row: dict) -> Course:
    """Convert database row to Course model."""
    status = row.get("status", "draft")
    try:
        status_enum = CourseStatus(status) if status else CourseStatus.DRAFT
    except ValueError:
        status_enum = CourseStatus.DRAFT
    delivery_modes = row.get("delivery_modes")
    if isinstance(delivery_modes, list):
        pass
    elif delivery_modes is not None and not isinstance(delivery_modes, list):
        try:
            import json
            delivery_modes = json.loads(delivery_modes) if isinstance(delivery_modes, str) else delivery_modes
        except Exception:
            delivery_modes = []
    else:
        delivery_modes = []
    return Course(
        id=str(row["id"]),
        title=row["title"],
        slug=row.get("slug"),
        short_description=row.get("short_description"),
        full_description=row.get("full_description"),
        status=status_enum,
        display_order=int(row.get("display_order") or 0),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        delivery_modes=delivery_modes if isinstance(delivery_modes, list) else [],
    )


class CourseDeletionConflict(Exception):
    """Issued qualifications keep their course reference and must not be deleted."""


class CourseRepository(ICourseRepository):
    """Repository for course data operations."""

    def get_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get course by ID with all nested data."""
        course_row = execute_query(
            "SELECT * FROM courses WHERE id = %s",
            (course_id,),
            fetch="one",
        )
        if not course_row:
            return None

        course = _row_to_course(dict(course_row))
        result = course.to_dict()
        result["highlights"] = self._get_highlights(course_id)
        result["phases"] = self._get_phases_with_items(course_id)
        result["benefits"] = self._get_benefits(course_id)
        result["audience"] = self._get_audience(course_id)
        result["career_outcomes"] = self._get_career_outcomes(course_id)
        result["certificate"] = self._get_certificate(course_id)
        result["classes"] = self._get_classes(course_id)
        return result

    def _get_highlights(self, course_id: str) -> List[dict]:
        rows = execute_query(
            "SELECT * FROM course_highlights WHERE course_id = %s ORDER BY sort_order, id",
            (course_id,),
            fetch="all",
        )
        return [
            {
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "label": r["label"],
                "value": r["value"],
                "sort_order": r.get("sort_order", 0),
            }
            for r in (rows or [])
        ]

    def _get_phases_with_items(self, course_id: str) -> List[dict]:
        phase_rows = execute_query(
            "SELECT * FROM course_phases WHERE course_id = %s ORDER BY sort_order, id",
            (course_id,),
            fetch="all",
        )
        phases = []
        for pr in phase_rows or []:
            phase_id = str(pr["id"])
            item_rows = execute_query(
                "SELECT * FROM course_phase_items WHERE phase_id = %s ORDER BY sort_order, id",
                (phase_id,),
                fetch="all",
            )
            phase_items = [
                {
                    "id": str(ir["id"]),
                    "phase_id": str(ir["phase_id"]),
                    "item_type": ir["item_type"],
                    "text": ir["text"],
                    "sort_order": ir.get("sort_order", 0),
                }
                for ir in (item_rows or [])
            ]
            phases.append({
                "id": phase_id,
                "course_id": str(pr["course_id"]),
                "title": pr["title"],
                "subtitle": pr.get("subtitle"),
                "sort_order": pr.get("sort_order", 0),
                "phase_items": phase_items,
            })
        return phases

    def _get_benefits(self, course_id: str) -> List[dict]:
        rows = execute_query(
            "SELECT * FROM course_benefits WHERE course_id = %s ORDER BY sort_order, id",
            (course_id,),
            fetch="all",
        )
        return [
            {
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "title": r["title"],
                "description": r.get("description"),
                "icon": r.get("icon"),
                "sort_order": r.get("sort_order", 0),
            }
            for r in (rows or [])
        ]

    def _get_audience(self, course_id: str) -> List[dict]:
        rows = execute_query(
            "SELECT * FROM course_audience WHERE course_id = %s ORDER BY sort_order, id",
            (course_id,),
            fetch="all",
        )
        return [
            {
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "title": r["title"],
                "description": r.get("description"),
                "sort_order": r.get("sort_order", 0),
            }
            for r in (rows or [])
        ]

    def _get_career_outcomes(self, course_id: str) -> List[dict]:
        rows = execute_query(
            "SELECT * FROM course_career_outcomes WHERE course_id = %s ORDER BY sort_order, id",
            (course_id,),
            fetch="all",
        )
        return [
            {
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "text": r["text"],
                "sort_order": r.get("sort_order", 0),
            }
            for r in (rows or [])
        ]

    def _get_certificate(self, course_id: str) -> Optional[dict]:
        row = execute_query(
            "SELECT * FROM course_certificate WHERE course_id = %s",
            (course_id,),
            fetch="one",
        )
        if not row:
            return None
        out = {
            "id": str(row["id"]),
            "course_id": str(row["course_id"]),
            "title": row.get("title"),
            "provider": row.get("provider"),
            "description": row.get("description"),
            "image_url": row.get("image_url"),
        }
        if "external_config" in row and row["external_config"] is not None:
            out["external_config"] = row["external_config"] if isinstance(row["external_config"], dict) else {}
        if "completion_rules" in row and row["completion_rules"] is not None:
            out["completion_rules"] = row["completion_rules"] if isinstance(row["completion_rules"], dict) else {}
        return out

    def _get_classes(self, course_id: str) -> List[dict]:
        rows = execute_query(
            "SELECT * FROM course_classes WHERE course_id = %s ORDER BY sort_order, id",
            (course_id,),
            fetch="all",
        )
        if not rows:
            return []
        result = []
        for r in rows:
            result.append({
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "title": r.get("title", ""),
                "description": r.get("description"),
                "class_type": r.get("class_type", "recorded"),
                "duration_minutes": r.get("duration_minutes"),
                "start_time": r["start_time"].isoformat() if r.get("start_time") else None,
                "end_time": r["end_time"].isoformat() if r.get("end_time") else None,
                "zoom_link": r.get("zoom_link"),
                "location": r.get("location"),
                "recording_material_id": str(r["recording_material_id"]) if r.get("recording_material_id") else None,
                "event_id": str(r["event_id"]) if r.get("event_id") else None,
                "sort_order": r.get("sort_order", 0),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            })
        return result

    def list(
        self,
        limit: int = 50,
        status_filter: Optional[str] = None,
        full: bool = False,
    ) -> List[Dict[str, Any]]:
        """List courses; if full=True return full payload per course."""
        if status_filter and status_filter in ("draft", "published"):
            rows = execute_query(
                """
                SELECT * FROM courses
                WHERE status = %s
                ORDER BY display_order ASC, created_at DESC
                LIMIT %s
                """,
                (status_filter, limit),
                fetch="all",
            )
        else:
            rows = execute_query(
                """
                SELECT * FROM courses
                ORDER BY display_order ASC, created_at DESC
                LIMIT %s
                """,
                (limit,),
                fetch="all",
            )
        rows = rows or []
        if full:
            return [self.get_by_id(str(r["id"])) for r in rows]
        return [_row_to_course(dict(r)).to_dict() for r in rows]

    def create(self, course: Course, children: Dict[str, Any]) -> Course:
        """Create course and all child rows."""
        import json
        delivery_modes = getattr(course, "delivery_modes", None) or []
        if isinstance(delivery_modes, list):
            delivery_modes_json = json.dumps(delivery_modes)
        else:
            delivery_modes_json = json.dumps([])
        execute_query(
            """
            INSERT INTO courses (
                id, title, slug, short_description, full_description,
                status, display_order, delivery_modes, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW(), NOW())
            """,
            (
                course.id,
                course.title,
                course.slug,
                course.short_description,
                course.full_description,
                course.status.value if course.status else CourseStatus.DRAFT.value,
                course.display_order,
                delivery_modes_json,
            ),
            fetch="none",
        )
        course_id = course.id

        for i, h in enumerate(children.get("highlights") or []):
            execute_query(
                """
                INSERT INTO course_highlights (id, course_id, label, value, sort_order)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, h.get("label", ""), h.get("value", ""), i),
                fetch="none",
            )

        for i, ph in enumerate(children.get("phases") or []):
            phase_id = str(uuid.uuid4())
            execute_query(
                """
                INSERT INTO course_phases (id, course_id, title, subtitle, sort_order)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (phase_id, course_id, ph.get("title", ""), ph.get("subtitle"), i),
                fetch="none",
            )
            for j, it in enumerate(ph.get("phase_items") or []):
                execute_query(
                    """
                    INSERT INTO course_phase_items (id, phase_id, item_type, text, sort_order)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (str(uuid.uuid4()), phase_id, it.get("item_type", "what_you_learn"), it.get("text", ""), j),
                    fetch="none",
                )

        for i, b in enumerate(children.get("benefits") or []):
            execute_query(
                """
                INSERT INTO course_benefits (id, course_id, title, description, icon, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, b.get("title", ""), b.get("description"), b.get("icon"), i),
                fetch="none",
            )

        for i, a in enumerate(children.get("audience") or []):
            execute_query(
                """
                INSERT INTO course_audience (id, course_id, title, description, sort_order)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, a.get("title", ""), a.get("description"), i),
                fetch="none",
            )

        for i, c in enumerate(children.get("career_outcomes") or []):
            execute_query(
                """
                INSERT INTO course_career_outcomes (id, course_id, text, sort_order)
                VALUES (%s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, c.get("text", ""), i),
                fetch="none",
            )

        cert = children.get("certificate")
        if cert and (cert.get("title") or cert.get("provider") or cert.get("description") or cert.get("image_url") or cert.get("external_config") or cert.get("completion_rules")):
            import json
            ext_cfg = cert.get("external_config")
            comp_rules = cert.get("completion_rules")
            execute_query(
                """
                INSERT INTO course_certificate (id, course_id, title, provider, description, image_url, external_config, completion_rules)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                """,
                (
                    str(uuid.uuid4()),
                    course_id,
                    cert.get("title"),
                    cert.get("provider"),
                    cert.get("description"),
                    cert.get("image_url"),
                    json.dumps(ext_cfg) if ext_cfg else None,
                    json.dumps(comp_rules) if comp_rules else None,
                ),
                fetch="none",
            )

        for i, cl in enumerate(children.get("classes") or []):
            cid = str(uuid.uuid4())
            start_ts = cl.get("start_time")
            end_ts = cl.get("end_time")
            if isinstance(start_ts, str) and "T" in start_ts:
                try:
                    from dateutil import parser as date_parser
                    start_ts = date_parser.parse(start_ts)
                except Exception:
                    start_ts = None
            if isinstance(end_ts, str) and "T" in end_ts:
                try:
                    from dateutil import parser as date_parser
                    end_ts = date_parser.parse(end_ts)
                except Exception:
                    end_ts = None
            execute_query(
                """
                INSERT INTO course_classes (id, course_id, title, description, class_type, duration_minutes, start_time, end_time, zoom_link, location, recording_material_id, event_id, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    cid,
                    course_id,
                    cl.get("title", ""),
                    cl.get("description"),
                    cl.get("class_type", "recorded"),
                    cl.get("duration_minutes"),
                    start_ts,
                    end_ts,
                    cl.get("zoom_link"),
                    cl.get("location"),
                    cl.get("recording_material_id"),
                    cl.get("event_id"),
                    cl.get("sort_order", i),
                ),
                fetch="none",
            )

        logger.info("Created course: %s", course_id)
        return course

    def update(self, course_id: str, course: Course, children: Dict[str, Any]) -> Optional[Course]:
        """Update course and replace all child rows."""
        existing = execute_query("SELECT id FROM courses WHERE id = %s", (course_id,), fetch="one")
        if not existing:
            return None

        import json
        delivery_modes = getattr(course, "delivery_modes", None) or []
        delivery_modes_json = json.dumps(delivery_modes) if isinstance(delivery_modes, list) else "[]"
        execute_query(
            """
            UPDATE courses SET
                title = %s, slug = %s, short_description = %s, full_description = %s,
                status = %s, display_order = %s, delivery_modes = %s::jsonb, updated_at = NOW()
            WHERE id = %s
            """,
            (
                course.title,
                course.slug,
                course.short_description,
                course.full_description,
                course.status.value if course.status else CourseStatus.DRAFT.value,
                course.display_order,
                delivery_modes_json,
                course_id,
            ),
            fetch="none",
        )

        execute_query("DELETE FROM course_highlights WHERE course_id = %s", (course_id,), fetch="none")
        execute_query("DELETE FROM course_phases WHERE course_id = %s", (course_id,), fetch="none")

        execute_query("DELETE FROM course_benefits WHERE course_id = %s", (course_id,), fetch="none")
        execute_query("DELETE FROM course_audience WHERE course_id = %s", (course_id,), fetch="none")
        execute_query("DELETE FROM course_career_outcomes WHERE course_id = %s", (course_id,), fetch="none")
        execute_query("DELETE FROM course_certificate WHERE course_id = %s", (course_id,), fetch="none")

        for i, h in enumerate(children.get("highlights") or []):
            execute_query(
                """
                INSERT INTO course_highlights (id, course_id, label, value, sort_order)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, h.get("label", ""), h.get("value", ""), i),
                fetch="none",
            )

        for i, ph in enumerate(children.get("phases") or []):
            phase_id = str(uuid.uuid4())
            execute_query(
                """
                INSERT INTO course_phases (id, course_id, title, subtitle, sort_order)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (phase_id, course_id, ph.get("title", ""), ph.get("subtitle"), i),
                fetch="none",
            )
            for j, it in enumerate(ph.get("phase_items") or []):
                execute_query(
                    """
                    INSERT INTO course_phase_items (id, phase_id, item_type, text, sort_order)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (str(uuid.uuid4()), phase_id, it.get("item_type", "what_you_learn"), it.get("text", ""), j),
                    fetch="none",
                )

        for i, b in enumerate(children.get("benefits") or []):
            execute_query(
                """
                INSERT INTO course_benefits (id, course_id, title, description, icon, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, b.get("title", ""), b.get("description"), b.get("icon"), i),
                fetch="none",
            )

        for i, a in enumerate(children.get("audience") or []):
            execute_query(
                """
                INSERT INTO course_audience (id, course_id, title, description, sort_order)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, a.get("title", ""), a.get("description"), i),
                fetch="none",
            )

        for i, c in enumerate(children.get("career_outcomes") or []):
            execute_query(
                """
                INSERT INTO course_career_outcomes (id, course_id, text, sort_order)
                VALUES (%s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), course_id, c.get("text", ""), i),
                fetch="none",
            )

        cert = children.get("certificate")
        if cert and (cert.get("title") or cert.get("provider") or cert.get("description") or cert.get("image_url") or cert.get("external_config") or cert.get("completion_rules")):
            ext_cfg = cert.get("external_config")
            comp_rules = cert.get("completion_rules")
            execute_query(
                """
                INSERT INTO course_certificate (id, course_id, title, provider, description, image_url, external_config, completion_rules)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                """,
                (
                    str(uuid.uuid4()),
                    course_id,
                    cert.get("title"),
                    cert.get("provider"),
                    cert.get("description"),
                    cert.get("image_url"),
                    json.dumps(ext_cfg) if ext_cfg else None,
                    json.dumps(comp_rules) if comp_rules else None,
                ),
                fetch="none",
            )

        for i, cl in enumerate(children.get("classes") or []):
            cid = str(cl.get("id") or uuid.uuid4())
            cl["id"] = cid
            start_ts = cl.get("start_time")
            end_ts = cl.get("end_time")
            if isinstance(start_ts, str) and "T" in start_ts:
                try:
                    from dateutil import parser as date_parser
                    start_ts = date_parser.parse(start_ts)
                except Exception:
                    start_ts = None
            if isinstance(end_ts, str) and "T" in end_ts:
                try:
                    from dateutil import parser as date_parser
                    end_ts = date_parser.parse(end_ts)
                except Exception:
                    end_ts = None
            execute_query(
                """
                INSERT INTO course_classes (id, course_id, title, description, class_type, duration_minutes, start_time, end_time, zoom_link, location, recording_material_id, event_id, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,
                class_type=excluded.class_type,duration_minutes=excluded.duration_minutes,
                start_time=excluded.start_time,end_time=excluded.end_time,zoom_link=excluded.zoom_link,
                location=excluded.location,recording_material_id=excluded.recording_material_id,
                event_id=excluded.event_id,sort_order=excluded.sort_order
                WHERE course_classes.course_id=excluded.course_id
                """,
                (
                    cid,
                    course_id,
                    cl.get("title", ""),
                    cl.get("description"),
                    cl.get("class_type", "recorded"),
                    cl.get("duration_minutes"),
                    start_ts,
                    end_ts,
                    cl.get("zoom_link"),
                    cl.get("location"),
                    cl.get("recording_material_id"),
                    cl.get("event_id"),
                    cl.get("sort_order", i),
                ),
                fetch="none",
            )

        class_ids = [str(cl.get("id")) for cl in children.get("classes") or [] if cl.get("id")]
        execute_query("DELETE FROM course_classes WHERE course_id=%s AND NOT (id = ANY(%s::uuid[]))", (course_id,class_ids),fetch="none")
        logger.info("Updated course: %s", course_id)
        return course

    def delete(self, course_id: str) -> bool:
        """Delete a course only when no issued certificates depend on it."""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT id FROM courses WHERE id=%s FOR UPDATE", (course_id,))
            if not cursor.fetchone():
                return False
            cursor.execute("SELECT 1 FROM certificates_issued WHERE course_id=%s LIMIT 1", (course_id,))
            if cursor.fetchone():
                raise CourseDeletionConflict("This course has issued certificates; set it to draft instead of deleting it")
            cursor.execute("DELETE FROM courses WHERE id=%s", (course_id,))
        logger.info("Deleted course: %s", course_id)
        return True

    def register(self, course_id: str, user_id: str, status: str = "registered", source: Optional[str] = None) -> bool:
        """Register user for course (idempotent)."""
        reg_id = str(uuid.uuid4())
        try:
            execute_query(
                """
                INSERT INTO course_registrations (id, course_id, user_id, status, updated_at, source)
                VALUES (%s, %s, %s, %s, NOW(), %s)
                ON CONFLICT (course_id, user_id) DO UPDATE SET status = CASE
                    WHEN course_registrations.status = 'completed' THEN 'completed'
                    WHEN EXCLUDED.status = 'interested' AND course_registrations.status IN ('registered','applied') THEN course_registrations.status
                    ELSE EXCLUDED.status END, updated_at = NOW(), source = COALESCE(EXCLUDED.source, course_registrations.source)
                """,
                (reg_id, course_id, user_id, status, source),
                fetch="none",
            )
        except Exception as e:
            logger.warning("Course registration insert: %s", e)
            return False
        return True

    def mark_interest(self, course_id: str, user_id: str, source: Optional[str] = "mobile") -> bool:
        """Mark user as interested in course (upsert with status=interested)."""
        return self.register(course_id, user_id, status="interested", source=source)

    def list_registrations(self, course_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all registrations for a course, with user details."""
        if status_filter:
            rows = execute_query(
                """
                SELECT cr.*, u.name, u.email, u.user_type
                FROM course_registrations cr
                JOIN users u ON u.id = cr.user_id
                WHERE cr.course_id = %s AND cr.status = %s
                ORDER BY cr.created_at DESC
                """,
                (course_id, status_filter),
                fetch="all",
            )
        else:
            rows = execute_query(
                """
                SELECT cr.*, u.name, u.email, u.user_type
                FROM course_registrations cr
                JOIN users u ON u.id = cr.user_id
                WHERE cr.course_id = %s
                ORDER BY cr.created_at DESC
                """,
                (course_id,),
                fetch="all",
            )
        if not rows:
            return []
        return [
            {
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "user_id": str(r["user_id"]),
                "status": r.get("status", "registered"),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                "notes": r.get("notes"),
                "source": r.get("source"),
                "name": r.get("name"),
                "email": r.get("email"),
                "user_type": r.get("user_type"),
            }
            for r in (rows or [])
        ]

    def list_user_registrations(self, user_id: str) -> List[Dict[str, Any]]:
        """List courses the user is registered/interested in."""
        rows = execute_query(
            """
            SELECT cr.*, c.title as course_title
            FROM course_registrations cr
            JOIN courses c ON c.id = cr.course_id
            WHERE cr.user_id = %s
            ORDER BY cr.updated_at DESC, cr.created_at DESC
            """,
            (user_id,),
            fetch="all",
        )
        if not rows:
            return []
        return [
            {
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "user_id": str(r["user_id"]),
                "status": r.get("status", "registered"),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                "notes": r.get("notes"),
                "source": r.get("source"),
                "course_title": r.get("course_title"),
            }
            for r in (rows or [])
        ]

    def list_all_registrations_by_status(self, status: str) -> List[Dict[str, Any]]:
        """List all registrations across courses with given status (e.g. interested)."""
        rows = execute_query(
            """
            SELECT cr.*, c.title as course_title
            FROM course_registrations cr
            JOIN courses c ON c.id = cr.course_id
            WHERE cr.status = %s
            ORDER BY cr.created_at DESC
            """,
            (status,),
            fetch="all",
        )
        if not rows:
            return []
        out = []
        for r in rows:
            u = execute_query("SELECT name, email, user_type FROM users WHERE id = %s", (r["user_id"],), fetch="one")
            out.append({
                "id": str(r["id"]),
                "course_id": str(r["course_id"]),
                "user_id": str(r["user_id"]),
                "status": r.get("status"),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                "notes": r.get("notes"),
                "source": r.get("source"),
                "course_title": r.get("course_title"),
                "name": u.get("name") if u else None,
                "email": u.get("email") if u else None,
                "user_type": u.get("user_type") if u else None,
            })
        return out

    def update_registration_status(self, course_id: str, user_id: str, status: str, notes: Optional[str] = None) -> bool:
        """Update registration status (admin)."""
        try:
            if notes is not None:
                execute_query(
                    "UPDATE course_registrations SET status = %s, notes = %s, updated_at = NOW() WHERE course_id = %s AND user_id = %s",
                    (status, notes, course_id, user_id),
                    fetch="none",
                )
            else:
                execute_query(
                    "UPDATE course_registrations SET status = %s, updated_at = NOW() WHERE course_id = %s AND user_id = %s",
                    (status, course_id, user_id),
                    fetch="none",
                )
            return True
        except Exception as e:
            logger.warning("Update registration status: %s", e)
            return False
