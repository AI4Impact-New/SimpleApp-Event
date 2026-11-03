"""Company/job publishing, owned applications and human internship review. No AI."""

import json
import uuid
from datetime import timedelta
from shared.db import get_db_cursor
from programme.common import *


def companies(actor, body=None, cid=None):
    admin(actor)
    with get_db_cursor() as cur:
        if body is None:
            cur.execute("SELECT * FROM programme_companies ORDER BY name,id LIMIT 500")
            return cur.fetchall()
        operation = "company.save:" + str(cid or body.get("request_id"))
        mark = mutation(cur, actor, operation, body)
        if mark[2] is not None:
            return mark[2]
        cid = identifier(cid or body.get("request_id"))
        name = text(body.get("name"), "name", 200)
        url = https(body.get("website", ""))
        description = text(body.get("description") or name, "description", 2000)
        active = boolean(body.get("active", True), "active")
        cur.execute(
            "INSERT INTO programme_companies(id,name,website,description,active) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET name=excluded.name,website=excluded.website,description=excluded.description,active=excluded.active RETURNING *",
            (cid, name, url, description, active),
        )
        result = cur.fetchone()
        audit(cur, actor, "company.save", cid)
        remember(cur, actor, operation, mark, result)
        return result


def jobs(actor, query, for_staff=False):
    if for_staff:
        admin(actor)
    size, after = page(query)
    search = str((query or {}).get("q", ""))[:100]
    location = str((query or {}).get("location", ""))[:100]
    work = str((query or {}).get("work_mode", ""))
    employment = str((query or {}).get("employment_type", ""))
    with get_db_cursor() as cur:
        if not for_staff:
            member(cur, actor["id"])
        cur.execute(
            """SELECT j.*,c.name AS company_name,c.website AS company_website FROM programme_jobs j JOIN programme_companies c ON c.id=j.company_id
         WHERE (%s OR (j.status='published' AND j.deadline>now() AND c.active=true)) AND (j.title ILIKE %s OR j.description ILIKE %s OR c.name ILIKE %s OR j.partner ILIKE %s OR j.skills::text ILIKE %s)
         AND j.location ILIKE %s AND (%s='' OR j.work_mode=%s) AND (%s='' OR j.employment_type=%s) AND (%s::uuid IS NULL OR (j.created_at,j.id)<(SELECT created_at,id FROM programme_jobs WHERE id=%s::uuid)) ORDER BY j.created_at DESC,j.id DESC LIMIT %s""",
            (
                for_staff,
                "%" + search + "%",
                "%" + search + "%",
                "%" + search + "%",
                "%" + search + "%",
                "%" + search + "%",
                "%" + location + "%",
                work,
                work,
                employment,
                employment,
                after,
                after,
                size + 1,
            ),
        )
        rows = cur.fetchall()
        return {
            "items": rows[:size],
            "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
        }


