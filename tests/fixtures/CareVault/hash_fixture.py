import hashlib

def hash_password(password: str) -> str:
    h = hashlib.sha256()
    h.update(password.encode('utf-8'))
    return h.hexdigest()
