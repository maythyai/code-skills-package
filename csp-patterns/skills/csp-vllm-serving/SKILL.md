---
name: csp-vllm-serving
description: Production vLLM inference serving patterns covering Docker setup, continuous batching, PagedAttention, tensor parallelism, OpenAI-compatible APIs, LoRA multiplexing, quantization, performance tuning, health checks, Kubernetes scaling, and multi-model serving. Use when deploying, optimizing, or operating LLM inference with vLLM.
metadata:
  origin: CSP
---

# vLLM Inference Serving

Use this skill to deploy, optimize, and operate high-throughput LLM inference with vLLM, covering single-GPU setups through multi-node Kubernetes clusters with LoRA multiplexing and quantized models.

## When to Activate

- Setting up vLLM for the first time, locally or in production
- Configuring tensor parallelism for multi-GPU serving
- Deploying LoRA adapters with model multiplexing
- Tuning performance parameters (max_num_seqs, gpu_memory_utilization, chunked prefill)
- Building OpenAI-compatible API servers with authentication and rate limiting
- Setting up health checks, monitoring, and autoscaling on Kubernetes
- Choosing quantization strategies (AWQ, GPTQ, FP8) for memory savings
- Operating multi-model serving with dynamic adapter loading

## Related Skills

- `docker-patterns` for container image optimization and multi-stage builds
- `deployment-patterns` for production deployment strategies
- `csp-llm-app-development` for client-side patterns that consume the vLLM API
- `csp-rag-architecture` for embedding model serving alongside LLM inference

## Quick Setup

### Docker (Recommended)

```dockerfile
# Dockerfile for vLLM serving
FROM vllm/vllm-openai:latest

# Pre-download model during build to avoid cold-start download
ENV MODEL_NAME="meta-llama/Llama-3.1-8B-Instruct"
ENV HUGGING_FACE_HUB_TOKEN=""

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

ENTRYPOINT ["python", "-m", "vllm.entrypoints.openai.api_server"]
CMD [ \
    "--model", "${MODEL_NAME}", \
    "--host", "0.0.0.0", \
    "--port", "8000", \
    "--max-model-len", "8192", \
    "--gpu-memory-utilization", "0.90", \
    "--max-num-seqs", "256", \
    "--trust-remote-code" \
]
```

```yaml
# docker-compose.yml for local development
services:
  vllm:
    build: .
    ports:
      - "8000:8000"
    environment:
      - HUGGING_FACE_HUB_TOKEN=${HF_TOKEN}
      - MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct
    volumes:
      - ~/.cache/huggingface:/root/.cache/huggingface
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      start_period: 120s
      retries: 3
```

### Direct CLI Launch

```bash
# Basic single-GPU serving
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.90

# Multi-GPU with tensor parallelism
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 4 \
    --max-model-len 16384 \
    --gpu-memory-utilization 0.92 \
    --max-num-seqs 128 \
    --enable-chunked-prefill \
    --scheduler-delay-factor 0.1

# With quantization
python -m vllm.entrypoints.openai.api_server \
    --model TheBloke/Llama-2-70B-Chat-AWQ \
    --quantization awq \
    --tensor-parallel-size 2 \
    --max-model-len 4096
```

## Model Loading and Warm-up

```python
import time
from openai import OpenAI


def wait_for_model_ready(
    base_url: str = "http://localhost:8000/v1",
    timeout_seconds: int = 600,
    poll_interval: int = 10,
) -> bool:
    """Wait for vLLM server to be ready and model loaded.

    vLLM downloads and loads the model on first request or startup.
    The /health endpoint returns 200 once the model is ready to serve.
    """
    import requests

    health_url = base_url.replace("/v1", "/health")
    start = time.time()

    while time.time() - start < timeout_seconds:
        try:
            resp = requests.get(health_url, timeout=5)
            if resp.status_code == 200:
                return True
        except requests.ConnectionError:
            pass
        time.sleep(poll_interval)

    return False


def warmup_model(
    client: OpenAI,
    model: str,
    warmup_prompts: list[str] | None = None,
) -> dict:
    """Send warmup requests to pre-fill CUDA kernels and JIT caches.

    vLLM uses lazy compilation on first inference. Warmup requests
    ensure the first real request doesn't pay the compilation penalty.
    """
    if warmup_prompts is None:
        warmup_prompts = [
            "Hello, this is a warmup request.",
            "Generate a short paragraph about machine learning.",
            "What is 2 + 2?",
        ]

    latencies = []
    for prompt in warmup_prompts:
        start = time.time()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
            temperature=0,
        )
        latencies.append(time.time() - start)

    return {
        "warmup_count": len(warmup_prompts),
        "avg_latency_s": sum(latencies) / len(latencies),
        "max_latency_s": max(latencies),
        "min_latency_s": min(latencies),
    }
```

