from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def encrypt_symmetric(key, iv, data):
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    return encryptor.update(data) + encryptor.finalize()
