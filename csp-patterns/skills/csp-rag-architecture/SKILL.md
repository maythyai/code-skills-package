---
name: csp-rag-architecture
description: Production RAG architecture patterns covering chunking strategies, embedding model selection, vector databases, hybrid search, reranking, evaluation, and operational concerns. Use when designing, building, reviewing, or optimizing retrieval-augmented generation systems.
metadata:
  origin: CSP
layer: 4
category: patterns
-------|-----------|------------|----------|------|-------|
| OpenAI text-embedding-3-large | 3072 (reducible) | 8191 | 64.6 | $0.13/1M tokens | Best general-purpose, supports dimension reduction |
| OpenAI text-embedding-3-small | 1536 | 8191 | 62.3 | $0.02/1M tokens | Good cost/performance ratio |
| Cohere embed-v3 | 1024 | 512 | 64.1 | $0.10/1M tokens | Multi-language, search_document vs search_query types |
| BGE-M3 | 1024 | 8192 | 63.8 | Free (self-host) | Multi-language, multi-granularity, requires GPU |
| GTE-Qwen2 | 1024 | 8192 | 67.3 | Free (self-host) | State of the art, 7B parameters |
| Nomic-embed-text | 768 | 8192 | 62.4 | Free (self-host) | Lightweight, good for CPU-only setups |

### Selection Criteria

```python
# Decision matrix for embedding model selection
EMBEDDING_SELECTION = {
    "quick_prototype": {
        "model": "text-embedding-3-small",
        "reason": "Low cost, fast, easy to swap later",
    },
    "production_general": {
        "model": "text-embedding-3-large",
        "reason": "Best quality/cost for English, dimension reduction for storage savings",
    },
    "multilingual": {
        "model": "BGE-M3 or Cohere embed-v3",
        "reason": "Strong cross-language retrieval, handles mixed-language docs",
    },
    "cost_sensitive_high_volume": {
        "model": "Nomic-embed-text (self-hosted)",
        "reason": "No per-token cost, runs on CPU, good for millions of documents",
    },
    "code_embedding": {
        "model": "Voyage-code-3 or CodeBERT",
        "reason": "Trained on code, understands syntax and semantics better than text models",
    },
}
```

### Asymmetric Embeddings

For query-document retrieval, use different embedding prefixes or models for queries vs documents:

```python
from openai import OpenAI

client = OpenAI()


def embed_query(query: str) -> list[float]:
    """Embed a search query with the query-specific instruction."""
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=query,
        dimensions=1024,
    )
    return response.data[0].embedding


def embed_document(document: str) -> list[float]:
    """Embed a document chunk.

    Some models (Cohere, BGE) use explicit query vs document prefixes:
    - Cohere: input_type="search_document" vs "search_query"
    - BGE: prepend "Represent this sentence for searching relevant passages: " to queries
    """
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=document,
        dimensions=1024,
    )
    return response.data[0].embedding
```

## Vector Database Selection

### Comparison

| Database | Best For | Scaling | Key Feature |
|----------|---------|---------|-------------|
| pgvector | Existing PostgreSQL users, small-to-medium datasets | Single node | Zero new infrastructure, ACID, joins with relational data |
| Milvus | Large-scale, multi-tenant, GPU-accelerated | Horizontal | Purpose-built, supports billions of vectors, rich indexing |
| Pinecone | Managed service, fast time-to-production | Managed | Serverless, no ops, namespace isolation |
| Weaviate | Semantic search with structured filters | Horizontal | GraphQL API, built-in vectorization modules |
| Qdrant | Rust performance, rich filtering | Horizontal | Payload filtering, on-disk storage, good resource efficiency |

### pgvector Integration

