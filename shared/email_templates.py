"""Versioned Resend aliases and safe variables shared by transports."""
import os
from html import escape


def template_key(event_key='', category='', entity_type=''):
    if category == 'payment':
        return 'payment-confirmed' if ':paid:' in event_key else 'refund-partial' if ':partially_refunded:' in event_key else 'refund-full'
    if category == 'enrollment':
        return 'course-enrolled' if ':registered:' in event_key else 'course-completed' if ':completed:' in event_key else 'course-access-updated'
    if category == 'certificate': return 'certificate-issued'
    if event_key.startswith('booking:'):
        if ':reminder:' in event_key: return 'session-reminder'
        if event_key.endswith(':cancelled'): return 'session-cancelled'
        if event_key.endswith(':rescheduled'): return 'session-rescheduled'
        if event_key.endswith((':completed', ':no_show')): return 'session-outcome'
        return 'session-confirmed'
    if event_key.startswith('webinar:'):
        if ':reminder:' in event_key: return 'webinar-reminder'
        if event_key.endswith(':cancelled'): return 'webinar-cancelled'
        if event_key.endswith(':updated'): return 'webinar-updated'
        return 'webinar-confirmed'
    if event_key.startswith('application:'): return 'application-received' if len(event_key.split(':')) == 2 else 'application-updated'
    if event_key.startswith('internship:'): return 'internship-updated'
    return 'course-announcement'


def apply_template(payload, key, title, body):
    if os.environ.get('RESEND_TEMPLATES_ENABLED') != 'true': return
    # Triple-brace provider variables are explicitly escaped for HTML. Chunking
    # retains the full escaped body within the provider's per-variable limit.
    safe = escape(body)
    if len(title) > 200 or len(body) > 2000 or len(safe) > 12000:
        raise ValueError('Email content exceeds template bounds')
    variables = {'TITLE': escape(title), 'TEXT': body}
    variables.update({f'BODY_{i+1}': safe[i*2000:(i+1)*2000] for i in range(6)})
    payload.pop('html', None); payload.pop('text', None)
    payload['template'] = {'id': 'ai4impact-'+key+'-v1', 'variables': variables}
    payload['tags'] = [{'name':'workflow','value':key}]
