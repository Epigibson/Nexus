"""Crypto service — handles AES-256-GCM (Fernet) encryption for secrets."""

import base64
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

# Lazy-initialize Fernet to avoid crashing the entire Lambda on import
# if ENCRYPTION_KEY is misconfigured. The error will surface when crypto
# is actually used, keeping non-crypto endpoints functional.
_fernet = None


def _get_fernet() -> Fernet:
    """Get or initialize the Fernet instance. Fails fast with a clear error."""
    global _fernet
    if _fernet is None:
        key = settings.encryption_key
        if not key:
            raise ValueError(
                "ENCRYPTION_KEY is not configured. "
                "Set it in SSM Parameter Store at /nexus/prod/encryption_key "
                "or as an environment variable."
            )
        _fernet = Fernet(key.encode('utf-8'))
    return _fernet


def encrypt_value(plain: str) -> str:
    """Encrypt a plaintext string."""
    if not plain:
        return plain
    return _get_fernet().encrypt(plain.encode('utf-8')).decode('utf-8')


def decrypt_value(cipher: str) -> str:
    """Decrypt a ciphertext string. Fallback to return the original if not a valid Fernet token."""
    if not cipher:
        return cipher
    try:
        return _get_fernet().decrypt(cipher.encode('utf-8')).decode('utf-8')
    except (InvalidToken, TypeError, ValueError):
        # We assume it's a legacy plain-text value if it can't be decrypted
        return cipher


def encrypt_dict(d: dict[str, str]) -> dict[str, str]:
    """Encrypt all values in a key-value dictionary."""
    if not d:
        return {}
    return {k: encrypt_value(v) for k, v in d.items()}


def decrypt_dict(d: dict[str, str]) -> dict[str, str]:
    """Decrypt all values in a key-value dictionary."""
    if not d:
        return {}
    return {k: decrypt_value(v) for k, v in d.items()}