## Core Concepts

### Continuous Batching

Unlike static batching (waits for a full batch), vLLM uses continuous batching: new requests join the batch as running requests complete. This maximizes throughput without adding latency.

```text
Time →
Request A: ████████████████████░░░░  (generating, then completes)
Request B: ░░░░░░████████████████████ (joins mid-batch after A frees a slot)
Request C: ░░░░░░░░░░████████████████ (joins after another slot opens)

Result: GPU is always fully utilized, no waiting for batch to fill.
```

### PagedAttention

vLLM manages KV cache as virtual memory pages, avoiding pre-allocation of maximum sequence length for every request.

```text
Traditional: Pre-allocate max_seq_len KV cache per request (wastes 60-80% memory)
PagedAttention: Allocate KV cache in small blocks, like OS virtual memory

  Request 1: [Page 0] [Page 1] [Page 3]     (3 pages × 16 tokens = 48 tokens used)
  Request 2: [Page 2] [Page 4]                (2 pages × 16 tokens = 32 tokens used)
  Free pool: [Page 5] [Page 6] [Page 7] ...

  Memory waste: <4% (one partial page per request) vs 60-80% with pre-allocation
```

### Tensor Parallelism

Split model layers across multiple GPUs for models too large for a single GPU.

```text
70B model, 4 GPUs (tensor-parallel-size=4):

  GPU 0: Layers 0-19,  Embedding shard 0,  LM head shard 0
  GPU 1: Layers 20-39, Embedding shard 1,  LM head shard 1
  GPU 2: Layers 40-59, Embedding shard 2,  LM head shard 2
  GPU 3: Layers 60-79, Embedding shard 3,  LM head shard 3

  All-reduce communication between GPUs at each layer boundary.
  Requires NVLink or high-bandwidth interconnect for good performance.
```

## OpenAI-Compatible API Server

```python
from openai import OpenAI

# vLLM exposes a drop-in OpenAI-compatible API
client = OpenAI(
    base_url="http://your-vllm-host:8000/v1",
    api_key="not-needed",  # vLLM doesn't require API keys by default
)

# Chat completion
response = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain PagedAttention in one paragraph."},
    ],
    temperature=0.7,
    max_tokens=256,
    top_p=0.9,
)

# Streaming
stream = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[{"role": "user", "content": "Write a haiku about GPUs."}],
    stream=True,
)
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)

# Completions (non-chat)
completion = client.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    prompt="def fibonacci(n):",
    max_tokens=128,
    stop=["\n\n"],
)
```

### Adding Authentication

```python
# Launch vLLM with API key authentication
# python -m vllm.entrypoints.openai.api_server \
#     --model meta-llama/Llama-3.1-8B-Instruct \
#     --api-key your-secret-key

# Client usage with auth
client = OpenAI(
    base_url="http://your-vllm-host:8000/v1",
    api_key="your-secret-key",
)
```

### Rate Limiting with Reverse Proxy