```python
import psycopg
from pgvector.psycopg import register_vector


def setup_pgvector(conn: psycopg.Connection) -> None:
    """Initialize pgvector schema and index."""
    register_vector(conn)
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                source_url TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                chunk_index INT NOT NULL,
                embedding VECTOR(1024),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        # IVFFlat index for approximate nearest neighbor search
        # Build after inserting data for better performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_docs_embedding
            ON documents
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
        # HNSW index alternative (better recall, more memory)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_docs_embedding_hnsw
            ON documents
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        """)
    conn.commit()


def insert_chunks(
    conn: psycopg.Connection,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    """Batch insert document chunks with embeddings."""
    with conn.cursor() as cur:
        for chunk, embedding in zip(chunks, embeddings):
            cur.execute(
                """
                INSERT INTO documents (source_url, chunk_text, chunk_index, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    chunk["source_url"],
                    chunk["text"],
                    chunk["index"],
                    embedding,
                    chunk.get("metadata", {}),
                ),
            )
    conn.commit()


def search_similar(
    conn: psycopg.Connection,
    query_embedding: list[float],
    top_k: int = 10,
    filter_metadata: dict | None = None,
) -> list[dict]:
    """Find similar documents by cosine distance."""
    with conn.cursor() as cur:
        query = """
            SELECT id, source_url, chunk_text, metadata,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM documents
        """
        params: list = [query_embedding]

        if filter_metadata:
            conditions = []
            for key, value in filter_metadata.items():
                conditions.append(f"metadata->>'{key}' = %s")
                params.append(str(value))
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY embedding <=> %s::vector LIMIT %s"
        params.extend([query_embedding, top_k])

        cur.execute(query, params)
        return [
            {
                "id": row[0],
                "source_url": row[1],
                "chunk_text": row[2],
                "metadata": row[3],
                "similarity": float(row[4]),
            }
            for row in cur.fetchall()
        ]
```

### Qdrant Integration

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)


def setup_qdrant(client: QdrantClient, collection_name: str) -> None:
    """Create a Qdrant collection with payload indexing."""
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
    )
    # Create payload indexes for filtering
    for field in ["source", "doc_type", "language"]:
        client.create_payload_index(
            collection_name=collection_name,
            field_name=field,
            field_schema="keyword",
        )


