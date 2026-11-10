"""Staff preview must not hide checkout in the student portal."""
from types import SimpleNamespace
import pytest
from courses.handler import _catalog_content


@pytest.mark.parametrize('staff,registered', [(False,False),(True,False),(False,True),(True,True)])
def test_catalog_access_reflects_enrollment_not_staff_preview(monkeypatch, staff, registered):
    claims = {'sub':'learner','cognito:groups':['Admins'] if staff else ['Students']}
    monkeypatch.setattr('shared.user_repository.get_or_create_user_from_claims',lambda _:SimpleNamespace(id='learner'))
    monkeypatch.setattr('shared.entitlements.enrolled',lambda uid,cid:registered)
    item = {'id':'course','status':'published','classes':[{'zoom_link':'private-link','recording_material_id':'recording'}]}
    result = _catalog_content(item,{'requestContext':{'authorizer':{'claims':claims}}})
    assert result['learning_access'] is registered
    assert result['classes'][0]['zoom_link'] == ('private-link' if staff or registered else None)
    assert item['classes'][0]['zoom_link'] == 'private-link'


def test_anonymous_catalog_does_not_grant_learning_access():
    result = _catalog_content({'id':'course','status':'published','classes':[]},{})
    assert result['learning_access'] is False