```nginx
# nginx.conf for rate limiting in front of vLLM
upstream vllm_backend {
    server vllm-1:8000;
    server vllm-2:8000;
    keepalive 32;
}

# Rate limit by API key
limit_req_zone $http_authorization zone=api_limit:10m rate=60r/m;

server {
    listen 443 ssl;

    location /v1/ {
        limit_req zone=api_limit burst=10 nodelay;
        proxy_pass http://vllm_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_read_timeout 300s;  # Long timeout for generation
        proxy_buffering off;      # Required for streaming
        proxy_cache off;
    }

    location /health {
        proxy_pass http://vllm_backend/health;
        proxy_read_timeout 5s;
    }
}
```

## LoRA Model Multiplexing

Serve multiple fine-tuned adapters on a single base model, loading and unloading dynamically.

```python
# Launch vLLM with LoRA support
# python -m vllm.entrypoints.openai.api_server \
#     --model meta-llama/Llama-3.1-8B-Instruct \
#     --enable-lora \
#     --lora-modules \
#         code-review=/models/lora/code-review \
#         summarizer=/models/lora/summarizer \
#         sql-generator=/models/lora/sql-generator \
#     --max-lora-rank 64 \
#     --max-loras 4

from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="x")

# Use a specific LoRA adapter by name
response = client.chat.completions.create(
    model="code-review",  # Routes to the code-review LoRA adapter
    messages=[
        {"role": "user", "content": "Review this function:\ndef add(a, b): return a + b"},
    ],
    max_tokens=256,
)

# Different adapter for a different task
summary = client.chat.completions.create(
    model="summarizer",
    messages=[
        {"role": "user", "content": "Summarize: [long document here]"},
    ],
    max_tokens=512,
)
```

### Dynamic LoRA Loading via API

```python
import requests

VLLM_URL = "http://localhost:8000"


def load_lora_adapter(name: str, model_path: str) -> dict:
    """Dynamically load a LoRA adapter at runtime without restarting vLLM."""
    response = requests.post(
        f"{VLLM_URL}/v1/load_lora_adapter",
        json={
            "lora_name": name,
            "lora_path": model_path,
        },
    )
    response.raise_for_status()
    return response.json()


def unload_lora_adapter(name: str) -> dict:
    """Unload a LoRA adapter to free GPU memory."""
    response = requests.post(
        f"{VLLM_URL}/v1/unload_lora_adapter",
        json={"lora_name": name},
    )
    response.raise_for_status()
    return response.json()


def list_lora_adapters() -> list[str]:
    """List currently loaded LoRA adapters."""
    response = requests.get(f"{VLLM_URL}/v1/models")
    response.raise_for_status()
    models = response.json()["data"]
    return [m["id"] for m in models]
```

## Quantization

| Method | Precision | Memory Savings | Quality Loss | Calibration Required |
|--------|-----------|----------------|--------------|---------------------|
| AWQ | 4-bit | ~4x | Minimal | Yes (small dataset) |
| GPTQ | 4-bit | ~4x | Low | Yes (calibration set) |
| FP8 (E4M3) | 8-bit float | ~2x | Negligible | No (dynamic) or Yes (static) |
| bitsandbytes | 4/8-bit | 2-4x | Low | No |
| GGUF | Various | 2-6x | Varies | No |

### AWQ Quantization

```python
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer


def quantize_awq(
    model_name: str,
    output_dir: str,
    calibration_data: list[str],
    w_bit: int = 4,
    q_group_size: int = 128,
) -> None:
    """Quantize a model to AWQ format for vLLM serving.

    AWQ (Activation-aware Weight Quantization) preserves accuracy by
    identifying and protecting salient weight channels during quantization.
    """
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoAWQForCausalLM.from_pretrained(
        model_name,
        safetensors=True,
        trust_remote_code=True,
    )

    model.quantize(
        tokenizer,
        quant_config={
            "w_bit": w_bit,
            "q_group_size": q_group_size,
            "zero_point": True,
            "version": "GEMM",
        },
        calib_data=calibration_data,
    )

    model.save_quantized(output_dir)
    tokenizer.save_pretrained(output_dir)
```

### FP8 Quantization (vLLM native)

