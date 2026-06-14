---
name: csp-cloud-platform-patterns
description: >
  Cloud platform patterns for AWS, GCP, and Azure including serverless,
  containers, managed databases, event-driven architectures, CDN, DNS,
  multi-region deployment, and cost optimization. Use when designing or
  optimizing cloud-native architectures on any major cloud provider.
metadata:
  origin: CSP
---

# Cloud Platform Patterns

Production-grade patterns for building on AWS, GCP, and Azure.

## When to Activate

- Designing serverless architectures with Lambda, Cloud Functions, or Azure Functions
- Choosing between container orchestration options (ECS, Cloud Run, App Service)
- Building event-driven systems with SQS/SNS, Pub/Sub, or Service Bus
- Setting up CDN and DNS for global content delivery
- Planning multi-region deployment for high availability
- Optimizing cloud spend across compute, storage, and data transfer

## AWS

### Lambda and Serverless Patterns

```yaml
# serverless.yml (Serverless Framework)
service: my-api

provider:
  name: aws
  runtime: nodejs22.x
  architecture: arm64                 # Graviton -- 20% cheaper, similar performance
  memorySize: 512
  timeout: 30
  environment:
    TABLE_NAME: ${self:service}-${sls:stage}-items
    LOG_LEVEL: info

functions:
  createItem:
    handler: src/handlers/create.handler
    events:
      - httpApi:
          path: /items
          method: post
    environment:
      POWERTOOLS_SERVICE_NAME: item-service

  getItem:
    handler: src/handlers/get.handler
    events:
      - httpApi:
          path: /items/{id}
          method: get

  processEvent:
    handler: src/handlers/process.handler
    events:
      - sqs:
          arn:
            Fn::GetAtt: [EventQueue, Arn]
          batchSize: 10
          functionResponseType: ReportBatchItemFailures

resources:
  Resources:
    ItemsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-${sls:stage}-items
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: pk
            AttributeType: S
          - AttributeName: sk
            AttributeType: S
        KeySchema:
          - AttributeName: pk
            KeyType: HASH
          - AttributeName: sk
            KeyType: RANGE

    EventQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-${sls:stage}-events
        VisibilityTimeout: 60         # >= Lambda timeout
        MessageRetentionPeriod: 1209600  # 14 days
        RedrivePolicy:
          deadLetterTargetArn:
            Fn::GetAtt: [EventDLQ, Arn]
          maxReceiveCount: 3

    EventDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-${sls:stage}-events-dlq
        MessageRetentionPeriod: 1209600
```

### Lambda Powertools and Best Practices

```typescript
// src/handlers/create.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';

const logger = new Logger({ serviceName: 'item-service' });
const tracer = new Tracer({ serviceName: 'item-service' });
const ddb = DynamoDBDocument.from(tracer.captureAWSv3Client(new DynamoDB({})));

const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const requestId = event.requestContext.requestId;
  logger.appendKeys({ requestId });

  try {
    const body = CreateItemSchema.parse(JSON.parse(event.body ?? '{}'));
    const segment = tracer.getSegment()?.addNewSubsegment('createItem');

    await ddb.put({
      TableName: process.env.TABLE_NAME!,
      Item: {
        pk: `ITEM#${crypto.randomUUID()}`,
        sk: 'METADATA',
        ...body,
        createdAt: new Date().toISOString(),
      },
    });

    segment?.close();
    logger.info('Item created', { body });
    return { statusCode: 201, body: JSON.stringify({ message: 'created' }) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { statusCode: 400, body: JSON.stringify({ errors: err.errors }) };
    }
    logger.error('Failed to create item', { error: err });
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal error' }) };
  }
};
```

### ECS Fargate

```hcl
# Terraform: ECS Fargate service
resource "aws_ecs_cluster" "main" {
  name = "${var.name}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.name}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "${var.image_repository}:${var.image_tag}"
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "app"
      }
    }
    environment = [
      { name = "NODE_ENV", value = "production" }
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.db_url.arn }
    ]
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "${var.name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

