import json
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from learning import handler, service, exams, certificates
from learning.validation import ApiError, identifier, integer, questions, score, watched_update

UID = "00000000-0000-0000-0000-000000000001"
OTHER = "00000000-0000-0000-0000-000000000002"
ACTOR = {"id":UID,"name":"Test learner","admin":False}


def question():
    return {"question":"What is 2 + 2?","options":[{"id":"a","label":"4"},{"id":"b","label":"5"}],"correct_option_id":"a","points":2}


@pytest.mark.parametrize("bad", [None,"bad",1,{},[]])
def test_invalid_identifiers(bad):
    with pytest.raises(ApiError): identifier(bad)


@pytest.mark.parametrize("bad", [True,1.5,"2",-1,101])
def test_integer_validation_rejects_coercion(bad):
    with pytest.raises(ApiError): integer(bad,0,100,"value")


def test_question_authoring_validates_correct_option_and_duplicate_ids():
    value = question(); value["correct_option_id"]="c"
    with pytest.raises(ApiError): questions([value])
    value = question(); value["options"][1]["id"]="a"
    with pytest.raises(ApiError): questions([value])
    assert len(questions([question()]))==1


def test_server_scoring_rejects_unknown_options():
    snapshot = questions([question()])
    qid=snapshot[0]["id"]
    assert score(snapshot,{qid:"a"})==(2,2,100.0)
    assert score(snapshot,{qid:"b"})==(0,2,0.0)
    with pytest.raises(ApiError): score(snapshot,{qid:"c"})
    with pytest.raises(ApiError): score(snapshot,{OTHER:"a"})


def test_seeking_cannot_complete_a_lecture():
    assert watched_update([],0,600,1,600)==([],0,False)


def test_replays_and_duplicate_heartbeats_do_not_increase_watch_credit():
    ranges,watched,complete=watched_update([[0,100]],0,90,90,600)
    assert ranges==[[0,100]] and watched==100 and not complete
    assert watched_update(ranges,90,90,20,600)==(ranges,100,False)


def test_ninety_percent_of_unique_watching_completes_lecture():
    ranges,watched,complete=watched_update([[0,80]],80,90,10,100)
    assert ranges==[[0,90]] and watched==90 and complete


@pytest.mark.parametrize("position", [float('nan'),float('inf'),-1,101,"90",True])
def test_bad_playback_positions_are_rejected(position):
    with pytest.raises(ApiError): watched_update([],0,position,60,100)


def test_attempt_response_never_exposes_answer_keys():
    now=datetime.now(timezone.utc)
    row={"id":UID,"exam_id":OTHER,"status":"pending","score":None,"attempted_at":now,"expires_at":now+timedelta(minutes=30),"submitted_at":None,
         "metadata":{"snapshot":questions([question()]),"pass_percentage":70}}
    result=exams._attempt_response(row)
    assert "correct_option_id" not in json.dumps(result,default=str)
    assert "metadata" not in result


def test_admin_access_comes_from_cognito_groups_not_database_role(monkeypatch):
    monkeypatch.setattr(handler,"get_current_user",lambda event:{"sub":UID,"cognito:groups":["Students"]})
    monkeypatch.setattr(handler,"get_or_create_user_from_claims",lambda claims:SimpleNamespace(id=UID,name="Learner",role="admin"))
    assert not handler._actor({})["admin"]


def test_student_cannot_access_admin_api(monkeypatch):
    monkeypatch.setattr(handler,"_actor",lambda event:ACTOR)
    result=handler.handler({"path":"/admin/learning/overview","httpMethod":"GET"},None)
    assert result["statusCode"]==403


def test_public_verification_does_not_require_authentication(monkeypatch):
    monkeypatch.setattr(certificates,"public_verify",lambda cid:{"id":cid,"valid":True})
    monkeypatch.setattr(handler,"_actor",Mock(side_effect=AssertionError("Should not request auth")))
    assert handler.handler({"path":f"/certificates/{UID}/verify","httpMethod":"GET"},None)["statusCode"]==200


def test_student_cannot_download_another_learners_certificate(monkeypatch):
    monkeypatch.setattr(certificates,"execute_query",lambda *args,**kwargs:{"id":UID,"user_id":OTHER})
    with pytest.raises(ApiError) as error: certificates.download(ACTOR,UID)
    assert error.value.status==404


def test_revoked_public_certificate_exposes_no_personal_details(monkeypatch):
    monkeypatch.setattr(certificates,"execute_query",lambda *args,**kwargs:{"id":UID,"revoked_at":datetime.now(timezone.utc),"name":"Private name"})
    result=certificates.public_verify(UID)
    assert result=={"id":UID,"valid":False,"reason":"revoked"}