```bash
# FP8 dynamic quantization (no calibration needed)
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-70B-Instruct \
    --quantization fp8 \
    --tensor-parallel-size 4 \
    --gpu-memory-utilization 0.90

# FP8 static quantization (better performance, requires calibration)
# First, calibrate with:
# python -m vllm.calibrate --model meta-llama/Llama-3.1-70B-Instruct --output-dir /models/fp8-calibrated
# Then serve:
python -m vllm.entrypoints.openai.api_server \
    --model /models/fp8-calibrated \
    --quantization fp8 \
    --tensor-parallel-size 4
```

## Performance Tuning

### Key Parameters Reference

```yaml
# vllm-config.yaml — Production tuning reference
parameters:
  gpu_memory_utilization:
    default: 0.90
    range: [0.5, 0.98]
    notes: >
      Fraction of GPU memory for KV cache. Higher = more concurrent requests.
      Set to 0.90-0.95 for dedicated inference. Lower if sharing GPU with other workloads.
      Too high (>0.95) risks OOM on memory fragmentation.

  max_num_seqs:
    default: 256
    range: [1, 512]
    notes: >
      Maximum concurrent sequences in a batch. Higher = more throughput,
      more KV cache memory. Reduce for long-context workloads where each
      sequence consumes significant memory.

  max_model_len:
    default: model_max_position_embeddings
    notes: >
      Maximum sequence length. Set explicitly to limit memory usage.
      Requests exceeding this length are rejected. For 8B models on
      a single 80GB GPU: 8192 tokens is comfortable, 32768 is tight.

  enable_chunked_prefill:
    default: true
    notes: >
      Process long prefill prompts in chunks to avoid blocking decode
      requests. Critical for mixed workloads with varying input lengths.

  enable_prefix_caching:
    default: false
    notes: >
      Cache KV cache for shared prefixes (system prompts, few-shot examples).
      Huge win for applications with repeated system prompts.

  scheduler_delay_factor:
    default: 0.0
    range: [0.0, 0.5]
    notes: >
      Delay scheduling to allow more requests to batch together.
      0.1-0.2 can improve throughput at slight latency cost.

  swap_space:
    default: 4  # GB
    notes: >
      CPU swap space for KV cache eviction under memory pressure.
      Useful for bursty traffic. Set to 0 to disable swapping.

  enforce_eager:
    default: false
    notes: >
      Disable CUDA graph capture. Use only for debugging; CUDA graphs
      provide 10-30% throughput improvement by eliminating kernel launch overhead.
```

### Throughput vs Latency Tuning

```python
import time
from concurrent.futures import ThreadPoolExecutor

from openai import OpenAI


def benchmark_throughput(
    base_url: str,
    model: str,
    prompts: list[str],
    concurrency_levels: list[int] = None,
    max_tokens: int = 128,
) -> dict:
    """Benchmark vLLM throughput and latency at different concurrency levels.

    Run this after warmup to find the optimal max_num_seqs and concurrency.
    """
    if concurrency_levels is None:
        concurrency_levels = [1, 4, 8, 16, 32, 64]

    client = OpenAI(base_url=base_url, api_key="x")
    results = {}

    for concurrency in concurrency_levels:
        latencies = []
        token_counts = []

        def single_request(prompt: str):
            start = time.time()
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0,
            )
            elapsed = time.time() - start
            tokens = response.usage.completion_tokens
            latencies.append(elapsed)
            token_counts.append(tokens)
            return elapsed

        wall_start = time.time()
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            list(pool.map(single_request, prompts[:concurrency]))
        wall_time = time.time() - wall_start

        total_tokens = sum(token_counts)
        results[concurrency] = {
            "wall_time_s": wall_time,
            "throughput_tokens_per_s": total_tokens / wall_time if wall_time > 0 else 0,
            "avg_latency_s": sum(latencies) / len(latencies) if latencies else 0,
            "p95_latency_s": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
            "total_tokens": total_tokens,
        }

    return results
```

## Health Checks and Monitoring

### Custom Health Check Endpoint