def save_job(actor, body, jid=None):
    admin(actor)
    jid = identifier(jid or body.get("request_id"))
    cid = identifier(body.get("company_id"))
    title = text(body.get("title"), "title", 200)
    description = text(body.get("description"), "description", 15000)
    location = text(body.get("location"), "location", 200)
    remote = boolean(body.get("remote", False), "remote")
    skills = body.get("skills", [])
    if not isinstance(skills, list) or len(skills) > 30:
        raise ApiError(400, "At most 30 skills required")
    skills = [text(x, "skill", 80) for x in skills]
    url = https(body.get("apply_url", ""))
    deadline = moment(body.get("deadline"), "deadline")
    state = body.get("status", "draft")
    if state not in ("draft", "published", "archived"):
        raise ApiError(400, "Invalid job status")
    if state == "published" and deadline <= utcnow():
        raise ApiError(400, "Published jobs need a future deadline")
    partner = str(body.get("partner", ""))[:200]
    work = body.get("work_mode", "remote" if remote else "onsite")
    employment = body.get("employment_type", "full_time")
    if work not in ("onsite", "hybrid", "remote") or employment not in (
        "full_time",
        "contract",
        "internship",
    ):
        raise ApiError(400, "Invalid work mode or employment type")
    remote = work == "remote"
    experience_min = integer(body.get("experience_min", 0), 0, 60, "experience_min")
    experience_max = integer(
        body.get("experience_max", experience_min), experience_min, 60, "experience_max"
    )
    salary_min = body.get("salary_min")
    salary_max = body.get("salary_max")
    if salary_min is not None:
        integer(salary_min, 0, 1000000000, "salary_min")
    if salary_max is not None:
        integer(salary_max, salary_min or 0, 1000000000, "salary_max")
    currency = body.get("salary_currency", "INR")
    if currency not in ("INR", "USD", "GBP", "EUR", "AED", "SGD", "CAD", "AUD"):
        raise ApiError(400, "Unsupported salary currency")
    with get_db_cursor() as cur:
        operation = "job.save:" + jid
        mark = mutation(cur, actor, operation, body)
        if mark[2] is not None:
            return mark[2]
        cur.execute("SELECT 1 FROM programme_companies WHERE id=%s", (cid,))
        if not cur.fetchone():
            raise ApiError(404, "Company not found")
        cur.execute(
            """INSERT INTO programme_jobs(id,company_id,title,description,location,remote,skills,apply_url,deadline,status)
        VALUES(%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,
        description=excluded.description,location=excluded.location,remote=excluded.remote,skills=excluded.skills,apply_url=excluded.apply_url,
        deadline=excluded.deadline,status=excluded.status,updated_at=now() RETURNING *""",
            (
                jid,
                cid,
                title,
                description,
                location,
                remote,
                json.dumps(skills),
                url,
                deadline,
                state,
            ),
        )
        result = cur.fetchone()
        cur.execute(
            "UPDATE programme_jobs SET partner=%s,work_mode=%s,employment_type=%s,experience_min=%s,experience_max=%s,salary_min=%s,salary_max=%s,salary_currency=%s WHERE id=%s RETURNING *",
            (
                partner,
                work,
                employment,
                experience_min,
                experience_max,
                salary_min,
                salary_max,
                currency,
                jid,
            ),
        )
        result = cur.fetchone()
        audit(cur, actor, "job.save", jid, {"status": state})
        remember(cur, actor, operation, mark, result)
        return result


def apply(actor, jid, body):
    jid = identifier(jid)
    rid = identifier(body.get("request_id"))
    statement = str(body.get("statement", ""))
    if len(statement) > 2000 or body.get("consent") is not True:
        raise ApiError(
            400,
            "Profile-sharing consent and statement of at most 2000 characters required",
        )
    with get_db_cursor() as cur:
        member(cur, actor["id"])
        cur.execute("SELECT * FROM programme_applications WHERE request_id=%s", (rid,))
        old = cur.fetchone()
        if old:
            if (
                str(old["user_id"]) != actor["id"]
                or str(old["job_id"]) != jid
                or old["statement"] != statement
            ):
                raise ApiError(409, "Request key already used")
            return old
        cur.execute(
            "SELECT j.*,c.active FROM programme_jobs j JOIN programme_companies c ON c.id=j.company_id WHERE j.id=%s FOR SHARE OF j,c",
            (jid,),
        )
        job = cur.fetchone()
        if (
            not job
            or not job["active"]
            or job["status"] != "published"
            or job["deadline"] <= utcnow()
        ):
            raise ApiError(409, "Job is not open for applications")
        if job["apply_url"]:
            raise ApiError(409, "Apply using the company link for this job")
        cur.execute(
            "INSERT INTO programme_applications(request_id,job_id,user_id,statement,consent_at) VALUES(%s,%s,%s,%s,now()) ON CONFLICT(job_id,user_id) DO NOTHING RETURNING *",
            (rid, jid, actor["id"], statement),
        )
        result = cur.fetchone()
        if not result:
            raise ApiError(409, "You have already applied for this job")
        cur.execute(
            "SELECT name,email,user_type,designation,company,university FROM users WHERE id=%s",
            (actor["id"],),
        )
        snapshot = dict(cur.fetchone())
        cur.execute(
            "UPDATE programme_applications SET profile_snapshot=%s::jsonb WHERE id=%s",
            (json.dumps(snapshot, default=str), str(result["id"])),
        )
        result["profile_snapshot"] = snapshot
        aid = str(result["id"])
        cur.execute(
            "INSERT INTO programme_application_history(application_id,status,actor_id) VALUES(%s,'submitted',%s)",
            (aid, actor["id"]),
        )
        emit(
            cur,
            "application:" + aid,
            actor["id"],
            None,
            "career",
            "Application received",
            f'Your application for {job["title"]} was received.',
            "application",
            aid,
            utcnow() + timedelta(days=7),
        )
        audit(cur, actor, "application.create", aid)
        return result


