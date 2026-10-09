import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
ALLOWED_EXT = set(MIME_TYPES.keys())
MAX_SIZE = 5 * 1024 * 1024

# Uploaded images are stored on the local filesystem. Override with UPLOAD_DIR to point
# at any folder on your machine; defaults to backend/uploads next to this file.
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR") or (Path(__file__).parent / "uploads")).resolve()


def ensure_dir():
    (UPLOAD_DIR / "products").mkdir(parents=True, exist_ok=True)
    logger.info("Local upload directory ready at %s", UPLOAD_DIR)


def _resolve(rel_path: str) -> Path:
    dest = (UPLOAD_DIR / rel_path).resolve()
    if not str(dest).startswith(str(UPLOAD_DIR)):
        raise ValueError("Invalid upload path")
    return dest


def save_file(rel_path: str, data: bytes):
    dest = _resolve(rel_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def read_file(rel_path: str) -> bytes:
    dest = _resolve(rel_path)
    if not dest.is_file():
        raise FileNotFoundError(rel_path)
    return dest.read_bytes()
