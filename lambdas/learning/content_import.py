"""Stage private course files and publish a reviewed ZIP outline transactionally."""
import json
import uuid
from concurrent.futures import ThreadPoolExecutor

from learning import service
from learning.validation import ApiError, identifier, integer, text
from shared.db import execute_query, get_db_cursor

MAX_FILES = 40


def entries(value, label, minimum=0):
    if not isinstance(value, list) or not minimum <= len(value) <= MAX_FILES or any(
        not isinstance(item, dict) for item in value
    ):
        raise ApiError(400, f"{label} must contain {minimum} to {MAX_FILES} objects")
    return value


def manifest(body):
    file_ids = set()

    def asset(item, video=False):
        if not isinstance(item, dict):
            raise ApiError(400, "File metadata must be an object")
        file_id = identifier(item.get("id"))
        name = text(item.get("name"), "filename", 255)
        if any(ch in name for ch in "/\\") or any(ord(ch) < 32 for ch in name):
            raise ApiError(400, "Use a plain filename")
        if file_id in file_ids or len(file_ids) >= MAX_FILES:
            raise ApiError(400, "Use unique file IDs and no more than 40 files per import")
        file_ids.add(file_id)
        result = {"id": file_id, "name": name, "size": integer(
            item.get("size"), 1, 2147483648 if video else 104857600, "file size"
        )}
        if video:
            if not name.lower().endswith(".mp4"):
                raise ApiError(400, "Lecture recordings must be MP4")
            result["duration_seconds"] = integer(item.get("duration_seconds"), 1, 43200, "duration_seconds")
        return result

    modules = []
    for module in entries(body.get("modules"), "modules", 1):
        resources = [asset(item) for item in entries(module.get("resources", []), "module resources")]
        lectures = []
        for lecture in entries(module.get("lectures", []), "lectures"):
            video = asset(lecture["video"], True) if lecture.get("video") is not None else None
            materials = [asset(item) for item in entries(lecture.get("resources", []), "lecture resources")]
            if not video and not materials:
                raise ApiError(400, "Each lecture needs a video or resource")
            lectures.append({"title": text(lecture.get("title"), "lecture title", 255),
                             "video": video, "resources": materials})
        if not resources and not lectures:
            raise ApiError(400, "Each module needs a lecture or resource")
        modules.append({"title": text(module.get("title"), "module title", 255),
                        "resources": resources, "lectures": lectures})
    return modules


def files(modules):
    for module in modules:
        yield from module["resources"]
        for lecture in module["lectures"]:
            if lecture["video"]:
                yield lecture["video"]
            yield from lecture["resources"]


def object_key(course_id, import_id, item):
    extension = ".mp4" if "duration_seconds" in item else ""
    return f"courses/{course_id}/imports/{import_id}/{item['id']}{extension}"


def content_type(item):
    return "video/mp4" if "duration_seconds" in item else "application/octet-stream"


def stage(actor, course_id, import_id, body):
    service.admin(actor)
    modules = manifest(body)
    with get_db_cursor() as cur:
        cur.execute("SELECT id FROM courses WHERE id=%s AND archived=false FOR SHARE", (course_id,))
        if not cur.fetchone():
            raise ApiError(404, "Active course not found")
        cur.execute("""INSERT INTO course_content_imports(course_id,id,manifest)
            VALUES (%s,%s,%s) ON CONFLICT DO NOTHING""", (course_id, import_id, json.dumps(modules)))
        cur.execute("SELECT manifest,published_at FROM course_content_imports WHERE course_id=%s AND id=%s",
                    (course_id, import_id))
        row = cur.fetchone()
        if row["manifest"] != modules:
            raise ApiError(409, "This import ID was already used for another outline")
    if row["published_at"]:
        return {"status": "published", "uploads": []}
    from learning.media import upload_form
    return {"status": "uploading", "uploads": [
        {"id": item["id"], **upload_form(object_key(course_id, import_id, item), item["size"], content_type(item))}
        for item in files(modules)
    ]}


