"""Scheduled durable Expo push delivery and receipt checking."""
import logging
import os
from datetime import timedelta

import requests
from shared.db import get_db_cursor

logger=logging.getLogger(__name__)
http=requests.Session()


def _post(path, payload):
    headers={"Accept":"application/json"}
    if os.environ.get("EXPO_ACCESS_TOKEN"): headers["Authorization"]="Bearer "+os.environ["EXPO_ACCESS_TOKEN"]
    response=http.post("https://exp.host/--/api/v2/push/"+path,json=payload,headers=headers,timeout=(3,8))
    response.raise_for_status()
    result=response.json()
    if result.get("errors"): raise ValueError("Expo rejected the batch")
    return result["data"]


def _retry(cur,jobs,code):
    for job in jobs:
        attempt=job["attempts"]+1
        cur.execute("UPDATE push_jobs SET attempts=%s,status=%s,error_code=%s,next_attempt_at=now()+%s::interval WHERE id=%s",
                    (attempt,'failed' if attempt>=5 else 'pending',code,f"{2**attempt} minutes",job["id"]))


def handler(event,context):
    submitted=0; receipts_checked=0
    project_id=os.environ.get("EXPO_PROJECT_ID", "")
    if not project_id:
        with get_db_cursor() as cur:
            cur.execute("DELETE FROM playback_sessions WHERE expires_at<now()-interval '7 days'")
        return {"disabled":True,"reason":"Expo project ID not configured"}
    with get_db_cursor() as cur:
        cur.execute("""INSERT INTO push_jobs(notification_id,device_id)
            SELECT n.id,d.id FROM learner_notifications n JOIN push_devices d ON d.user_id=n.user_id
            WHERE n.created_at>now()-interval '15 minutes' AND d.project_id::text=%s ON CONFLICT DO NOTHING""",(os.environ.get('EXPO_PROJECT_ID',''),))
        cur.execute("""SELECT j.*,d.token,d.project_id,n.title,n.body,n.course_id
            FROM push_jobs j JOIN push_devices d ON d.id=j.device_id JOIN learner_notifications n ON n.id=j.notification_id
            WHERE j.status='pending' AND j.next_attempt_at<=now() AND d.project_id::text=%s ORDER BY j.next_attempt_at LIMIT 50 FOR UPDATE OF j SKIP LOCKED""",(project_id,))
        jobs=cur.fetchall()
        projects={str(job["project_id"]) for job in jobs}
        for project in projects:
            group=[job for job in jobs if str(job["project_id"])==project]
            messages=[{"to":job["token"],"title":job["title"],"body":job["body"],"sound":"default",
                       "data":{"notification_id":str(job["notification_id"]),"course_id":str(job["course_id"]) if job["course_id"] else None}} for job in group]
            try:
                tickets=_post("send",messages)
                if not isinstance(tickets,list) or len(tickets)!=len(group) or any(not isinstance(t,dict) for t in tickets): raise ValueError("Unexpected Expo ticket count")
            except (requests.RequestException,ValueError,KeyError):
                logger.warning("Push batch failed; retrying with backoff")
                _retry(cur,group,"TransportOrProviderError")
                continue
            for job,ticket in zip(group,tickets):
                if ticket.get("status")=="ok" and ticket.get("id"):
                    cur.execute("UPDATE push_jobs SET status='ticket',ticket_id=%s,ticket_at=now(),attempts=attempts+1,next_attempt_at=now()+interval '15 minutes' WHERE id=%s",(ticket["id"],job["id"]))
                    submitted+=1
                else:
                    code=(ticket.get("details") or {}).get("error","ProviderError")
                    if code=="DeviceNotRegistered": cur.execute("DELETE FROM push_devices WHERE id=%s",(job["device_id"],))
                    elif code=="MessageRateExceeded": _retry(cur,[job],code)
                    else: cur.execute("UPDATE push_jobs SET status='failed',error_code=%s WHERE id=%s",(code,job["id"]))
        cur.execute("SELECT j.*,now() AS server_now FROM push_jobs j WHERE status='ticket' AND next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 100 FOR UPDATE SKIP LOCKED")
        waiting=cur.fetchall()
        if waiting:
            try:
                receipts=_post("getReceipts",{"ids":[job["ticket_id"] for job in waiting]})
                if not isinstance(receipts,dict): raise ValueError("Unexpected Expo receipts")
            except (requests.RequestException,ValueError,KeyError):
                receipts={}
            for job in waiting:
                receipt=receipts.get(job["ticket_id"])
                if not receipt:
                    expired=job["server_now"]-job["ticket_at"]>=timedelta(hours=24)
                    cur.execute("UPDATE push_jobs SET status=%s,error_code=%s,next_attempt_at=now()+interval '5 minutes' WHERE id=%s",('failed' if expired else 'ticket','ReceiptUnavailable' if expired else None,job["id"]))
                    continue
                receipts_checked+=1
                if receipt.get("status")=="ok": cur.execute("UPDATE push_jobs SET status='provider_accepted',error_code=NULL WHERE id=%s",(job["id"],))
                else:
                    code=(receipt.get("details") or {}).get("error","ProviderError")
                    if code=="DeviceNotRegistered": cur.execute("DELETE FROM push_devices WHERE id=%s",(job["device_id"],))
                    else: cur.execute("UPDATE push_jobs SET status='failed',error_code=%s WHERE id=%s",(code,job["id"]))
        cur.execute("DELETE FROM playback_sessions WHERE expires_at<now()-interval '7 days'")
    return {"tickets_created":submitted,"receipts_checked":receipts_checked}