def applications(actor, query, for_staff=False):
    if for_staff:
        admin(actor)
    size, after = page(query)
    with get_db_cursor() as cur:
        cur.execute(
            """SELECT a.*,j.title,c.name AS company_name,u.name AS applicant_name,u.email AS applicant_email FROM programme_applications a
         JOIN programme_jobs j ON j.id=a.job_id JOIN programme_companies c ON c.id=j.company_id JOIN users u ON u.id=a.user_id
         WHERE (%s OR a.user_id=%s) AND (%s::uuid IS NULL OR a.id>%s::uuid) ORDER BY a.id LIMIT %s""",
            (for_staff, actor["id"], after, after, size + 1),
        )
        rows = cur.fetchall()
        for row in rows[:size]:
            cur.execute(
                "SELECT status,note,created_at FROM programme_application_history WHERE application_id=%s ORDER BY id",
                (str(row["id"]),),
            )
            row["history"] = cur.fetchall()
        return {
            "items": rows[:size],
            "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
        }


def update_application(actor, aid, body, for_staff=False):
    aid = identifier(aid)
    state = body.get("status")
    allowed = {
        "submitted": {"reviewing", "rejected", "withdrawn"},
        "reviewing": {"shortlisted", "rejected", "withdrawn"},
        "shortlisted": {"forwarded", "interview", "rejected", "withdrawn"},
        "forwarded": {"interview", "rejected", "withdrawn"},
        "interview": {"offered", "rejected", "withdrawn"},
        "offered": {"withdrawn"},
        "rejected": set(),
        "withdrawn": set(),
    }
    if for_staff:
        admin(actor)
    elif state != "withdrawn":
        raise ApiError(403, "Students may only withdraw their applications")
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT * FROM programme_applications WHERE id=%s FOR UPDATE", (aid,)
        )
        a = cur.fetchone()
        if not a or (not for_staff and str(a["user_id"]) != actor["id"]):
            raise ApiError(404, "Application not found")
        if state == a["status"]:
            return a
        if state not in allowed[a["status"]]:
            raise ApiError(409, "Invalid application stage transition")
        cur.execute(
            "UPDATE programme_applications SET status=%s,updated_at=now() WHERE id=%s RETURNING *",
            (state, aid),
        )
        result = cur.fetchone()
        note = str(body.get("note", ""))
        if len(note) > 2000:
            raise ApiError(400, "Note is too long")
        cur.execute(
            "INSERT INTO programme_application_history(application_id,status,note,actor_id) VALUES(%s,%s,%s,%s)",
            (aid, state, note, actor["id"]),
        )
        emit(
            cur,
            f"application:{aid}:{state}",
            str(a["user_id"]),
            None,
            "career",
            "Application update",
            "Your application status is now " + state + ".",
            "application",
            aid,
            utcnow() + timedelta(days=7),
        )
        audit(cur, actor, "application." + state, aid)
        return result