### S3 + CloudFront Static Hosting

```hcl
resource "aws_s3_bucket" "static" {
  bucket = "${var.name}-static-assets"
}

resource "aws_s3_bucket_public_access_block" "static" {
  bucket                  = aws_s3_bucket.static.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_distribution" "static" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"       # US + EU only (cheaper)

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "s3-${aws_s3_bucket.static.id}"

    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${aws_s3_bucket.static.id}"
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress               = true
  }

  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = ["cdn.${var.domain}"]
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

### Event-Driven with SQS and SNS

```hcl
# SNS topic for fan-out to multiple consumers
resource "aws_sns_topic" "orders" {
  name = "${var.name}-orders"
}

# SQS queue per consumer (decoupled processing)
resource "aws_sqs_queue" "inventory" {
  name                       = "${var.name}-inventory-updates"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inventory_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "inventory_dlq" {
  name                      = "${var.name}-inventory-updates-dlq"
  message_retention_seconds = 1209600
}

# Subscribe queue to topic (fan-out)
resource "aws_sns_topic_subscription" "inventory" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.inventory.arn
}

# Filter policy: only receive relevant messages
resource "aws_sns_topic_subscription" "notifications" {
  topic_arn       = aws_sns_topic.orders.arn
  protocol        = "sqs"
  endpoint        = aws_sqs_queue.notifications.arn
  filter_policy   = jsonencode({
    orderType = ["premium", "enterprise"]
  })
}
```

### IAM Best Practices

```hcl
# Principle of least privilege
resource "aws_iam_role_policy" "app" {
  name = "${var.name}-app-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
        ]
        Resource = [
          aws_dynamodb_table.items.arn,
          "${aws_dynamodb_table.items.arn}/index/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
        ]
        Resource = "${aws_s3_bucket.assets.arn}/*"
      },
    ]
  })
}

# Use IAM roles (not long-lived access keys) for services
# Use OIDC federation for CI/CD (see csp-cicd-pipelines skill)
# Use permission boundaries for delegated admin
```

## GCP

### Cloud Run

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-api
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/minScale: "2"       # Keep 2 instances warm (no cold starts)
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu: "2"
        run.googleapis.com/memory: 1Gi
        run.googleapis.com/maxScale: "50"
        run.googleapis.com/execution-environment: gen2
        autoscaling.knative.dev/target: "80"  # Target 80% CPU utilization
    spec:
      containers:
        - image: us-central1-docker.pkg.dev/my-project/repo/api:v1.2.3
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-url
                  key: url
          resources:
            limits:
              cpu: "2"
              memory: 1Gi
          startupProbe:
            httpGet:
              path: /health
            initialDelaySeconds: 5
            failureThreshold: 10
```

```bash
# Deploy to Cloud Run
gcloud run deploy my-api \
  --image us-central1-docker.pkg.dev/my-project/repo/api:v1.2.3 \
  --region us-central1 \
  --platform managed \
  --min-instances 2 \
  --max-instances 50 \
  --cpu 2 \
  --memory 1Gi \
  --set-secrets DATABASE_URL=db-url:url \
  --allow-unauthenticated
```

### Cloud Build

```yaml
# cloudbuild.yaml
steps:
  - name: 'node:22'
    entrypoint: npm
    args: ['ci']

  - name: 'node:22'
    entrypoint: npm
    args: ['run', 'lint']

  - name: 'node:22'
    entrypoint: npm
    args: ['test', '--', '--coverage']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/api:$SHORT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/api:$SHORT_SHA']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'my-api'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/repo/api:$SHORT_SHA'
      - '--region=us-central1'

substitutions:
  _DEPLOY_REGION: us-central1

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: E2_HIGHCPU_8
```

### Pub/Sub Event-Driven