```python
import asyncio
import time
from dataclasses import dataclass, field

import httpx


@dataclass
class VLLMHealthMonitor:
    """Monitor vLLM health with multiple check types."""
    base_url: str
    check_interval_seconds: int = 15
    unhealthy_threshold: int = 3
    _failure_count: int = 0
    _last_check_time: float = 0.0
    _metrics_history: list[dict] = field(default_factory=list)

    async def check_health(self) -> dict:
        """Comprehensive health check beyond the /health endpoint."""
        checks = {}

        # 1. Liveness: can we reach the server?
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/health")
                checks["liveness"] = resp.status_code == 200
        except Exception:
            checks["liveness"] = False

        # 2. Inference: can the model generate?
        if checks["liveness"]:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    start = time.time()
                    resp = await client.post(
                        f"{self.base_url}/v1/chat/completions",
                        json={
                            "model": "default",
                            "messages": [{"role": "user", "content": "Hi"}],
                            "max_tokens": 5,
                        },
                    )
                    latency = time.time() - start
                    checks["inference"] = resp.status_code == 200
                    checks["inference_latency_s"] = latency
            except Exception:
                checks["inference"] = False

        # 3. Metrics: check queue depth and pending requests
        if checks.get("liveness"):
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    resp = await client.get(f"{self.base_url}/metrics")
                    if resp.status_code == 200:
                        checks["metrics_available"] = True
                        # Parse Prometheus metrics for queue depth, etc.
            except Exception:
                checks["metrics_available"] = False

        self._failure_count = 0 if all(checks.get(k, False) for k in ["liveness", "inference"]) else self._failure_count + 1
        checks["healthy"] = self._failure_count < self.unhealthy_threshold
        self._metrics_history.append(checks)

        return checks

    async def monitor_loop(self):
        """Run health checks on a loop."""
        while True:
            result = await self.check_health()
            if not result["healthy"]:
                # Trigger alert, restart, or failover
                print(f"ALERT: vLLM unhealthy after {self._failure_count} failures: {result}")
            await asyncio.sleep(self.check_interval_seconds)
```

### Prometheus Metrics Collection

```python
# vLLM exposes Prometheus metrics at /metrics by default
# Key metrics to monitor:

PROMETHEUS_METRICS = {
    # Throughput
    "vllm:num_requests_running": "Currently processing requests",
    "vllm:num_requests_waiting": "Requests waiting in queue",
    "vllm:num_requests_swapped": "Requests swapped to CPU memory",
    "vllm:generation_tokens_total": "Total tokens generated",
    "vllm:prompt_tokens_total": "Total prompt tokens processed",

    # Latency
    "vllm:e2e_request_latency_seconds": "End-to-end request latency",
    "vllm:time_to_first_token_seconds": "Time to first token (TTFT)",
    "vllm:time_per_output_token_seconds": "Time per output token (TPOT)",

    # Resource utilization
    "vllm:gpu_cache_usage_perc": "GPU KV cache utilization",
    "vllm:cpu_cache_usage_perc": "CPU swap utilization",
    "vllm:gpu_prefix_cache_hit_rate": "Prefix cache hit rate",

    # Errors
    "vllm:request_success_total": "Successful requests",
    "vllm:request_error_total": "Failed requests",
}
```

```yaml
# prometheus-rules.yml — Alert rules for vLLM
groups:
  - name: vllm-alerts
    rules:
      - alert: VLLMHighLatency
        expr: histogram_quantile(0.95, vllm:e2e_request_latency_seconds_bucket) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "vLLM p95 latency exceeds 10s"

      - alert: VLLMQueueBacklog
        expr: vllm:num_requests_waiting > 50
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "vLLM request queue has >50 waiting requests"

      - alert: VLLMGPUMemoryWarning
        expr: vllm:gpu_cache_usage_perc > 0.95
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GPU KV cache utilization above 95%"

      - alert: VLLMErrorRate
        expr: rate(vllm:request_error_total[5m]) / rate(vllm:request_success_total[5m]) > 0.05
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "vLLM error rate exceeds 5%"
```

## Kubernetes Scaling

