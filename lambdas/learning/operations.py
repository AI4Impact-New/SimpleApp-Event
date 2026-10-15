"""Staff launch readiness and notification configuration without secrets."""
import os
from shared.db import execute_query
from learning.service import admin

def readiness(actor):
    admin(actor)
    rows=execute_query('''SELECT
      (SELECT count(*) FROM courses WHERE archived=false AND status='published') AS published_courses,
      (SELECT count(*) FROM course_classes cc JOIN courses c ON c.id=cc.course_id LEFT JOIN video_assets a ON a.class_id=cc.id WHERE c.archived=false AND cc.class_type='recorded' AND (a.status IS NULL OR a.status<>'ready')) AS recordings_needing_upload,
      (SELECT count(*) FROM push_jobs WHERE status='failed') AS failed_push_jobs,
      (SELECT count(*) FROM push_jobs WHERE status='pending') AS pending_push_jobs,
      (SELECT count(*) FROM website_enquiries WHERE status='new') AS new_enquiries,
      (SELECT count(*) FROM courses c WHERE c.archived=false AND NOT EXISTS(SELECT 1 FROM course_classes cc WHERE cc.course_id=c.id)) AS courses_without_classes''',fetch='one')
    return {'database':'ok',**rows,'push_configured':bool(os.environ.get('EXPO_PROJECT_ID')),
            'expo_project_id':os.environ.get('EXPO_PROJECT_ID') or None,
            'payments':'demo_only','marketing_group':'Marketing','api_version':'2026-10-launch-readiness'}