```typescript
// Publish messages to Pub/Sub
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const topic = pubsub.topic('orders');

async function publishOrder(order: Order) {
  const data = Buffer.from(JSON.stringify(order));
  const messageId = await topic.publishMessage({
    data,
    attributes: { type: order.type, priority: order.priority },
  });
  return messageId;
}

// Cloud Function triggered by Pub/Sub
export const processOrder = async (message: PubSubMessage) => {
  const order = JSON.parse(Buffer.from(message.data, 'base64').toString());
  const attributes = message.attributes;

  if (attributes.type === 'premium') {
    await processPremiumOrder(order);
  } else {
    await processStandardOrder(order);
  }
};
```

### Cloud SQL and Spanner

```hcl
# Cloud SQL (PostgreSQL) with high availability
resource "google_sql_database_instance" "main" {
  name             = "${var.name}-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-4-16384"   # 4 CPU, 16 GB RAM
    availability_type = "REGIONAL"             # HA with automatic failover
    disk_size         = 100
    disk_autoresize   = true
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false                  # Private IP only
      private_network = var.vpc_network_id
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
  }

  deletion_protection = true
}
```

## Azure

### App Service

```bicep
// main.bicep
param location string = resourceGroup().location
param appName string

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: 'P1v3'
    capacity: 2
  }
  properties: {
    reserved: true          // Linux
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned'    // Managed identity
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      healthCheckPath: '/health'
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
      ]
    }
  }
}
```

### Azure Functions

```typescript
// src/functions/processOrder.ts (Azure Functions v4 model)
import { app, ServiceBusQueueTrigger } from '@azure/functions';

app.serviceBusQueue('processOrder', {
  connection: 'SERVICEBUS_CONNECTION',
  queueName: 'orders',
  handler: async (message: any, context) => {
    context.log(`Processing order: ${message.id}`);

    try {
      await processOrder(message);
      context.log(`Order ${message.id} processed successfully`);
    } catch (error) {
      context.error(`Failed to process order ${message.id}`, error);
      throw error; // Triggers retry and dead-letter after max deliveries
    }
  },
});
```

### Cosmos DB

```bicep
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: '${appName}-cosmos'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'    // Best balance of consistency and latency
    }
    locations: [
      { locationName: 'East US', failoverPriority: 0, isZoneRedundant: true }
      { locationName: 'West Europe', failoverPriority: 1, isZoneRedundant: true }
    ]
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: true
    enableMultipleWriteLocations: false
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'mydb'
  properties: {
    resource: { id: 'mydb' }
  }
}

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'items'
  properties: {
    resource: {
      id: 'items'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
    options: {
      throughput: 400    // RU/s (or set to autoscale with maxThroughput)
    }
  }
}
```

## Cross-Cutting Patterns

### CDN and DNS

```hcl
# Multi-CDN strategy with Cloudflare + origin CDN
# Cloudflare (edge) -> CloudFront/S3 (origin cache) -> App servers

# DNS management (Route 53 example)
resource "aws_route53_zone" "main" {
  name = "example.com"
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# Latency-based routing for multi-region
resource "aws_route53_record" "api_us" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_eu" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}

# Health check for failover
resource "aws_route53_health_check" "api" {
  fqdn              = "api.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}
```

### Multi-Region Deployment

```
Architecture for multi-region active-active:

  Global DNS (Route 53 / Cloudflare)
       |
       +-- us-east-1 (primary write region)
       |    +-- ALB -> ECS/Lambda
       |    +-- RDS (primary) or DynamoDB Global Table
       |    +-- ElastiCache Redis
       |
       +-- eu-west-1 (secondary read region, failover write)
            +-- ALB -> ECS/Lambda
            +-- RDS (read replica, promoted on failover)
            +-- ElastiCache Redis

Key decisions:
- Active-active: Both regions serve reads, single-region writes
- Active-active writes: DynamoDB Global Tables or multi-region Spanner
- Active-passive: Secondary region idle until failover (cheaper but slower failover)
```

