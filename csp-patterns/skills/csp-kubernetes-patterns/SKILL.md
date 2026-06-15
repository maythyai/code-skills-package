---
name: csp-kubernetes-patterns
description: >
  Kubernetes patterns for workload design, autoscaling, security, Helm charts,
  Kustomize overlays, and multi-cluster strategies. Use when designing, deploying,
  or troubleshooting applications running on Kubernetes clusters.
metadata:
  origin: CSP
layer: 4
category: patterns
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  name: http
```

## Resource Requests and Limits Tuning

### Sizing Strategy

```yaml
# Based on actual metrics from production observability
# requests = P50 usage (median), limits = P99 * 1.5 (headroom)
resources:
  requests:
    cpu: 250m          # Typical usage at median load
    memory: 256Mi      # Typical memory footprint
  limits:
    cpu: "1"           # Allow burst to 1 CPU during peaks
    memory: 512Mi      # Hard ceiling -- OOMKilled if exceeded

# Memory-only limits for Java workloads (let JVM manage CPU)
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    memory: 2Gi        # Set -Xmx to ~80% of this value
```

### QoS Classes

```
Guaranteed:  requests == limits (both cpu and memory)  -- highest priority, last to be evicted
Burstable:   at least one container has requests < limits  -- moderate priority
BestEffort:  no requests or limits set  -- lowest priority, first to be evicted
```

## Autoscaling

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60       # Wait 60s before scaling up
      policies:
        - type: Pods
          value: 3                         # Add at most 3 pods per step
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300      # Wait 5 minutes before scaling down
      policies:
        - type: Pods
          value: 1                         # Remove at most 1 pod per step
          periodSeconds: 120
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70           # Scale up when CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second   # Custom metric
        target:
          type: AverageValue
          averageValue: "1000"             # 1000 req/s per pod
```

### Vertical Pod Autoscaler (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"                # Auto-restart pods with new recommendations
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "4"
          memory: 4Gi
        controlledResources: ["cpu", "memory"]

# VPA recommendation mode (observe only, don't restart pods)
# updateMode: "Off" -- then check recommendations:
# kubectl describe vpa api
```

## Pod Security Standards

### Pod Security Admission

```yaml
# Namespace-level enforcement (Kubernetes 1.23+)
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Secure Pod Template

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/.cache
  volumes:
    - name: tmp
      emptyDir:
        sizeLimit: 100Mi
    - name: cache
      emptyDir:
        sizeLimit: 500Mi
```

## NetworkPolicy

```yaml
# Default deny all ingress traffic to namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}                      # Applies to all pods in namespace
  policyTypes:
    - Ingress
---
# Allow ingress only from the ingress controller and monitoring
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 3000
---
# Allow API to talk to database only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
    - to:                             # Allow DNS resolution
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
```

## ConfigMap and Secret Management

```yaml
# ConfigMap for non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
  FEATURE_FLAGS: |
    {
      "newCheckout": true,
      "darkMode": false
    }
---
# Secret for sensitive data (base64 encoded, but NOT encrypted at rest by default)
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
type: Opaque
data:
  DATABASE_URL: cG9zdGdyZXM6Ly91c2VyOnBhc3NAZGI6NTQzMi9hcHA=
  JWT_SECRET: bXktc2VjcmV0LWtleQ==
```

## StatefulSet for Stateful Workloads

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 10Gi
---
# Headless service for StatefulSet DNS
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
spec:
  clusterIP: None                   # Headless -- each pod gets its own DNS record
  selector:
    app: redis-cluster
  ports:
    - port: 6379
# Pods accessible as: redis-cluster-0.redis-cluster.default.svc.cluster.local
```

## Job and CronJob Patterns

```yaml
# One-time migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-v42
spec:
  backoffLimit: 3                   # Max retries on failure
  activeDeadlineSeconds: 600        # Timeout after 10 minutes
  ttlSecondsAfterFinished: 86400    # Auto-cleanup after 24 hours
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: myapp:1.42.0
          command: ["npm", "run", "migrate"]
---
# CronJob for scheduled tasks
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup
spec:
  schedule: "0 3 * * *"             # 3 AM daily
  timeZone: "UTC"
  concurrencyPolicy: Forbid          # Don't run if previous job still active
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  startingDeadlineSeconds: 300       # Give up if missed by more than 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: myapp:latest
              command: ["npm", "run", "cleanup"]
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 256Mi
```

## Sidecar Patterns

```yaml
# Logging sidecar: streams container logs to external system
spec:
  containers:
    - name: app
      image: myapp:1.0
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
    - name: log-shipper
      image: fluentd:v1.16
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
      env:
        - name: FLUENTD_CONF
          value: fluent.conf
  volumes:
    - name: logs
      emptyDir: {}
---
# Service mesh sidecar (Istio example)
# Istio injects Envoy proxy automatically when namespace is labeled:
# kubectl label namespace production istio-injection=enabled
```

## Operator Pattern

