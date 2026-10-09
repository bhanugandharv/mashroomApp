import os
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from fastapi import Request, HTTPException, Response, Depends
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
COOKIE_OPTS = dict(httponly=True, secure=True, samesite="none", path="/")
USER_PROJ = {"_id": 0, "password_hash": 0}


def now():
    return datetime.now(timezone.utc)


def now_iso():
    return now().isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret():
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": now() + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now() + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: str):
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    return payload if payload.get("type") == expected_type else None


def set_auth_cookies(response: Response, user_id: str, email: str):
    response.set_cookie("access_token", create_access_token(user_id, email), max_age=900, **COOKIE_OPTS)
    response.set_cookie("refresh_token", create_refresh_token(user_id), max_age=604800, **COOKIE_OPTS)


def clear_auth_cookies(response: Response):
    for key in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(key, **COOKIE_OPTS)


def as_aware(value):
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


async def _user_from_token(token: str):
    payload = decode_token(token, "access")
    if payload:
        return await db.users.find_one({"user_id": payload["sub"]}, USER_PROJ)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session or as_aware(session["expires_at"]) < now():
        return None
    return await db.users.find_one({"user_id": session["user_id"]}, USER_PROJ)


async def get_current_user(request: Request) -> dict:
    candidates = [request.cookies.get("access_token"), request.cookies.get("session_token")]
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        candidates.append(auth_header[7:])
    for token in filter(None, candidates):
        user = await _user_from_token(token)
        if user:
            return user
    raise HTTPException(status_code=401, detail="Not authenticated")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