### Managed Kubernetes Comparison

```
EKS (AWS):
  - Fargate profiles for serverless pods
  - Managed node groups with auto-repair
  - IRSA (IAM Roles for Service Accounts) for pod-level IAM
  - Add-ons: CoreDNS, kube-proxy, VPC CNI, EBS CSI

GKE (GCP):
  - Autopilot mode (fully managed nodes)
  - Best integration with GCP services (Cloud SQL, Pub/Sub)
  - Workload Identity for pod-level GCP IAM
  - Built-in: Horizontal Pod Autoscaler, Node Autoprovisioning

AKS (Azure):
  - Virtual nodes (ACI for burst capacity)
  - Azure AD integration for RBAC
  - Managed identity for pod-level Azure IAM
  - Built-in: Azure Policy, Defender for Containers
```

### Cloud Cost Optimization

```
Strategies for reducing cloud spend:

1. Right-sizing
   - Use VPA recommendations to adjust resource requests/limits
   - Review AWS Compute Optimizer / GCP Recommender suggestions
   - Downsize over-provisioned databases and caches

2. Spot/preemptible instances
   - Stateless workloads: use Spot Instances (AWS) / Preemptible VMs (GCP)
   - Batch processing: Spot Fleet with diversified instance types
   - Kubernetes: Karpenter with spot node pools for non-critical workloads

3. Reserved capacity
   - Stable baseline load: 1-year or 3-year Reserved Instances / CUDs
   - Savings Plans (AWS): more flexible than RIs for compute

4. Storage lifecycle
   - S3 Intelligent-Tiering: automatic movement between access tiers
   - Glacier for archival data (90+ days retention)
   - Delete unused EBS volumes and snapshots

5. Data transfer
   - Use CloudFront/CDN to reduce origin data transfer costs
   - VPC endpoints for AWS services (avoid NAT Gateway charges)
   - Same-region replication where possible

6. Scheduling
   - Scale down dev/staging environments during off-hours
   - Use Karpenter or Cluster Autoscaler with scale-to-zero
   - Schedule non-critical batch jobs during off-peak pricing
```

```hcl
# Infracost usage file for cost estimation
# infracost-usage.yml
version: 0.1
resource_usage:
  aws_ecs_service.app:
    monthly_cpu_hours: 730
    monthly_memory_gb_hours: 1460        # 2 GB * 730 hours
  aws_cloudfront_distribution.static:
    monthly_data_transfer_to_internet_gb: 500
    monthly_http_requests: 10000000
  aws_s3_bucket.assets:
    storage_gb: 100
    monthly_tier_1_requests: 1000000
    monthly_tier_2_requests: 5000000
```

## Anti-Patterns

```
# BAD: Long-lived access keys for services
# Use IAM roles, managed identities, or workload identity -- never static keys

# BAD: Single-region without backup strategy
# At minimum, have cross-region backups and a documented failover runbook

# BAD: Ignoring egress costs
# Data transfer out is expensive -- use CDNs, VPC endpoints, and same-region architecture

# BAD: Over-provisioning by default
# Start with conservative sizing, then scale based on metrics (HPA/VPA)

# BAD: No cost visibility
# Set up budgets, alerts, and regular cost reviews using Infracost and cloud-native tools

# BAD: Mixing environments in one account/project
# Separate AWS accounts / GCP projects / Azure subscriptions per environment

# BAD: Manual infrastructure changes
# All changes must go through IaC -- console changes cause drift and audit gaps
```

## Related Skills

- `csp-infrastructure-as-code` -- Terraform, Pulumi, and GitOps for provisioning cloud resources
- `csp-kubernetes-patterns` -- Detailed Kubernetes patterns for workloads on EKS, GKE, and AKS
- `csp-cicd-pipelines` -- CI/CD pipelines for deploying to cloud platforms
- `csp-docker-patterns` -- Container image optimization for cloud-hosted workloads