def internships(actor, query, body=None, for_staff=False, iid=None):
    if for_staff:
        admin(actor)
    with get_db_cursor() as cur:
        if body is None:
            size, after = page(query)
            cur.execute(
                """SELECT i.*,u.name,u.email,c.title AS course_title FROM programme_internships i JOIN users u ON u.id=i.user_id JOIN courses c ON c.id=i.course_id
             WHERE (%s OR i.user_id=%s) AND (%s::uuid IS NULL OR i.id>%s::uuid) ORDER BY i.id LIMIT %s""",
                (for_staff, actor["id"], after, after, size + 1),
            )
            rows = cur.fetchall()
            return {
                "items": rows[:size],
                "next_cursor": str(rows[size - 1]["id"]) if len(rows) > size else None,
            }
        if not for_staff:
            cid = identifier(body.get("course_id"))
            rid = identifier(body.get("request_id"))
            if body.get("eligible_declaration") is not True:
                raise ApiError(400, "Confirm internship eligibility declaration")
            entitlement(cur, actor["id"], cid)
            cur.execute(
                "INSERT INTO programme_internships(request_id,user_id,course_id,eligible_declaration) VALUES(%s,%s,%s,true) ON CONFLICT(user_id,course_id) DO NOTHING RETURNING *",
                (rid, actor["id"], cid),
            )
            result = cur.fetchone()
            if not result:
                cur.execute(
                    "SELECT * FROM programme_internships WHERE user_id=%s AND course_id=%s",
                    (actor["id"], cid),
                )
                result = cur.fetchone()
            return result
        iid = identifier(iid)
        state = body.get("status")
        states = [
            "submitted",
            "screening",
            "interview",
            "accepted",
            "rejected",
            "completed",
        ]
        if state not in states:
            raise ApiError(400, "Invalid internship status")
        cur.execute(
            "SELECT * FROM programme_internships WHERE id=%s FOR UPDATE", (iid,)
        )
        old = cur.fetchone()
        if not old:
            raise ApiError(404, "Application not found")
        transitions = {
            "submitted": {"screening", "rejected"},
            "screening": {"interview", "rejected"},
            "interview": {"accepted", "rejected"},
            "accepted": {"completed"},
            "rejected": set(),
            "completed": set(),
        }
        if state != old["status"] and state not in transitions[old["status"]]:
            raise ApiError(409, "Invalid internship transition")
        if state == "interview" and old["status"] != "interview":
            cur.execute(
                "SELECT * FROM programme_screening_rules WHERE course_id=%s",
                (old["course_id"],),
            )
            rules = cur.fetchone()
            if (
                not rules
                or not rules["aptitude_exam_id"]
                or not rules["technical_exam_id"]
            ):
                raise ApiError(
                    409, "Configure aptitude and technical exams before interview stage"
                )
            for exam in (rules["aptitude_exam_id"], rules["technical_exam_id"]):
                cur.execute(
                    "SELECT 1 FROM exam_attempts WHERE user_id=%s AND exam_id=%s AND status='passed' LIMIT 1",
                    (old["user_id"], exam),
                )
                if not cur.fetchone():
                    raise ApiError(
                        409,
                        "Both screening exams must be passed before interview stage",
                    )
        project = str(body.get("project", old["project"]))[:5000]
        note = str(body.get("review_note", old["review_note"]))[:2000]
        mentor = (
            identifier(body["mentor_id"]) if body.get("mentor_id") else old["mentor_id"]
        )
        if mentor:
            cur.execute(
                "SELECT 1 FROM programme_educators WHERE user_id=%s AND course_id=%s AND active=true",
                (mentor, old["course_id"]),
            )
            if not cur.fetchone():
                raise ApiError(
                    400, "Mentor must be an active educator assigned to this course"
                )
        if state == "accepted" and (not project or not mentor):
            raise ApiError(400, "Accepted internships require a project and mentor")
        cur.execute(
            "UPDATE programme_internships SET status=%s,project=%s,mentor_id=%s,review_note=%s,updated_at=now() WHERE id=%s RETURNING *",
            (state, project, mentor, note, iid),
        )
        result = cur.fetchone()
        if state != old["status"]:
            emit(
                cur,
                f"internship:{iid}:{state}",
                str(old["user_id"]),
                str(old["course_id"]),
                "career",
                "Internship update",
                "Your internship application status is now " + state + ".",
                "internship",
                iid,
                utcnow() + timedelta(days=7),
            )
        audit(cur, actor, "internship." + state, iid)
        return result


