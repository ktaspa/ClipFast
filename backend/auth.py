import os
from typing import Optional
from fastapi import Header, HTTPException


def _init_firebase() -> bool:
    """Initialize Firebase Admin SDK once. Returns True if configured."""
    import firebase_admin

    try:
        firebase_admin.get_app()
        return True
    except ValueError:
        pass

    project_id = (os.getenv("FIREBASE_ADMIN_PROJECT_ID") or "").strip()
    client_email = (os.getenv("FIREBASE_ADMIN_CLIENT_EMAIL") or "").strip()
    private_key = (os.getenv("FIREBASE_ADMIN_PRIVATE_KEY") or "").strip().replace("\\n", "\n")

    if not all([project_id, client_email, private_key]):
        return False

    from firebase_admin import credentials

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    firebase_admin.initialize_app(cred)
    return True


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """Verify Firebase ID token and return UID. Falls back to 'dev-user' when unconfigured."""
    try:
        configured = _init_firebase()
    except Exception:
        configured = False

    if not configured:
        return "dev-user"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")

    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
        uid: str = decoded["uid"]
        return uid
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