```yaml
# Custom Resource Definition
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine:
                  type: string
                  enum: ["postgres", "mysql"]
                version:
                  type: string
                storageSize:
                  type: string
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 5
              required: ["engine", "version"]
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames: ["db"]
---
# Custom Resource instance
apiVersion: example.com/v1alpha1
kind: Database
metadata:
  name: my-app-db
spec:
  engine: postgres
  version: "16"
  storageSize: 20Gi
  replicas: 2
```

## Helm Chart Design

### Chart Structure

```
charts/
  my-app/
    Chart.yaml
    values.yaml
    values.schema.json          # JSON Schema for values validation
    templates/
      _helpers.tpl              # Template helpers
      deployment.yaml
      service.yaml
      ingress.yaml
      configmap.yaml
      hpa.yaml
    templates/tests/
      test-connection.yaml
    charts/                     # Subchart dependencies
```

### Values Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "description": "Number of pod replicas"
    },
    "image": {
      "type": "object",
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string" },
        "pullPolicy": { "type": "string", "enum": ["Always", "IfNotPresent", "Never"] }
      },
      "required": ["repository", "tag"]
    },
    "resources": {
      "type": "object",
      "properties": {
        "requests": {
          "type": "object",
          "properties": {
            "cpu": { "type": "string" },
            "memory": { "type": "string" }
          }
        },
        "limits": {
          "type": "object",
          "properties": {
            "cpu": { "type": "string" },
            "memory": { "type": "string" }
          }
        }
      }
    }
  },
  "required": ["image"]
}
```

### Template Best Practices

```yaml
# templates/_helpers.tpl
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.name" . }}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

### Chart Testing

```bash
# Lint the chart
helm lint charts/my-app

# Template rendering (dry-run)
helm template my-release charts/my-app --values values-staging.yaml

# Install with tests
helm install my-release charts/my-app --namespace staging --create-namespace
helm test my-release --namespace staging

# Using chart-testing tool (ct) for CI
ct lint --charts charts/my-app
ct install --charts charts/my-app --namespace test
```

## Kustomize Overlays

```
k8s/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    development/
      kustomization.yaml
      replica-patch.yaml
    staging/
      kustomization.yaml
      configmap-patch.yaml
    production/
      kustomization.yaml
      replica-patch.yaml
      resource-patch.yaml
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
commonLabels:
  app: my-app
---
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namePrefix: prod-
namespace: production
patches:
  - path: replica-patch.yaml
  - path: resource-patch.yaml
images:
  - name: myregistry.io/my-app
    newTag: "1.2.3"                 # Pin image tag per environment
```

```yaml
# overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
---
# overlays/production/resource-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 1Gi
```

## Multi-Cluster Strategies

### Cluster Autoscaler and Node Groups

```yaml
# EKS managed node group with autoscaling
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: my-cluster
  region: us-east-1
managedNodeGroups:
  - name: general
    instanceTypes: ["m6i.large", "m6a.large", "m5a.large"]
    minSize: 3
    maxSize: 20
    desiredCapacity: 5
    labels:
      role: general
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/my-cluster: "owned"
  - name: compute
    instanceTypes: ["c6i.2xlarge"]
    minSize: 0
    maxSize: 10
    labels:
      role: compute
    taints:
      - key: dedicated
        value: compute
        effect: NoSchedule
```

### Node Affinity and Tolerations

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values: ["us-east-1a", "us-east-1b"]
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: api
                topologyKey: kubernetes.io/hostname
      tolerations:
        - key: dedicated
          operator: Equal
          value: compute
          effect: NoSchedule
```

## Persistent Volumes

```yaml
# StorageClass for fast SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
reclaimPolicy: Retain                 # Keep data after PVC deletion
allowVolumeExpansion: true            # Allow resizing
volumeBindingMode: WaitForFirstConsumer  # Bind when pod is scheduled
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
```

## Anti-Patterns

```
# BAD: No resource requests or limits
# Every container must have both -- prevents noisy-neighbor and OOMKill issues

# BAD: Using latest tag in production
# Pin image tags to specific versions; use image digest for maximum safety

# BAD: Running containers as root
# Always set runAsNonRoot: true and drop all capabilities

# BAD: No health checks
# Define liveness, readiness, and startup probes for every container

# BAD: Storing secrets in ConfigMaps
# Use Secrets (encrypted at rest) or external secret managers (Vault, sealed-secrets)

# BAD: Deploying without PodDisruptionBudget
# PDBs protect availability during node drains and cluster upgrades

# BAD: Ignoring NetworkPolicy
# Default-deny + explicit-allow policies limit blast radius of compromises
```

## Related Skills

- `csp-infrastructure-as-code` -- Provisioning clusters and cloud resources with Terraform/Pulumi
- `csp-cicd-pipelines` -- Deploying to Kubernetes from CI/CD pipelines
- `csp-cloud-platform-patterns` -- Managed Kubernetes services (EKS, GKE, AKS)
- `csp-docker-patterns` -- Building optimized container images for Kubernetes workloads