def test_certificate_cannot_be_issued_before_completion(monkeypatch):
    monkeypatch.setattr(certificates,"completion",lambda *args:{"eligible":False,"missing_requirements":["exam"]})
    with pytest.raises(ApiError) as error: certificates.issue(ACTOR,UID)
    assert error.value.status==409


def test_empty_course_is_not_eligible(monkeypatch):
    monkeypatch.setattr(service,"access",lambda *args:{})
    monkeypatch.setattr(service,"rules",lambda *args:{"require_recorded":True,"require_exam":True,"require_attendance":False})
    monkeypatch.setattr(service,"classes",lambda *args:[])
    monkeypatch.setattr(service,"execute_query",lambda *args,**kwargs:[])
    assert not service.completion(ACTOR,UID)["eligible"]


def test_required_assessment_cannot_be_skipped_when_no_exam_exists(monkeypatch):
    monkeypatch.setattr(service,"access",lambda *args:{})
    monkeypatch.setattr(service,"rules",lambda *args:{"require_recorded":True,"require_exam":True,"require_attendance":False})
    monkeypatch.setattr(service,"classes",lambda *args:[{"class_type":"recorded","completed":True,"video_status":"ready"}])
    monkeypatch.setattr(service,"execute_query",lambda *args,**kwargs:[])
    status=service.completion(ACTOR,UID)
    assert not status["eligible"] and "exam" in status["missing_requirements"]


def test_unregistered_student_cannot_access_recordings(monkeypatch):
    monkeypatch.setattr(service,"course",lambda *args:{"status":"published"})
    monkeypatch.setattr(service,"enrolled",lambda *args:False)
    with pytest.raises(ApiError) as error: service.access(ACTOR,UID)
    assert error.value.status==403


def test_wrong_playback_session_cannot_update_progress(monkeypatch):
    from learning import access_windows
    monkeypatch.setattr(access_windows,"require_window",lambda *args:None)
    monkeypatch.setattr(service,"class_row",lambda *args:{"course_id":UID})
    monkeypatch.setattr(service,"access",lambda *args:{})
    cursor=Mock(); cursor.fetchone.return_value=None
    @contextmanager
    def cursor_context(): yield cursor
    monkeypatch.setattr(service,"get_db_cursor",cursor_context)
    with pytest.raises(ApiError) as error: service.progress_heartbeat(ACTOR,UID,{"session_id":OTHER,"position_seconds":10})
    assert error.value.status==409


def test_unexpected_route_suffix_is_not_accepted(monkeypatch):
    monkeypatch.setattr(handler,"_actor",lambda event:ACTOR)
    assert handler.handler({"path":f"/learning/courses/{UID}/progress/extra","httpMethod":"GET"},None)["statusCode"]==404


def test_cors_preflight_does_not_require_a_jwt(monkeypatch):
    monkeypatch.setattr(handler,'_actor',Mock(side_effect=AssertionError('Preflight must not authenticate')))
    assert handler.handler({'path':'/admin/learning/overview','httpMethod':'OPTIONS'},None)['statusCode']==204


def test_course_with_issued_certificates_is_preserved(monkeypatch):
    from courses import repository
    cursor=Mock();cursor.fetchone.side_effect=[{'id':UID},{'exists':1}]
    @contextmanager
    def context(): yield cursor
    monkeypatch.setattr(repository,'get_db_cursor',context)
    with pytest.raises(repository.CourseDeletionConflict): repository.CourseRepository().delete(UID)
    assert all('DELETE FROM courses' not in call.args[0] for call in cursor.execute.call_args_list)


def test_public_browser_verify_redirect_keeps_id_and_no_login(monkeypatch):
    monkeypatch.setattr(certificates, "public_verify", lambda cid: {"id": cid, "valid": True})
    monkeypatch.setenv("CERTIFICATE_VERIFY_PAGE_URL", "https://site.example/verify")
    result = handler.handler({"path": f"/certificates/{UID}/verify", "httpMethod": "GET", "headers": {"accept": "text/html,application/xhtml+xml"}}, None)
    assert result["statusCode"] == 302
    assert result["headers"]["Location"] == f"https://site.example/verify/?id={UID}"
    assert result["headers"]["Cache-Control"] == "no-store"


@pytest.mark.parametrize("accept", ["", "*/*", "application/json", "application/json,text/html"])
def test_public_api_verify_remains_json(monkeypatch, accept):
    monkeypatch.setattr(certificates, "public_verify", lambda cid: {"id": cid, "valid": True})
    monkeypatch.setenv("CERTIFICATE_VERIFY_PAGE_URL", "https://site.example/verify")
    result = handler.handler({"path": f"/certificates/{UID}/verify", "httpMethod": "GET", "headers": {"accept": accept}}, None)
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["valid"] is True
