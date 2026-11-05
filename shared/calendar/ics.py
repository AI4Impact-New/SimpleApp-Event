"""
RFC 5545 .ics calendar content generation for events and course classes.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import re


def _escape_ics_text(s: str) -> str:
    """Escape special chars for ICS (backslash, semicolon, comma, newline)."""
    if not s:
        return ""
    s = s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
    return s


def _format_dt(dt: Any) -> str:
    """Format datetime for ICS DTSTART/DTEND (UTC)."""
    if dt is None:
        return ""
    if isinstance(dt, str):
        return dt.replace(" ", "T")[:19] + "Z" if dt else ""
    if hasattr(dt, "isoformat"):
        iso = dt.isoformat()
        if "+" in iso or iso.endswith("Z"):
            return iso.replace("+00:00", "Z").replace("-", "").replace(":", "")[:15] + "Z"
        return iso.replace("-", "").replace(":", "")[:15] + "Z"
    return ""


def event_to_ics(event: Dict[str, Any], uid_prefix: str = "event") -> str:
    """Build .ics content for a single event."""
    uid = event.get("id", "") or "unknown"
    summary = _escape_ics_text(event.get("name") or "Event")
    desc = _escape_ics_text(event.get("description") or "")
    location = _escape_ics_text(event.get("location") or "")
    start = event.get("start_time")
    end = event.get("end_time")
    dt_start = _format_dt(start)
    dt_end = _format_dt(end) or dt_start
    if not dt_start:
        dt_start = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        dt_end = dt_start
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Samagyaan Data solutions//PiLearn//EN",
        "BEGIN:VEVENT",
        f"UID:{uid_prefix}-{uid}@ai4impact.in",
        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{dt_start}",
        f"DTEND:{dt_end}",
        f"SUMMARY:{summary}",
    ]
    if desc:
        lines.append(f"DESCRIPTION:{desc}")
    if location:
        lines.append(f"LOCATION:{location}")
    lines.extend(["END:VEVENT", "END:VCALENDAR"])
    return "\r\n".join(lines)


def course_class_to_ics(
    class_obj: Dict[str, Any],
    course_title: str,
    uid_prefix: str = "class",
) -> str:
    """Build .ics content for a single course class/session."""
    uid = class_obj.get("id", "") or "unknown"
    summary = _escape_ics_text(class_obj.get("title") or "Class")
    if course_title:
        summary = f"{_escape_ics_text(course_title)}: {summary}"
    desc = _escape_ics_text(class_obj.get("description") or "")
    location = _escape_ics_text(class_obj.get("location") or "")
    zoom = class_obj.get("zoom_link")
    if zoom and zoom not in desc:
        desc = (desc + "\\nZoom: " + zoom) if desc else "Zoom: " + zoom
    start = class_obj.get("start_time")
    end = class_obj.get("end_time")
    dt_start = _format_dt(start)
    dt_end = _format_dt(end) or dt_start
    if not dt_start:
        dt_start = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        dt_end = dt_start
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Samagyaan Data solutions//PiLearn//EN",
        "BEGIN:VEVENT",
        f"UID:{uid_prefix}-{uid}@ai4impact.in",
        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{dt_start}",
        f"DTEND:{dt_end}",
        f"SUMMARY:{summary}",
    ]
    if desc:
        lines.append(f"DESCRIPTION:{desc}")
    if location:
        lines.append(f"LOCATION:{location}")
    lines.extend(["END:VEVENT", "END:VCALENDAR"])
    return "\r\n".join(lines)


def course_classes_to_ics(
    classes: List[Dict[str, Any]],
    course_id: str,
    course_title: str,
    uid_prefix: str = "course",
) -> str:
    """Build .ics content with one VEVENT per class."""
    if not classes:
        return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Samagyaan Data solutions//PiLearn//EN\r\nEND:VCALENDAR"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Samagyaan Data solutions//PiLearn//EN",
    ]
    for c in classes:
        uid = c.get("id", "") or "unknown"
        summary = _escape_ics_text(c.get("title") or "Class")
        if course_title:
            summary = f"{_escape_ics_text(course_title)}: {summary}"
        desc = _escape_ics_text(c.get("description") or "")
        location = _escape_ics_text(c.get("location") or "")
        zoom = c.get("zoom_link")
        if zoom and zoom not in desc:
            desc = (desc + "\\nZoom: " + zoom) if desc else "Zoom: " + zoom
        start = c.get("start_time")
        end = c.get("end_time")
        dt_start = _format_dt(start)
        dt_end = _format_dt(end) or dt_start
        if not dt_start:
            dt_start = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            dt_end = dt_start
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid_prefix}-{course_id}-{uid}@ai4impact.in",
            f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART:{dt_start}",
            f"DTEND:{dt_end}",
            f"SUMMARY:{summary}",
        ])
        if desc:
            lines.append(f"DESCRIPTION:{desc}")
        if location:
            lines.append(f"LOCATION:{location}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
