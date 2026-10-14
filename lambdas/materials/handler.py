"""
Materials Lambda handler.
Entry point for material-related API requests.
"""

import json
import logging
from typing import Dict, Any

from shared.auth import require_auth, require_role, create_response, create_error_response

logger = logging.getLogger(__name__)

def _extract_material_id(path: str) -> str:
    parts = path.split("/")
    return parts[2] if len(parts) >= 3 else ""


def _load_json_body(event: Dict[str, Any]) -> Dict[str, Any]:
    body = event.get("body", "{}") or "{}"
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON body") from exc


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for materials."""
    try:
        path = event.get("path", "/materials")
        method = event.get("httpMethod", event.get("method", "GET"))
        
        # Route: POST /materials (create + get upload URL)
        if path == "/materials" and method == "POST":
            return create_material(event, context)
        
        # Route: GET /materials?event_id=xxx
        if path == "/materials" and method == "GET":
            return list_materials(event, context)
        
        # Route: /materials/{material_id}
        if path.startswith("/materials/"):
            parts = path.split("/")
            if len(parts) >= 3:
                # GET /materials/{material_id}
                if method == "GET":
                    return get_material(event, context)
                
                # DELETE /materials/{material_id}
                if method == "DELETE":
                    return delete_material(event, context)
                
                # POST /materials/{material_id}/download
                if len(parts) >= 4 and parts[3] == "download" and method == "POST":
                    return get_download_url(event, context)
        
        return create_error_response(404, "Endpoint not found")
        
    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        return create_error_response(500, "Internal server error")


@require_role("admin")
def create_material(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Create a material record and generate presigned upload URL.
    POST /materials
    """
    from materials.service import MaterialService
    from shared.user_repository import get_or_create_user_from_claims
    
    try:
        body = _load_json_body(event)
    except ValueError as exc:
        return create_error_response(400, str(exc))
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    if not app_user:
        return create_error_response(400, "Authenticated user profile could not be resolved")
    
    service = MaterialService()
    result = service.create_material(
        event_id=body.get("event_id"),
        title=body.get("title"),
        file_type=body.get("file_type"),
        uploaded_by=app_user.id,
    )
    
    if not result:
        return create_error_response(400, "Failed to create material")
    
    return create_response(201, result)


def get_material(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Get material details."""
    from materials.service import MaterialService

    material_id = _extract_material_id(event.get("path", ""))
    if not material_id:
        return create_error_response(400, "material_id is required")
    
    service = MaterialService()
    result = service.get_material(material_id)
    
    if not result:
        return create_error_response(404, "Material not found")
    
    return create_response(200, result)


@require_role("admin")
def delete_material(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Delete a material."""
    from materials.service import MaterialService

    logger.info("delete_material handler started")
    material_id = _extract_material_id(event.get("path", ""))
    if not material_id:
        return create_error_response(400, "material_id is required")
    
    user = event.get("user", {})
    user_id = user.get("sub") or user.get("cognito:username")
    
    service = MaterialService()
    logger.info("delete_material calling service.delete_material for %s", material_id)
    success = service.delete_material(material_id, user_id)
    logger.info("delete_material service returned success=%s", success)
    
    if not success:
        return create_error_response(404, "Material not found")
    
    return create_response(204, {"message": "Material deleted"})


def list_materials(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    List materials for an event.
    GET /materials?event_id=xxx
    """
    from materials.service import MaterialService
    
    params = event.get("queryStringParameters", {}) or {}
    event_id = params.get("event_id")
    
    if not event_id:
        return create_error_response(400, "event_id is required")
    
    service = MaterialService()
    result = service.list_materials(event_id)
    
    return create_response(200, {"materials": result})


@require_auth
def get_download_url(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Get presigned download URL for a material.
    POST /materials/{material_id}/download
    """
    from materials.service import MaterialService
    from shared.user_repository import get_or_create_user_from_claims

    material_id = _extract_material_id(event.get("path", ""))
    if not material_id:
        return create_error_response(400, "material_id is required")
    
    app_user = get_or_create_user_from_claims(event.get("user", {}))
    user_id = app_user.id if app_user else None
    
    service = MaterialService()
    from shared.entitlements import enrolled, material_courses, is_admin
    if not is_admin(event.get("user", {})) and any(not user_id or not enrolled(user_id, cid) for cid in material_courses(material_id)):
        return create_error_response(403, "Registration is required to download course materials")
    result = service.get_download_url(material_id, user_id)
    
    if not result:
        return create_error_response(404, "Material not found")
    
    return create_response(200, result)
