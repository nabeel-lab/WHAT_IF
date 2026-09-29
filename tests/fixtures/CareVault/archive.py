import rsa

def encrypt_data(data: bytes, pubkey: rsa.PublicKey) -> bytes:
    # This is a direct cryptographic operation
    encrypted = rsa.encrypt(data, pubkey)
    return encrypted
