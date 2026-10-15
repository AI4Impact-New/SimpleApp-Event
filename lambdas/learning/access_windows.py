"""Sequential, persisted seven-day lecture windows; signing and progress enforce them."""
from datetime import timedelta
from shared.db import get_db_cursor
from shared.entitlements import enrolled
from learning.validation import ApiError,identifier

DAYS=7


def _windows(actor,cid,cur):
    cur.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',('lecture-access:'+actor['id']+cid,))
    cur.execute('''SELECT c.id,a.id AS asset_id,a.status AS video_status,a.published_at,
        p.completed,p.completed_at,l.unlocked_at,l.expires_at,now() AS server_now
        FROM course_classes c LEFT JOIN video_assets a ON a.class_id=c.id
        LEFT JOIN lecture_progress p ON p.asset_id=a.id AND p.user_id=%s
        LEFT JOIN lecture_access l ON l.class_id=c.id AND l.user_id=%s
        WHERE c.course_id=%s AND c.class_type='recorded' ORDER BY c.sort_order,c.id''',(actor['id'],actor['id'],cid))
    rows=cur.fetchall();result={};previous=None;prerequisites=True
    for row in rows:
        now=row['server_now'];start=row['unlocked_at'];end=row['expires_at']
        ready=row['video_status']=='ready'
        if not start and ready and prerequisites:
            start=max(previous['completed_at'],row['published_at']) if previous and previous['completed_at'] and row['published_at'] else now
            end=start+timedelta(days=DAYS)
            cur.execute('INSERT INTO lecture_access(user_id,class_id,unlocked_at,expires_at) VALUES(%s,%s,%s,%s) ON CONFLICT DO NOTHING',
                        (actor['id'],row['id'],start,end))
        state='not_ready' if not ready else 'locked' if not prerequisites else 'expired' if end and end<=now else 'available'
        result[str(row['id'])]={'access_state':state,'unlocked_at':start,'access_expires_at':end,'access_days':DAYS,
                               'prerequisite_class_id':str(previous['id']) if previous else None}
        prerequisites=prerequisites and ready and bool(row['completed'])
        previous=row
    return result


def windows(actor,cid):
    if actor['admin']:return {}
    with get_db_cursor() as cur:return _windows(actor,cid,cur)


def require_window(actor,cid,class_id,cur=None):
    if actor['admin']:return None
    if cur is None:
        with get_db_cursor() as cursor:return require_window(actor,cid,class_id,cursor)
    item=_windows(actor,cid,cur).get(class_id)
    if not item or item['access_state']=='not_ready':raise ApiError(409,'Recording is not ready')
    if item['access_state']=='locked':raise ApiError(403,'Complete the previous recording to unlock this video')
    if item['access_state']=='expired':raise ApiError(410,'The seven-day video access window expired; ask an administrator to reopen it')
    return item['access_expires_at']


def reset(actor,class_id,body):
    from learning.service import admin,class_row
    admin(actor)
    if set(body)!={'user_id'}:raise ApiError(400,'user_id is required')
    uid=identifier(body.get('user_id'));lecture=class_row(identifier(class_id));cid=str(lecture['course_id'])
    if lecture['class_type']!='recorded':raise ApiError(400,'Only recorded lessons have access windows')
    if not enrolled(uid,cid):raise ApiError(409,'Student is not enrolled in this course')
    learner={'id':uid,'admin':False}
    with get_db_cursor() as cur:
        item=_windows(learner,cid,cur).get(class_id)
        if not item or item['access_state'] in ('locked','not_ready'):raise ApiError(409,'Publish this recording and complete previous recordings first')
        cur.execute("""UPDATE lecture_access SET unlocked_at=now(),expires_at=now()+interval '7 days',reset_by=%s
            WHERE user_id=%s AND class_id=%s RETURNING unlocked_at,expires_at AS access_expires_at""",(actor['id'],uid,class_id))
        return {**cur.fetchone(),'user_id':uid,'class_id':class_id,'access_days':DAYS}