```yaml
# vllm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-inference
  labels:
    app: vllm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:latest
          args:
            - "--model"
            - "meta-llama/Llama-3.1-8B-Instruct"
            - "--max-model-len"
            - "8192"
            - "--gpu-memory-utilization"
            - "0.90"
            - "--max-num-seqs"
            - "256"
            - "--enable-prefix-caching"
          ports:
            - containerPort: 8000
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: 32Gi
            requests:
              nvidia.com/gpu: 1
              memory: 24Gi
          env:
            - name: HUGGING_FACE_HUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-token
                  key: token
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 120
            periodSeconds: 30
            timeoutSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 120
            periodSeconds: 10
          volumeMounts:
            - name: model-cache
              mountPath: /root/.cache/huggingface
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: hf-model-cache
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vllm-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-inference
  minReplicas: 1
  maxReplicas: 8
  metrics:
    - type: Pods
      pods:
        metric:
          name: vllm_num_requests_waiting
        target:
          type: AverageValue
          averageValue: "10"
    - type: Pods
      pods:
        metric:
          name: vllm_gpu_cache_usage_perc
        target:
          type: AverageValue
          averageValue: "80"
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-service
spec:
  selector:
    app: vllm
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
```

## Multi-Model Serving Patterns

### Pattern 1: Separate Deployments (Recommended for Production)

```text
                    ┌──────────────┐
  Router ──────────►│ vLLM Pod 1   │  Llama-3.1-70B (high quality)
                    ├──────────────┤
                    │ vLLM Pod 2   │  Llama-3.1-8B (fast/cheap)
                    ├──────────────┤
                    │ vLLM Pod 3   │  Llama-3.1-8B + LoRA adapters
                    └──────────────┘

Pros: Independent scaling, fault isolation, simple resource allocation
Cons: More infrastructure, higher base cost
```

### Pattern 2: Single Server, Multiple LoRA Adapters

```text
  vLLM Server (1 base model, N LoRA adapters)
  ├── base: Llama-3.1-8B-Instruct
  ├── lora:code-review    (loaded on demand)
  ├── lora:summarizer     (loaded on demand)
  └── lora:sql-generator  (loaded on demand)

  Requests route by model name in the API call.
  Adapters share the base model's KV cache and compute.

Pros: Efficient GPU sharing, fast adapter switching
Cons: All adapters share base model constraints, limited to LoRA-compatible fine-tunes
```

## Review Checklist

- [ ] Docker image built with pre-downloaded model to avoid cold-start delays
- [ ] Health checks configured with appropriate start_period for model loading time
- [ ] gpu_memory_utilization tuned for the workload (0.90-0.95 for dedicated, lower for shared)
- [ ] max_num_seqs set based on expected concurrency and sequence length
- [ ] Tensor parallelism configured correctly for multi-GPU (must divide model layers evenly)
- [ ] Chunked prefill enabled for mixed-length workloads
- [ ] Prefix caching enabled if system prompts or few-shot examples are shared
- [ ] Quantization method chosen based on quality requirements and memory constraints
- [ ] LoRA adapters loaded dynamically if serving multiple fine-tuned variants
- [ ] Prometheus metrics scraped and alerting rules configured
- [ ] Kubernetes HPA configured based on queue depth or GPU utilization
- [ ] Warmup requests sent after deployment to avoid first-request latency spikes

## Anti-Patterns

- Running vLLM without health checks, leading to silent failures during model loading
- Setting gpu_memory_utilization too high (>0.95), causing OOM under memory fragmentation
- Using tensor parallelism across slow interconnects (PCIe instead of NVLink)
- Not warming up the model, making the first request pay JIT compilation cost
- Serving long-context requests without chunked prefill, blocking shorter requests
- Ignoring prefix caching when all requests share the same system prompt
- Deploying a quantized model without evaluating quality degradation on your task
- Setting max_num_seqs too high for long-context workloads, exhausting KV cache

## Output Expectations

When using this skill, return concrete artifacts: Dockerfile, Kubernetes manifests, benchmark results, tuning parameter rationale, or monitoring alert configuration. Name hardware constraints (GPU model, memory, interconnect) that affect configuration choices instead of giving generic recommendations.