def publish(actor, course_id, import_id):
    service.admin(actor)
    row = execute_query("SELECT manifest,published_at FROM course_content_imports WHERE course_id=%s AND id=%s",
                        (course_id, import_id), fetch="one")
    if not row:
        raise ApiError(404, "Course import not found")
    if row["published_at"]:
        return {"status": "published"}
    from learning.media import confirm_upload

    def verify(item):
        try:
            confirm_upload(object_key(course_id, import_id, item), item["size"], content_type(item))
        except ApiError as error:
            raise ApiError(error.status, f"Check the upload for {item['name']}") from error

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(verify, files(row["manifest"])))

    with get_db_cursor() as cur:
        cur.execute("SELECT id FROM courses WHERE id=%s AND archived=false FOR UPDATE", (course_id,))
        if not cur.fetchone():
            raise ApiError(404, "Active course not found")
        cur.execute("SELECT manifest,published_at FROM course_content_imports WHERE course_id=%s AND id=%s FOR UPDATE",
                    (course_id, import_id))
        row = cur.fetchone()
        if row["published_at"]:
            return {"status": "published"}
        cur.execute("SELECT coalesce(max(sort_order),-1)+1 AS next FROM course_classes WHERE course_id=%s", (course_id,))
        position = cur.fetchone()["next"]
        for module_index, module in enumerate(row["manifest"]):
            _resources(cur, course_id, import_id, module_index, module["resources"])
            for lecture_index, lecture in enumerate(module["lectures"]):
                class_id = lecture_id(course_id, import_id, module_index, lecture_index)
                video = lecture["video"]
                if video:
                    minutes = (video["duration_seconds"] + 59) // 60
                    cur.execute("""INSERT INTO course_classes(id,course_id,title,class_type,duration_minutes,sort_order)
                        VALUES (%s,%s,%s,'recorded',%s,%s)""", (class_id, course_id, lecture["title"], minutes, position))
                    position += 1
                    cur.execute("""INSERT INTO video_assets(class_id,course_id,object_key,duration_seconds,size_bytes,status,published_at)
                        VALUES (%s,%s,%s,%s,%s,'ready',now())""", (class_id, course_id,
                        object_key(course_id, import_id, video), video["duration_seconds"], video["size"]))
                _resources(cur, course_id, import_id, module_index, lecture["resources"],
                           class_id if video else None, lecture_index)
        cur.execute("UPDATE course_content_imports SET published_at=now() WHERE course_id=%s AND id=%s",
                    (course_id, import_id))
    return {"status": "published"}


def lecture_id(course_id, import_id, module_index, lecture_index):
    return str(uuid.uuid5(uuid.UUID(course_id), f"{import_id}/{module_index}/{lecture_index}"))


def _resources(cur, course_id, import_id, module_index, resources, class_id=None, lecture_index=None):
    for order, item in enumerate(resources):
        resource_id = str(uuid.uuid5(uuid.UUID(course_id), f"{import_id}/{item['id']}"))
        cur.execute("""INSERT INTO course_import_resources(id,course_id,import_id,class_id,module_index,lecture_index,sort_order,filename,object_key,size_bytes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (resource_id, course_id, import_id, class_id, module_index, lecture_index,
            order, item["name"], object_key(course_id, import_id, item), item["size"]))


def outline(actor, course_id):
    service.access(actor, course_id)
    modules = execute_query("""SELECT id, manifest FROM course_content_imports WHERE course_id=%s
        AND published_at IS NOT NULL ORDER BY published_at,id""", (course_id,), fetch="all") or []
    resources = execute_query("""SELECT id,import_id,class_id,module_index,lecture_index,filename,size_bytes FROM course_import_resources
        WHERE course_id=%s ORDER BY sort_order,id""", (course_id,), fetch="all") or []
    class_rows = execute_query("SELECT id, title, sort_order FROM course_classes WHERE course_id=%s",
                               (course_id,), fetch="all") or []
    classes = {str(row["id"]): row for row in class_rows}
    by_module = {}
    for item in resources:
        by_module.setdefault((item["import_id"], item["module_index"]), []).append(item)
    result = []
    for row in modules:
        for index, module in enumerate(row["manifest"]):
            items = by_module.get((row["id"], index), [])
            lessons = []
            for position, lecture in enumerate(module["lectures"]):
                class_id = lecture_id(course_id, row["id"], index, position)
                attached = [item for item in items if item["lecture_index"] == position]
                if class_id in classes:
                    lessons.append({**classes[class_id], "resources": attached})
                elif not lecture["video"] and attached:
                    lessons.append({"id": None, "title": lecture["title"], "resources": attached})
            if lessons or items:
                result.append({"title": module["title"], "lectures": lessons,
                               "resources": [item for item in items if item["lecture_index"] is None]})
    return {"modules": result}


def download(actor, course_id, resource_id):
    service.access(actor, course_id)
    row = execute_query("SELECT filename,object_key FROM course_import_resources WHERE course_id=%s AND id=%s",
                        (course_id, resource_id), fetch="one")
    if not row:
        raise ApiError(404, "Resource not found")
    from learning.media import resource_download
    return {"url": resource_download(row["object_key"], row["filename"]), "expires_in": 300}
