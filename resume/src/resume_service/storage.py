"""
storage.py
==========
Where the original resume files live. S3 (or any S3-compatible store via
``S3_ENDPOINT_URL``) when ``S3_BUCKET`` is set; otherwise a local folder, so the
service also runs on a laptop with no AWS account. Keys are content-addressed:
``<prefix>/<sha256>.<ext>``, so the same file is stored once.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Protocol

from .settings import Settings

logger = logging.getLogger("resume.storage")

class StorageError(RuntimeError):
    pass


class Storage(Protocol):
    backend: str

    def put(self, key: str, data: bytes, content_type: str) -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...
    def presign(self, key: str, file_name: str, expires: int = 300) -> str | None: ...
    def ping(self) -> bool: ...


def object_key(prefix: str, sha256: str, kind: str) -> str:
    return f"{prefix.strip('/')}/{sha256}.{kind}"


class LocalStorage:
    backend = "local"

    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise StorageError("invalid storage key")
        return path

    def put(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def get(self, key: str) -> bytes:
        try:
            return self._path(key).read_bytes()
        except FileNotFoundError as exc:
            raise StorageError(f"file {key} not found") from exc

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def presign(self, key: str, file_name: str, expires: int = 300) -> str | None:
        return None

    def ping(self) -> bool:
        return self.root.exists()


class S3Storage:
    backend = "s3"

    def __init__(self, bucket: str, region: str | None, endpoint_url: str | None) -> None:
        import boto3
        from botocore.config import Config

        self.bucket = bucket
        self.client = boto3.client(
            "s3", region_name=region, endpoint_url=endpoint_url,
            config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"},
                          connect_timeout=5, read_timeout=30))

    def put(self, key: str, data: bytes, content_type: str) -> None:
        try:
            self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type,
                                   ServerSideEncryption="AES256")
        except Exception as exc:
            raise StorageError(f"S3 upload failed: {exc}") from exc

    def get(self, key: str) -> bytes:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except Exception as exc:
            raise StorageError(f"S3 download failed: {exc}") from exc

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except Exception as exc:
            raise StorageError(f"S3 delete failed: {exc}") from exc

    def presign(self, key: str, file_name: str, expires: int = 300) -> str | None:
        return self.client.generate_presigned_url(
            "get_object", ExpiresIn=expires,
            Params={"Bucket": self.bucket, "Key": key,
                    "ResponseContentDisposition": f'inline; filename="{file_name}"'})

    def ping(self) -> bool:
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return True
        except Exception as exc:
            logger.warning("S3 bucket %s not reachable: %s", self.bucket, exc)
            return False


def make_storage(settings: Settings) -> Storage:
    if settings.s3_bucket:
        return S3Storage(settings.s3_bucket, settings.s3_region, settings.s3_endpoint_url)
    return LocalStorage(settings.storage_dir)
