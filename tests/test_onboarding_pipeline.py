"""The unified pipeline preserves enquiry identity, permissions and paginated stages."""
import uuid
import pytest
from learning import enquiries, onboarding, assisted
from learning.validation import ApiError
from shared.db import execute_query
from test_programme_integration import schema, data, DSN

pytestmark = pytest.mark.skipif(not DSN, reason='Requires isolated PostgreSQL PROGRAMME_TEST_DSN')


def lead(data, n=1):
    body = {'request_id':str(uuid.uuid4()),'name':f'Pipeline Person {n}','email':f'pipeline{n}@example.invalid',
            'phone':'+919000000001','interest':'Applied AI','consent':True}
    return enquiries.submit(body)['id']


def test_marketing_can_followup_and_read_one_pipeline(data):
    marketing = {**data['student'], 'marketing':True}
    eid = lead(data)
    result = onboarding.listing(marketing, {})
    assert result['total'] == 1 and result['enquiries'][0]['current'] == 0
    enquiries.update(marketing, eid, {'status':'contacted','notes':'Called, requested a course quote'})
    history = onboarding.followups(marketing,eid)['history']
    assert history[0]['new_status']=='contacted'
    assert onboarding.listing(marketing,{'status':'contacted'})['total']==1
    assert onboarding.listing(marketing,{'search':'missing'})['total']==0
    with pytest.raises(ApiError): onboarding.listing(data['student'],{})


def test_pipeline_paginates_and_filters_without_detail_requests(data):
    for n in range(53): lead(data,n)
    admin = data['admin']
    first = onboarding.listing(admin, {'stage':'all'})
    second = onboarding.listing(admin, {'stage':'all','offset':'50'})
    assert first['total']==53 and len(first['enquiries'])==50 and len(second['enquiries'])==3
    assert not {str(x['id']) for x in first['enquiries']} & {str(x['id']) for x in second['enquiries']}
    assert onboarding.listing(admin, {'stage':'plan'})['total']==0
    for query in ({'stage':'bad'},{'offset':'-1'},{'status':'private'}):
        with pytest.raises(ApiError): onboarding.listing(admin,query)


def test_app_interest_continues_once_without_enrolling(data):
    execute_query("UPDATE course_registrations SET status='interested' WHERE user_id=%s AND course_id=%s",(data['student']['id'],data['course']),fetch='none')
    row = execute_query('SELECT id FROM course_registrations WHERE user_id=%s AND course_id=%s',(data['student']['id'],data['course']),fetch='one')
    first = onboarding.import_interest(data['admin'], str(row['id']))
    assert first == onboarding.import_interest(data['admin'], str(row['id']))
    result=onboarding.listing(data['admin'],{'stage':'all'})
    assert result['total']==1
    assert execute_query('SELECT status FROM course_registrations WHERE id=%s',(row['id'],),fetch='one')['status']=='interested'


def test_app_interest_reuses_matching_website_enquiry(data):
    uid=data['student']['id']
    row=execute_query("SELECT id FROM course_registrations WHERE user_id=%s AND course_id=%s",(uid,data['course']),fetch='one')
    execute_query("UPDATE course_registrations SET status='interested' WHERE id=%s",(row['id'],),fetch='none')
    person=execute_query('SELECT email FROM users WHERE id=%s',(uid,),fetch='one')
    eid=enquiries.submit({'request_id':str(uuid.uuid4()),'name':'Existing lead','email':person['email'],'phone':'+919000000001','interest':'QA Course','consent':True})['id']
    assert onboarding.import_interest(data['admin'],str(row['id']))=={'id':eid}
    assert onboarding.listing(data['admin'],{'stage':'all'})['total']==1
