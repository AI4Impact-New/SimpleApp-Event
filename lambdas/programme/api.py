"""Explicit, compatible route inventory for non-AI services."""

from programme import scheduling, career, webinars, messaging
from programme.common import ApiError, identifier


def public(path, method, body, event):
    parts = path.strip("/").split("/")
    ip = ((event.get("requestContext") or {}).get("http") or {}).get(
        "sourceIp", "unknown"
    )
    if path == "/public/webinars" and method == "GET":
        return webinars.public(event.get("queryStringParameters"))
    if len(parts) == 4 and parts[:2] == ["public", "webinars"] and method == "POST":
        if parts[3] == "registrations":
            return webinars.register(parts[2], body, ip)
        if parts[3] == "metrics":
            return webinars.metric(parts[2], body, ip)
    raise ApiError(404, "Route not found")


def dispatch(actor, path, method, body, query):
    parts = path.strip("/").split("/")
    query = query or {}
    staff = parts[:2] == ["admin", "programme"] or parts[:2] == ["programme", "staff"]
    p = parts[2:] if staff else parts[1:]
    if p == ["access"] and method == "GET":
        return scheduling.staff_access(actor)
    if p == ["sessions"]:
        if method == "GET":
            return scheduling.sessions(actor, query, staff)
        if method == "POST" and staff:
            return scheduling.save_session(actor, body)
    if len(p) == 2 and p[0] == "sessions" and method == "PUT" and staff:
        return scheduling.save_session(actor, body, p[1])
    if (
        len(p) == 3
        and p[0] == "sessions"
        and p[2] == "bookings"
        and method == "POST"
        and not staff
    ):
        return scheduling.book(actor, p[1], body)
    if (
        len(p) == 3
        and p[0] == "bookings"
        and p[2] == "reschedule"
        and method == "POST"
        and not staff
    ):
        return scheduling.reschedule(actor, p[1], body)
    if (
        len(p) == 3
        and p[0] == "bookings"
        and p[2] == "calendar"
        and method == "GET"
        and not staff
    ):
        return scheduling.calendar(actor, p[1])
    if p == ["bookings"] and method == "GET":
        return scheduling.bookings(actor, query, staff)
    if len(p) == 2 and p[0] == "bookings" and method == "PATCH":
        return scheduling.update_booking(actor, p[1], body, staff)
    if len(p) == 3 and p[0] == "courses" and p[2] == "screening":
        if method == "GET":
            return career.screening(actor, p[1])
        if method == "PUT" and staff:
            return career.screening(actor, p[1], body)
    if (
        len(p) == 3
        and p[0] == "internships"
        and p[2] == "certificate"
        and method == "POST"
        and staff
    ):
        return career.internship_certificate(actor, p[1])
    if len(p) == 3 and p[0] == "internships" and p[2] == "letter":
        if method == "GET":
            return career.letter(actor, p[1])
        if method == "POST" and staff:
            return career.letter(actor, p[1], body)
    if len(p) == 3 and p[0] == "internships" and p[2] == "reviews":
        if method == "GET":
            return career.reviews(actor, p[1])
        if method == "POST" and staff:
            return career.reviews(actor, p[1], body)
    if (
        len(p) == 3
        and p[0] == "courses"
        and p[2] == "entitlement"
        and method == "GET"
        and not staff
    ):
        return scheduling.summary(actor, p[1])
    if len(p) == 3 and p[0] == "courses" and p[2] == "entitlements" and staff:
        if method == "GET":
            return scheduling.manage_entitlements(actor, p[1])
        if method == "PUT":
            return scheduling.manage_entitlements(actor, p[1], body)
    if (
        len(p) == 3
        and p[0] == "courses"
        and p[2] == "credits"
        and method == "POST"
        and staff
    ):
        return scheduling.adjust(actor, p[1], body)
    if len(p) == 3 and p[0] == "courses" and p[2] == "educators":
        if method == "GET":
            return scheduling.educators(actor, p[1], staff)
        if method == "PUT" and staff:
            return scheduling.set_educator(actor, p[1], body)
    if p == ["companies"] and staff:
        if method == "GET":
            return career.companies(actor)
        if method == "POST":
            return career.companies(actor, body)
    if len(p) == 2 and p[0] == "companies" and method == "PUT" and staff:
        return career.companies(actor, body, p[1])
    if p == ["jobs"]:
        if method == "GET":
            return career.jobs(actor, query, staff)
        if method == "POST" and staff:
            return career.save_job(actor, body)
    if len(p) == 2 and p[0] == "jobs" and method == "PUT" and staff:
        return career.save_job(actor, body, p[1])
    if (
        len(p) == 3
        and p[0] == "jobs"
        and p[2] == "applications"
        and method == "POST"
        and not staff
    ):
        return career.apply(actor, p[1], body)
    if p == ["applications"] and method == "GET":
        return career.applications(actor, query, staff)
    if len(p) == 2 and p[0] == "applications" and method == "PATCH":
        return career.update_application(actor, p[1], body, staff)
    if p == ["internships"]:
        if method == "GET":
            return career.internships(actor, query, for_staff=staff)
        if method == "POST" and not staff:
            return career.internships(actor, query, body)
    if len(p) == 2 and p[0] == "internships" and method == "PATCH" and staff:
        return career.internships(actor, query, body, True, p[1])
    if p == ["campaigns"] and staff:
        if method == "GET":
            return webinars.campaigns(actor)
        if method == "POST":
            return webinars.campaigns(actor, body)
    if len(p) == 2 and p[0] == "campaigns" and method == "PUT" and staff:
        return webinars.campaigns(actor, body, p[1])
    if (
        len(p) == 3
        and p[0] == "campaigns"
        and p[2] == "registrations"
        and method == "GET"
        and staff
    ):
        return webinars.registrations(actor, p[1], query)
    if (
        len(p) == 4
        and p[0] == "campaigns"
        and p[2] == "registrations"
        and method == "PATCH"
        and staff
    ):
        return webinars.registrations(actor, p[1], query, body, p[3])
    if p == ["preferences"]:
        if method == "GET":
            return messaging.preferences(actor)
        if method == "PATCH":
            return messaging.preferences(actor, body)
    if p == ["inbox"] and method == "GET" and not staff:
        return messaging.inbox(actor, query)
    if p == ["announcements"] and staff:
        if method == "GET":
            return messaging.announcements(actor, query)
        if method == "POST":
            return messaging.announce(actor, body.get("course_id"), body)
    if len(p) == 2 and p[0] == "announcements" and method == "PATCH" and staff:
        return messaging.announcements(actor, query, p[1], body)
    if p == ["delivery-controls"] and staff and method == "PATCH":
        return messaging.controls(actor, body)
    if p == ["deliveries"] and staff and method == "GET":
        return messaging.delivery_status(actor, query)
    raise ApiError(404, "Route not found")