def upsert_points(
    client: QdrantClient,
    collection_name: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    """Upsert document chunks as Qdrant points."""
    points = [
        PointStruct(
            id=i,
            vector=embedding,
            payload={
                "text": chunk["text"],
                "source": chunk["source"],
                "doc_type": chunk.get("doc_type", "unknown"),
                "chunk_index": chunk["index"],
            },
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    client.upsert(collection_name=collection_name, points=points)


def search_with_filter(
    client: QdrantClient,
    collection_name: str,
    query_embedding: list[float],
    top_k: int = 10,
    source_filter: str | None = None,
) -> list[dict]:
    """Search with optional payload filtering."""
    query_filter = None
    if source_filter:
        query_filter = Filter(must=[
            FieldCondition(key="source", match=MatchValue(value=source_filter))
        ])

    results = client.search(
        collection_name=collection_name,
        query_vector=query_embedding,
        query_filter=query_filter,
        limit=top_k,
    )
    return [
        {
            "id": r.id,
            "score": r.score,
            "text": r.payload["text"],
            "source": r.payload["source"],
        }
        for r in results
    ]
```

## Hybrid Search (BM25 + Vector)

Combine lexical matching (BM25) with semantic similarity for better retrieval on queries with exact terms, product names, or technical identifiers.

```python
from dataclasses import dataclass

from rank_bm25 import BM25Okapi


@dataclass
class HybridResult:
    doc_id: str
    text: str
    combined_score: float
    vector_score: float
    bm25_score: float


def reciprocal_rank_fusion(
    vector_results: list[dict],
    bm25_results: list[dict],
    k: int = 60,
    vector_weight: float = 0.7,
) -> list[HybridResult]:
    """Merge vector and BM25 results using Reciprocal Rank Fusion (RRF).

    RRF score = sum(1 / (k + rank_i)) for each ranking list.
    This is robust to score scale differences between retrievers.
    """
    scores: dict[str, dict] = {}

    for rank, result in enumerate(vector_results):
        doc_id = result["id"]
        if doc_id not in scores:
            scores[doc_id] = {"text": result["text"], "vector": 0.0, "bm25": 0.0}
        scores[doc_id]["vector"] += vector_weight / (k + rank + 1)

    for rank, result in enumerate(bm25_results):
        doc_id = result["id"]
        if doc_id not in scores:
            scores[doc_id] = {"text": result["text"], "vector": 0.0, "bm25": 0.0}
        scores[doc_id]["bm25"] += (1 - vector_weight) / (k + rank + 1)

    results = [
        HybridResult(
            doc_id=doc_id,
            text=data["text"],
            combined_score=data["vector"] + data["bm25"],
            vector_score=data["vector"],
            bm25_score=data["bm25"],
        )
        for doc_id, data in scores.items()
    ]
    results.sort(key=lambda r: r.combined_score, reverse=True)
    return results


class HybridSearcher:
    """Combines BM25 lexical search with vector similarity search."""

    def __init__(self, documents: list[dict], embeddings: list[list[float]]):
        self.documents = documents
        self.embeddings = embeddings
        # Tokenize for BM25 (use a proper tokenizer for production)
        tokenized = [doc["text"].lower().split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized)

    def bm25_search(self, query: str, top_k: int = 20) -> list[dict]:
        tokens = query.lower().split()
        scores = self.bm25.get_scores(tokens)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        return [
            {"id": self.documents[i]["id"], "text": self.documents[i]["text"], "score": float(scores[i])}
            for i in top_indices
        ]

    def search(
        self,
        query: str,
        query_embedding: list[float],
        top_k: int = 10,
        bm25_top_k: int = 20,
        vector_top_k: int = 20,
    ) -> list[HybridResult]:
        """Run hybrid search with RRF fusion."""
        bm25_results = self.bm25_search(query, top_k=bm25_top_k)
        # Vector search would be delegated to your vector DB
        vector_results = [
            {"id": self.documents[i]["id"], "text": self.documents[i]["text"]}
            for i in range(min(vector_top_k, len(self.documents)))
        ]
        return reciprocal_rank_fusion(vector_results, bm25_results)[:top_k]
```

## Reranking

Use a cross-encoder or reranking API to rescore initial retrieval results for higher precision.

```python
from cohere import Client as CohereClient


def rerank_cohere(
    cohere_client: CohereClient,
    query: str,
    documents: list[str],
    top_n: int = 5,
    model: str = "rerank-v3.5",
) -> list[dict]:
    """Rerank documents using Cohere's reranking API.

    Rerankers score (query, document) pairs directly, providing much higher
    precision than embedding similarity alone. Use after initial retrieval
    to refine the top-K results.
    """
    response = cohere_client.rerank(
        model=model,
        query=query,
        documents=documents,
        top_n=top_n,
        return_documents=True,
    )
    return [
        {
            "index": result.index,
            "text": result.document.text,
            "relevance_score": result.relevance_score,
        }
        for result in response.results
    ]


def rerank_cross_encoder(
    model_name: str,
    query: str,
    documents: list[str],
    top_n: int = 5,
) -> list[dict]:
    """Rerank using a self-hosted cross-encoder model.

    Cross-encoders process (query, document) pairs through a transformer,
    producing a relevance score. More flexible than API rerankers but
    requires GPU for acceptable latency.
    """
    from sentence_transformers import CrossEncoder

    model = CrossEncoder(model_name)  # e.g., "cross-encoder/ms-marco-MiniLM-L-6-v2"
    pairs = [[query, doc] for doc in documents]
    scores = model.predict(pairs)

    scored = sorted(
        enumerate(scores),
        key=lambda x: x[1],
        reverse=True,
    )[:top_n]

    return [
        {"index": idx, "text": documents[idx], "relevance_score": float(score)}
        for idx, score in scored
    ]
```

### Two-Stage Retrieval Pipeline

```python
class RetrievalPipeline:
    """Production two-stage retrieval: retrieve broadly, then rerank."""

    def __init__(
        self,
        vector_store,  # Your vector DB client
        reranker,  # Cohere client or CrossEncoder
        retrieve_k: int = 50,
        rerank_k: int = 5,
    ):
        self.vector_store = vector_store
        self.reranker = reranker
        self.retrieve_k = retrieve_k
        self.rerank_k = rerank_k

    async def retrieve(self, query: str, query_embedding: list[float]) -> list[dict]:
        """Stage 1: Broad retrieval from vector store."""
        candidates = await self.vector_store.search(
            query_embedding=query_embedding,
            top_k=self.retrieve_k,
        )
        return candidates

    async def rerank(self, query: str, candidates: list[dict]) -> list[dict]:
        """Stage 2: Rerank candidates for precision."""
        texts = [c["text"] for c in candidates]
        reranked = rerank_cohere(
            cohere_client=self.reranker,
            query=query,
            documents=texts,
            top_n=self.rerank_k,
        )
        # Map reranked results back to full candidate metadata
        return [
            {**candidates[r["index"]], "rerank_score": r["relevance_score"]}
            for r in reranked
        ]

    async def search(self, query: str, query_embedding: list[float]) -> list[dict]:
        """Full two-stage retrieval pipeline."""
        candidates = await self.retrieve(query, query_embedding)
        if not candidates:
            return []
        return await self.rerank(query, candidates)
```

## Evaluation

### Retrieval Quality Metrics

```python
from dataclasses import dataclass


@dataclass
class RetrievalMetrics:
    recall_at_k: dict[int, float]
    mrr: float  # Mean Reciprocal Rank
    ndcg_at_k: dict[int, float]
    precision_at_k: dict[int, float]


def evaluate_retrieval(
    queries: list[dict],  # {"query": str, "relevant_ids": list[str]}
    retriever,  # Callable that returns list of result dicts with "id"
    k_values: list[int] | None = None,
) -> RetrievalMetrics:
    """Evaluate retrieval quality on a labeled dataset.

    Build this dataset from:
    - User feedback (thumbs up/down on answers)
    - Expert annotation of query-document pairs
    - Click-through data on source citations
    - LLM-as-judge relevance scoring
    """
    if k_values is None:
        k_values = [1, 3, 5, 10, 20]

    recalls = {k: [] for k in k_values}
    precisions = {k: [] for k in k_values}
    ndcgs = {k: [] for k in k_values}
    reciprocal_ranks = []

    for q in queries:
        relevant = set(q["relevant_ids"])
        results = retriever(q["query"])
        result_ids = [r["id"] for r in results]

        # Recall@K
        for k in k_values:
            retrieved_k = set(result_ids[:k])
            if relevant:
                recalls[k].append(len(retrieved_k & relevant) / len(relevant))
                precisions[k].append(len(retrieved_k & relevant) / k)
            else:
                recalls[k].append(1.0 if not retrieved_k else 0.0)
                precisions[k].append(0.0)

        # NDCG@K
        for k in k_values:
            dcg = 0.0
            for i, rid in enumerate(result_ids[:k]):
                rel = 1.0 if rid in relevant else 0.0
                dcg += rel / (i + 1)  # log2(i + 2) in standard NDCG
            idcg = sum(1.0 / (i + 1) for i in range(min(len(relevant), k)))
            ndcgs[k].append(dcg / idcg if idcg > 0 else 1.0)

        # MRR
        rr = 0.0
        for i, rid in enumerate(result_ids):
            if rid in relevant:
                rr = 1.0 / (i + 1)
                break
        reciprocal_ranks.append(rr)

    return RetrievalMetrics(
        recall_at_k={k: sum(v) / len(v) for k, v in recalls.items()},
        mrr=sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0,
        ndcg_at_k={k: sum(v) / len(v) for k, v in ndcgs.items()},
        precision_at_k={k: sum(v) / len(v) for k, v in precisions.items()},
    )
```

### Answer Faithfulness Evaluation

```python
from openai import OpenAI

FAITHFULNESS_PROMPT = """Evaluate whether the answer is faithful to the provided context.

Context:
{context}

Question: {question}

Answer: {answer}

Rate the answer on these dimensions (1-5 scale):
1. groundedness: Every claim in the answer is supported by the context
2. completeness: The answer addresses the question using available context
3. relevance: The answer directly addresses what was asked

Respond as JSON: {{"groundedness": N, "completeness": N, "relevance": N, "reasoning": "..."}}"""


def evaluate_faithfulness(
    client: OpenAI,
    question: str,
    answer: str,
    context: str,
    model: str = "gpt-4o",
) -> dict:
    """Use an LLM judge to evaluate answer faithfulness.

    For production evaluation pipelines, use:
    - RAGAS framework for comprehensive RAG metrics
    - DeepEval for unit-test-style RAG evaluation
    - TruLens for observability-linked evaluation
    """
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": FAITHFULNESS_PROMPT.format(
            context=context, question=question, answer=answer,
        )}],
        response_format={"type": "json_object"},
    )
    import json
    return json.loads(response.choices[0].message.content)
