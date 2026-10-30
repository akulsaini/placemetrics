
"""Semantic similarity service for Placemetrics AI.

Supports:
- sentence-transformers: all-MiniLM-L6-v2
- tfidf: deterministic, pure-Python fallback
"""

import hashlib
import math
import re
from collections import Counter
from functools import lru_cache

from app.config import settings


_active_backend: str | None = None
_model = None
_initialization_attempted = False


# A compact English stopword set for the deterministic TF-IDF implementation.
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for",
    "from", "has", "have", "in", "is", "it", "of", "on", "or",
    "our", "that", "the", "their", "this", "to", "we", "will",
    "with", "you", "your", "who", "which", "was", "were",
}


def initialize_embeddings() -> str:
    """Initialize the configured embedding backend once."""
    global _active_backend, _model, _initialization_attempted

    if _initialization_attempted:
        return get_embedding_backend()

    _initialization_attempted = True
    requested = settings.embedding_backend.strip().lower()

    if requested not in {"auto", "tfidf", "sentence-transformers"}:
        raise ValueError(
            "EMBEDDING_BACKEND must be auto, tfidf, or sentence-transformers"
        )

    if requested == "tfidf":
        _active_backend = "tfidf"
        return _active_backend

    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2")
        _active_backend = "sentence-transformers"

    except Exception as exc:
        _model = None

        if requested == "sentence-transformers":
            _initialization_attempted = False
            raise RuntimeError(
                "Could not initialize sentence-transformers. "
                "Check installation and model availability."
            ) from exc

        # Auto mode safely falls back to deterministic TF-IDF.
        _active_backend = "tfidf"

    return _active_backend


def get_embedding_backend() -> str:
    """Return the backend currently active."""
    if _active_backend is None:
        return initialize_embeddings()

    return _active_backend


def _tokenize(text: str) -> list[str]:
    """Tokenize text according to the contract's TF-IDF rules."""
    tokens = re.findall(r"[a-z0-9+#]+", text.lower())

    return [
        token
        for token in tokens
        if (len(token) >= 2 or token == "c")
        and token not in STOPWORDS
    ]


def _make_ngrams(text: str) -> list[str]:
    """Return unigrams and adjacent bigrams."""
    tokens = _tokenize(text)

    unigrams = tokens
    bigrams = [
        f"{tokens[index]} {tokens[index + 1]}"
        for index in range(len(tokens) - 1)
    ]

    return unigrams + bigrams


def _tfidf_cosine(text_a: str, text_b: str) -> float:
    """Calculate cosine similarity using the contract's two-document TF-IDF."""
    documents = [
        Counter(_make_ngrams(text_a)),
        Counter(_make_ngrams(text_b)),
    ]

    vocabulary = set(documents[0]) | set(documents[1])

    if not vocabulary:
        return 0.0

    vectors: list[dict[str, float]] = []

    for document in documents:
        vector: dict[str, float] = {}

        for term in vocabulary:
            count = document.get(term, 0)

            if count == 0:
                continue

            document_frequency = sum(
                1 for current_document in documents
                if current_document.get(term, 0) > 0
            )

            tf = 1 + math.log(count)
            idf = math.log(3 / (1 + document_frequency)) + 1
            vector[term] = tf * idf

        magnitude = math.sqrt(
            sum(weight * weight for weight in vector.values())
        )

        if magnitude:
            vector = {
                term: weight / magnitude
                for term, weight in vector.items()
            }

        vectors.append(vector)

    similarity = sum(
        vectors[0].get(term, 0.0) * vectors[1].get(term, 0.0)
        for term in vocabulary
    )

    return max(0.0, min(1.0, similarity))


@lru_cache(maxsize=512)
def _cached_job_embedding(text_hash: str, text: str):
    """Cache job-description embeddings using a text hash as the cache key."""
    # text_hash participates in the cache key; text is the actual model input.
    return _model.encode(
        text,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )


def semantic_similarity(text_a: str, text_b: str) -> float:
    """Return cosine similarity clamped to [0, 1]."""
    backend = get_embedding_backend()

    if backend == "tfidf":
        return _tfidf_cosine(text_a, text_b)

    resume_vector = _model.encode(
        text_a,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    text_hash = hashlib.sha256(
        text_b.encode("utf-8")
    ).hexdigest()

    job_vector = _cached_job_embedding(text_hash, text_b)

    # Both vectors are normalized, so their dot product is cosine similarity.
    cosine = float(resume_vector @ job_vector)

    return max(0.0, min(1.0, cosine))