def screening(actor, cid, body=None):
    cid = identifier(cid)
    with get_db_cursor() as cur:
        if body is not None:
            admin(actor)
            aptitude = identifier(body.get("aptitude_exam_id"))
            technical = identifier(body.get("technical_exam_id"))
            if aptitude == technical:
                raise ApiError(400, "Choose two different screening exams")
            for exam in (aptitude, technical):
                cur.execute(
                    "SELECT 1 FROM exams WHERE id=%s AND course_id=%s AND published=true",
                    (exam, cid),
                )
                if not cur.fetchone():
                    raise ApiError(400, "Use published exams from this course")
            cur.execute(
                "INSERT INTO programme_screening_rules(course_id,aptitude_exam_id,technical_exam_id) VALUES(%s,%s,%s) ON CONFLICT(course_id) DO UPDATE SET aptitude_exam_id=excluded.aptitude_exam_id,technical_exam_id=excluded.technical_exam_id",
                (cid, aptitude, technical),
            )
            audit(cur, actor, "screening.configure", cid)
        elif not actor.get("admin"):
            enrolled(cur, actor["id"], cid)
        cur.execute(
            "SELECT * FROM programme_screening_rules WHERE course_id=%s", (cid,)
        )
        r = cur.fetchone()
        if not r:
            return {"course_id": cid, "configured": False}
        result = dict(r)
        result["configured"] = True
        if not actor.get("admin"):
            result["passed"] = {}
            for key in ("aptitude_exam_id", "technical_exam_id"):
                cur.execute(
                    "SELECT 1 FROM exam_attempts WHERE user_id=%s AND exam_id=%s AND status='passed' LIMIT 1",
                    (actor["id"], r[key]),
                )
                result["passed"][key] = bool(cur.fetchone())
        return result


def reviews(actor, iid, body=None):
    iid = identifier(iid)
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM programme_internships WHERE id=%s", (iid,))
        intern = cur.fetchone()
        if not intern:
            raise ApiError(404, "Internship not found")
        if not actor.get("admin") and actor["id"] not in (
            str(intern["user_id"]),
            str(intern["mentor_id"]),
        ):
            raise ApiError(404, "Internship not found")
        if body is not None:
            if not actor.get("admin") and actor["id"] != str(intern["mentor_id"]):
                raise ApiError(403, "Assigned mentor or administrator required")
            rid = identifier(body.get("request_id"))
            note = text(body.get("note"), "note", 2000)
            rating = integer(body.get("rating"), 0, 100, "rating")
            cur.execute(
                "SELECT * FROM programme_mentor_reviews WHERE request_id=%s", (rid,)
            )
            previous = cur.fetchone()
            if previous and (
                str(previous["internship_id"]),
                str(previous["mentor_id"]),
                previous["note"],
                previous["rating"],
            ) != (iid, actor["id"], note, rating):
                raise ApiError(409, "Request key already used for another review")
            cur.execute(
                "INSERT INTO programme_mentor_reviews(request_id,internship_id,mentor_id,note,rating) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(request_id) DO NOTHING",
                (rid, iid, actor["id"], note, rating),
            )
            audit(cur, actor, "mentor.review", iid)
        cur.execute(
            "SELECT id,mentor_id,note,rating,created_at FROM programme_mentor_reviews WHERE internship_id=%s ORDER BY created_at,id LIMIT 100",
            (iid,),
        )
        return cur.fetchall()