```

## Production Concerns

### Caching Strategy

```python
import hashlib
import json
from functools import lru_cache

import redis


class RAGCache:
    """Multi-level caching for RAG systems.

    L1: In-memory LRU for hot queries (sub-ms)
    L2: Redis for warm queries (single-digit ms)
    L3: Semantic cache for similar queries (embedding similarity)
    """

    def __init__(self, redis_client: redis.Redis, semantic_threshold: float = 0.95):
        self.redis = redis_client
        self.semantic_threshold = semantic_threshold
        self._memory_cache: dict[str, str] = {}
        self._memory_limit = 1000

    def _query_key(self, query: str, filters: dict | None = None) -> str:
        """Deterministic cache key from query and filters."""
        key_data = json.dumps({"q": query, "f": filters or {}}, sort_keys=True)
        return hashlib.sha256(key_data.encode()).hexdigest()

    async def get(self, query: str, filters: dict | None = None) -> str | None:
        key = self._query_key(query, filters)

        # L1: Memory
        if key in self._memory_cache:
            return self._memory_cache[key]

        # L2: Redis
        cached = await self.redis.get(f"rag:{key}")
        if cached:
            self._memory_cache[key] = cached.decode()
            return cached.decode()

        return None

    async def set(
        self,
        query: str,
        answer: str,
        filters: dict | None = None,
        ttl_seconds: int = 3600,
    ) -> None:
        key = self._query_key(query, filters)
        await self.redis.setex(f"rag:{key}", ttl_seconds, answer)
        self._memory_cache[key] = answer

        # Evict oldest memory entries if over limit
        if len(self._memory_cache) > self._memory_limit:
            oldest = next(iter(self._memory_cache))
            del self._memory_cache[oldest]
