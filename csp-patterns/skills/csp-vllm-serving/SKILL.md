---
name: csp-vllm-serving
description: Production vLLM inference serving patterns covering Docker setup, continuous batching, PagedAttention, tensor parallelism, OpenAI-compatible APIs, LoRA multiplexing, quantization, performance tuning, health checks, Kubernetes scaling, and multi-model serving. Use when deploying, optimizing, or operating LLM inference with vLLM.
metadata:
  origin: CSP
layer: 4
category: patterns
--------|-----------|----------------|--------------|---------------------|
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