def internship_certificate(actor, iid):
    """Stable certificate identity; network operations occur after the DB transaction."""
    from learning.media import certificate_pdf, store_certificate

    admin(actor)
    iid = identifier(iid)
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT i.*,u.name,c.title FROM programme_internships i JOIN users u ON u.id=i.user_id JOIN courses c ON c.id=i.course_id WHERE i.id=%s FOR UPDATE OF i",
            (iid,),
        )
        i = cur.fetchone()
        if not i or i["status"] != "completed":
            raise ApiError(
                409, "Complete the internship before issuing its certificate"
            )
        cur.execute(
            "SELECT 1 FROM programme_mentor_reviews WHERE internship_id=%s LIMIT 1",
            (iid,),
        )
        if not cur.fetchone():
            raise ApiError(409, "At least one mentor review is required")
        cid = str(uuid.uuid5(uuid.NAMESPACE_URL, "ai4impact-internship:" + iid))
        title = "Internship: " + i["title"]
        key = f"certificates/internships/{i['user_id']}/{cid}.pdf"
        metadata = {
            "internship_id": iid,
            "course_title": title,
            "recipient_name": i["name"],
            "project": i["project"],
        }
        cur.execute(
            "INSERT INTO certificates_issued(id,user_id,course_id,certificate_type,provider,metadata) VALUES(%s,%s,%s,'internship','AI4Impact',%s::jsonb) ON CONFLICT DO NOTHING",
            (cid, i["user_id"], i["course_id"], json.dumps(metadata)),
        )
        cur.execute("SELECT * FROM certificates_issued WHERE id=%s", (cid,))
        certificate = cur.fetchone()
        if certificate["revoked_at"]:
            raise ApiError(409, "This certificate has been revoked")
    if not certificate["certificate_url"]:
        pdf = certificate_pdf(
            i["name"], title, "AI4Impact", cid, certificate["issued_at"]
        )
        store_certificate(key, pdf)
        with get_db_cursor() as cur:
            cur.execute(
                "UPDATE certificates_issued SET certificate_url=%s WHERE id=%s AND revoked_at IS NULL",
                (key, cid),
            )
            audit(cur, actor, "internship.certificate", iid)
    return {"id": cid, "download_path": "/certificates/" + cid + "/download"}


def letter(actor, iid, body=None):
    import io
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.lib.utils import simpleSplit
    from learning.media import store_certificate, certificate_download

    iid = identifier(iid)
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT i.*,u.name FROM programme_internships i JOIN users u ON u.id=i.user_id WHERE i.id=%s",
            (iid,),
        )
        i = cur.fetchone()
        if not i or (not actor.get("admin") and str(i["user_id"]) != actor["id"]):
            raise ApiError(404, "Internship not found")
        if body is not None:
            admin(actor)
            if i["status"] != "completed":
                raise ApiError(409, "Internship must be completed first")
            content = text(body.get("body"), "recommendation", 5000)
            signer = text(body.get("signer"), "signer", 200)
            operation = "internship.letter:" + iid
            mark = mutation(cur, actor, operation, body)
            if mark[2] is not None:
                return {
                    "url": certificate_download(mark[2]["object_key"]),
                    "expires_in": 300,
                }
            key = (
                "certificates/internship-letters/"
                + iid
                + "/"
                + mark[0]
                + "-"
                + mark[1]
                + ".pdf"
            )
        else:
            cur.execute(
                "SELECT * FROM programme_letters WHERE internship_id=%s AND revoked_at IS NULL",
                (iid,),
            )
            saved = cur.fetchone()
            if not saved:
                raise ApiError(404, "Letter is not available")
            return {"url": certificate_download(saved["object_key"]), "expires_in": 300}
    buf = io.BytesIO()
    pdf = Canvas(buf, pagesize=(595, 842))
    pdf.setTitle("AI4Impact recommendation")
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(50, 780, "AI4Impact")
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, 740, "Letter of recommendation")
    pdf.setFont("Helvetica", 11)
    y = 705
    for line in simpleSplit(
        "For " + i["name"] + "\n\n" + content + "\n\n" + signer, "Helvetica", 11, 495
    ):
        if y < 60:
            pdf.showPage()
            pdf.setFont("Helvetica", 11)
            y = 780
        pdf.drawString(50, y, line)
        y -= 17
    pdf.save()
    store_certificate(key, buf.getvalue())
    with get_db_cursor() as cur:
        mark = mutation(cur, actor, operation, body)
        if mark[2] is not None:
            return {
                "url": certificate_download(mark[2]["object_key"]),
                "expires_in": 300,
            }
        cur.execute(
            "INSERT INTO programme_letters(internship_id,body,signer,object_key,issued_by) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(internship_id) DO UPDATE SET body=excluded.body,signer=excluded.signer,object_key=excluded.object_key,issued_at=now(),revoked_at=NULL,issued_by=excluded.issued_by",
            (iid, content, signer, key, actor["id"]),
        )
        audit(cur, actor, "internship.letter", iid)
        remember(cur, actor, operation, mark, {"object_key": key})
    return {"url": certificate_download(key), "expires_in": 300}
