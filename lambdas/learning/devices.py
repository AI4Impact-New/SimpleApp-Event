"""Authenticated registration of app-owned Expo push devices."""
import os
import re

from shared.db import execute_query, get_db_cursor
from learning.validation import ApiError, identifier


def register(actor, body):
    expected = os.environ.get("EXPO_PROJECT_ID","")
    if not expected: raise ApiError(503,"Native push requires the app team's Expo project configuration")
    project = identifier(body.get("project_id"))
    if project != expected: raise ApiError(400,"Push token belongs to a different Expo project")
    token,platform = body.get("token"),body.get("platform")
    if not isinstance(token,str) or not re.fullmatch(r"(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,100}\]",token):
        raise ApiError(400,"A valid Expo push token is required")
    if platform not in ("ios","android"): raise ApiError(400,"platform must be ios or android")
    with get_db_cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",(actor["id"]+"devices",))
        cur.execute("SELECT id,user_id FROM push_devices WHERE token=%s",(token,))
        existing=cur.fetchone()
        if existing and str(existing["user_id"]) != actor["id"]: raise ApiError(409,"Sign out the previous device account before registering this token")
        cur.execute("SELECT count(*) AS count FROM push_devices WHERE user_id=%s",(actor["id"],))
        if not existing and cur.fetchone()["count"]>=10: raise ApiError(409,"Maximum registered devices reached")
        cur.execute("""INSERT INTO push_devices(user_id,token,platform,project_id) VALUES (%s,%s,%s,%s)
            ON CONFLICT(token) DO UPDATE SET platform=excluded.platform,project_id=excluded.project_id,updated_at=now()
            WHERE push_devices.user_id=excluded.user_id RETURNING id,platform,project_id""",(actor["id"],token,platform,project))
        result=cur.fetchone()
        if not result: raise ApiError(409,"This token is registered to another account")
    return result


def listing(actor):
    return execute_query("SELECT id,platform,project_id,updated_at FROM push_devices WHERE user_id=%s ORDER BY updated_at DESC",(actor["id"],),fetch="all") or []


def delete(actor, device_id):
    row=execute_query("DELETE FROM push_devices WHERE id=%s AND user_id=%s RETURNING id",(identifier(device_id),actor["id"]),fetch="one")
    if not row: raise ApiError(404,"Device not found")
    return {"deleted":True}
