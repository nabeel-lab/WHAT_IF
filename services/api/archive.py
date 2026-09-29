import os
import hashlib
import zipfile
import shutil
from typing import Dict, Any, Tuple

# Security limits for untrusted archive uploads
MAX_ARCHIVE_SIZE_BYTES = 50 * 1024 * 1024       # 50 MB compressed
MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024     # 250 MB uncompressed (decompression bomb protection)
MAX_ARCHIVE_FILE_COUNT = 5000                   # Max 5,000 files

class ArchiveValidationError(Exception):
    pass

class ArchiveValidator:
    """Safely inspects, validates, and extracts uploaded source archives (.ZIP). (Binary analysis remains a future capability)."""

    @staticmethod
    def calculate_hash(file_path: str) -> str:
        """Compute SHA-256 hash of the archive file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def validate_and_extract(cls, archive_path: str, extract_to: str) -> Dict[str, Any]:
        """
        Safely validates and extracts a zip archive to extract_to.
        Throws ArchiveValidationError on any security violation, malformed structure,
        or limit breach.
        """
        if not os.path.exists(archive_path):
            raise ArchiveValidationError("Archive file does not exist.")

        file_size = os.path.getsize(archive_path)
        if file_size > MAX_ARCHIVE_SIZE_BYTES:
            raise ArchiveValidationError(
                f"Archive exceeds maximum allowed size ({file_size / (1024*1024):.1f}MB > {MAX_ARCHIVE_SIZE_BYTES / (1024*1024):.1f}MB)."
            )
        if file_size == 0:
            raise ArchiveValidationError("Uploaded archive is empty (0 bytes).")

        if not zipfile.is_zipfile(archive_path):
            raise ArchiveValidationError("Uploaded file is not a valid ZIP archive or is malformed.")

        sha256_hash = cls.calculate_hash(archive_path)
        target_dir = os.path.abspath(extract_to)

        try:
            with zipfile.ZipFile(archive_path, 'r') as zf:
                # 1. Test zip integrity (CRC check)
                corrupt_file = zf.testzip()
                if corrupt_file:
                    raise ArchiveValidationError(f"Archive is corrupt: CRC check failed for file '{corrupt_file}'.")

                infolist = zf.infolist()
                if len(infolist) == 0:
                    raise ArchiveValidationError("Archive contains no files.")

                if len(infolist) > MAX_ARCHIVE_FILE_COUNT:
                    raise ArchiveValidationError(
                        f"Archive exceeds file count limit ({len(infolist)} files > {MAX_ARCHIVE_FILE_COUNT} maximum)."
                    )

                total_uncompressed = 0
                for info in infolist:
                    total_uncompressed += info.file_size
                    if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
                        raise ArchiveValidationError(
                            f"Archive uncompressed size exceeds limit ({total_uncompressed / (1024*1024):.1f}MB > {MAX_UNCOMPRESSED_BYTES / (1024*1024):.1f}MB). Possible decompression bomb."
                        )

                    filename = info.filename
                    # Security: reject null bytes
                    if "\x00" in filename:
                        raise ArchiveValidationError("Path traversal detected: archive contains null byte in filename.")

                    # Security: check for path traversal (Zip Slip)
                    # Disallow absolute paths
                    if filename.startswith("/") or filename.startswith("\\") or (len(filename) > 1 and filename[1] == ":"):
                        raise ArchiveValidationError(f"Path traversal detected: absolute path '{filename}' is forbidden.")

                    # Resolve normalized target path
                    normalized_member = os.path.normpath(filename)
                    # Split path components and check for parent directory references
                    components = normalized_member.replace("\\", "/").split("/")
                    if ".." in components:
                        raise ArchiveValidationError(f"Path traversal detected: parent directory reference in '{filename}'.")

                    dest_path = os.path.abspath(os.path.join(target_dir, normalized_member))
                    # Ensure destination is strictly inside target_dir
                    if os.path.commonpath([dest_path, target_dir]) != target_dir:
                        raise ArchiveValidationError(f"Path traversal detected: '{filename}' attempts to extract outside target directory.")

                    # Check for symbolic links or special files in external_attr (UNIX symlink has mode 0o120000)
                    unix_mode = info.external_attr >> 16
                    if unix_mode and (unix_mode & 0o170000 == 0o120000):
                        raise ArchiveValidationError(f"Security violation: archive contains forbidden symbolic link '{filename}'.")

                # Extraction step: create target directory if not exists
                os.makedirs(target_dir, exist_ok=True)
                for info in infolist:
                    normalized_member = os.path.normpath(info.filename)
                    dest_path = os.path.abspath(os.path.join(target_dir, normalized_member))
                    if info.is_dir():
                        os.makedirs(dest_path, exist_ok=True)
                    else:
                        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                        with zf.open(info) as src, open(dest_path, "wb") as dst:
                            shutil.copyfileobj(src, dst)

                return {
                    "valid": True,
                    "sha256": sha256_hash,
                    "file_count": len(infolist),
                    "compressed_bytes": file_size,
                    "uncompressed_bytes": total_uncompressed,
                    "extracted_dir": target_dir,
                }
        except zipfile.BadZipFile as e:
            raise ArchiveValidationError(f"Malformed or corrupt ZIP archive: {str(e)}")
        except ArchiveValidationError:
            raise
        except Exception as e:
            raise ArchiveValidationError(f"Failed to safely process archive: {str(e)}")
