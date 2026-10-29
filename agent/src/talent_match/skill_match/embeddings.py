"""
embeddings.py
=============
Embedding protocol, Gemini embedder, local snapshot embedder, and cosine calculations.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Protocol

import numpy as np

logger = logging.getLogger("talent_match.embeddings")

SNAPSHOT_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "data" / "snapshots" / "skill_embeddings.json"
)


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> np.ndarray: ...


class SnapshotEmbedder:
    """Loads pre-cached 768-d vectors from snapshot for offline demos and tests."""

    def __init__(self, snapshot_path: Path | str | None = None):
        self.vectors: dict[str, list[float]] = {}
        path = Path(snapshot_path) if snapshot_path else SNAPSHOT_PATH
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self.vectors = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load snapshot embeddings from {path}: {e}")

    def embed(self, texts: list[str]) -> np.ndarray:
        embeddings = []
        for t in texts:
            key = t.strip().lower()
            if key in self.vectors:
                embeddings.append(self.vectors[key])
            else:
                # Deterministic pseudo-vector for zero-shot test resilience if not found
                # Based on string hash
                rng = np.random.RandomState(abs(hash(key)) % (2**31))
                vec = rng.randn(768).astype(np.float32)
                vec = vec / (np.linalg.norm(vec) + 1e-9)
                embeddings.append(vec.tolist())
        return np.array(embeddings, dtype=np.float32)


class GeminiEmbedder:
    """Embeds text using Google Generative AI (models/gemini-embedding-001, 768 dimensions)."""

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or os.getenv("EMBED_MODEL", "models/gemini-embedding-001")
        self.snapshot = SnapshotEmbedder()
        self._client = None
        self._disabled = os.getenv("SKILL_MATCH_USE_EMBEDDINGS", "true").lower() in ("false", "0", "no")

    def _get_client(self):
        if self._disabled:
            return None
        if self._client is None and os.getenv("GOOGLE_API_KEY"):
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings

                self._client = GoogleGenerativeAIEmbeddings(
                    model=self.model_name,
                    google_api_key=os.getenv("GOOGLE_API_KEY"),
                )
            except Exception as e:
                logger.warning(f"Could not initialize GoogleGenerativeAIEmbeddings: {e}")
                self._client = None
        return self._client

    def embed(self, texts: list[str]) -> np.ndarray:
        client = self._get_client()
        if client:
            try:
                raw_vecs = client.embed_documents(texts)
                arr = np.array(raw_vecs, dtype=np.float32)
                norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-9
                return arr / norms
            except Exception as e:
                logger.warning(f"Gemini embedder call failed, falling back to snapshot: {e}")
        return self.snapshot.embed(texts)


def cosine_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """
    Computes pairwise cosine similarity between matrices A (N x D) and B (M x D).
    Assumes vectors are L2 normalized or normalizes them.
    Returns (N x M) matrix.
    """
    if a.size == 0 or b.size == 0:
        return np.zeros((a.shape[0], b.shape[0]), dtype=np.float32)

    norm_a = np.linalg.norm(a, axis=1, keepdims=True) + 1e-9
    norm_b = np.linalg.norm(b, axis=1, keepdims=True) + 1e-9

    a_norm = a / norm_a
    b_norm = b / norm_b

    return np.matmul(a_norm, b_norm.T)