```

### Cost and Latency Budgeting

```python
from dataclasses import dataclass


@dataclass
class RAGBudget:
    """Track and enforce cost and latency budgets per query."""
    max_embedding_cost_usd: float = 0.001
    max_llm_cost_usd: float = 0.02
    max_total_latency_ms: int = 3000
    max_context_tokens: int = 4000

    def estimate_query_cost(
        self,
        query_tokens: int,
        context_tokens: int,
        response_tokens: int,
        embedding_model: str = "text-embedding-3-small",
        llm_model: str = "gpt-4o-mini",
    ) -> dict:
        """Estimate cost breakdown for a RAG query."""
        embedding_costs = {
            "text-embedding-3-small": 0.02 / 1_000_000,
            "text-embedding-3-large": 0.13 / 1_000_000,
        }
        llm_costs = {
            "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
            "gpt-4o": {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
        }

        emb_cost = query_tokens * embedding_costs.get(embedding_model, 0.02 / 1_000_000)
        llm_input_cost = (query_tokens + context_tokens) * llm_costs[llm_model]["input"]
        llm_output_cost = response_tokens * llm_costs[llm_model]["output"]

        return {
            "embedding_cost_usd": emb_cost,
            "llm_input_cost_usd": llm_input_cost,
            "llm_output_cost_usd": llm_output_cost,
            "total_cost_usd": emb_cost + llm_input_cost + llm_output_cost,
            "within_budget": (
                emb_cost <= self.max_embedding_cost_usd
                and (llm_input_cost + llm_output_cost) <= self.max_llm_cost_usd
            ),
        }
```

## Review Checklist

- [ ] Chunking strategy matches document structure and query patterns
- [ ] Embedding model selected based on language, cost, and quality requirements
- [ ] Vector database chosen for scale, operational complexity, and existing infrastructure
- [ ] Hybrid search implemented for queries requiring exact-term matching
- [ ] Reranking stage added for precision-critical applications
- [ ] Retrieval quality evaluated with labeled dataset (Recall@K, MRR, NDCG)
- [ ] Answer faithfulness evaluated for groundedness, completeness, relevance
- [ ] Caching strategy covers exact-match, semantic-match, and TTL eviction
- [ ] Cost per query budgeted and monitored (embedding + LLM input + LLM output)
- [ ] Latency budget allocated across retrieval, reranking, and generation stages
- [ ] Source citations returned with answers for user verification
- [ ] Ingestion pipeline is idempotent and handles document updates/deletions

## Anti-Patterns

- Chunking too small (loses context) or too large (dilutes relevance, wastes tokens)
- Using only vector search for queries with exact terms, IDs, or product names
- Skipping reranking when precision matters more than recall
- No evaluation dataset -- flying blind on retrieval quality
- Caching answers without invalidation when source documents change
- Sending all retrieved chunks as context without relevance filtering (wastes tokens, adds noise)
- Treating embedding similarity as a proxy for answer quality
- Ignoring cost per query until the bill arrives

## Output Expectations

When using this skill, return concrete artifacts: architecture decision records, chunking configuration, embedding model benchmark results, vector database schema, evaluation report, or cost/latency budget. Name unknowns that require benchmarking instead of guessing parameter values.
