---
name: csp-infrastructure-as-code
description: >
  Infrastructure as Code patterns for Terraform, Pulumi, and GitOps workflows
  including module design, state management, drift detection, secrets management,
  and cost estimation. Use when provisioning, managing, or auditing cloud
  infrastructure through code-driven approaches.
metadata:
  origin: CSP
---

# Infrastructure as Code Patterns

Production-grade IaC patterns for reliable, auditable, and scalable infrastructure.

## When to Activate

- Designing Terraform module structure for a new project or organization
- Choosing between Terraform workspaces and directory-based environments
- Setting up remote state backends with locking and access control
- Implementing drift detection and automated remediation
- Managing secrets in infrastructure pipelines (Vault, SOPS, sealed-secrets)
- Adopting GitOps workflows with ArgoCD or Flux
- Evaluating infrastructure costs before applying changes

## Terraform

### Module Design

A well-structured module is small, composable, and has a clear single responsibility.

```
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
    README.md
  ecs-cluster/
    main.tf
    variables.tf
    outputs.tf
  rds/
    main.tf
    variables.tf
    outputs.tf
```

```hcl
# modules/vpc/main.tf
terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.name}-vpc"
  })
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.name}-private-${count.index}"
    Tier = "private"
  })
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.name}-public-${count.index}"
    Tier = "public"
  })
}

# modules/vpc/variables.tf
variable "name" {
  description = "Project name used for resource naming"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.name))
    error_message = "Name must be 3-21 chars, start with a letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "availability_zones" {
  description = "AWS availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}
```

### Root Module Composition

```hcl
# environments/production/main.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"     # State locking
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name       = "myapp-prod"
  cidr_block = "10.0.0.0/16"
  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    CostCenter  = "engineering"
  }
}

module "database" {
  source = "../../modules/rds"

  name             = "myapp-prod"
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  instance_class   = "db.r6g.large"
  multi_az         = true
  backup_retention = 30
}

module "app_cluster" {
  source = "../../modules/ecs-cluster"

  name       = "myapp-prod"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

### State Management and Remote Backends

```hcl
# S3 backend with DynamoDB locking (AWS)
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "env/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
    # Prevent accidental deletion of state
    acl            = "private"
  }
}

# GCS backend (GCP)
terraform {
  backend "gcs" {
    bucket = "myorg-terraform-state"
    prefix = "env/production"
  }
}

# Azure Blob backend
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "myorgtfstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
    use_azuread_auth     = true
  }
}
```

### Workspaces vs Directories for Environments

```
# Option A: Directory-based (recommended for production)
# Pros: Full isolation, separate state files, clear boundaries
environments/
  development/
    main.tf
    terraform.tfvars
  staging/
    main.tf
    terraform.tfvars
  production/
    main.tf
    terraform.tfvars

# Option B: Workspace-based (simpler, shared config)
# Pros: Single config, switch with `terraform workspace select prod`
# Cons: Shared module versions, workspace confusion risk
environments/
  main.tf              # Uses terraform.workspace to select parameters
  dev.tfvars
  staging.tfvars
  production.tfvars
```

```hcl
# Workspace-based example
locals {
  env_config = {
    development = { instance_type = "t3.small", min_size = 1 }
    staging     = { instance_type = "t3.medium", min_size = 2 }
    production  = { instance_type = "t3.large", min_size = 3 }
  }
  config = local.env_config[terraform.workspace]
}
```

### Drift Detection

```bash
# Detect drift without modifying state
terraform plan -detailed-exitcode
# Exit code 0 = no changes, 1 = error, 2 = drift detected

# Automated drift detection in CI/CD (GitHub Actions)
# .github/workflows/drift-detection.yml
```

```yaml
name: Drift Detection
on:
  schedule:
    - cron: '0 */6 * * *'      # Every 6 hours
jobs:
  drift:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Configure AWS (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-readonly
          aws-region: us-east-1
      - run: terraform init
      - name: Check drift
        id: drift
        run: |
          terraform plan -detailed-exitcode -no-color > plan.txt || EXIT=$?
          if [[ "${EXIT}" == "2" ]]; then
            echo "drift=true" >> $GITHUB_OUTPUT
          fi
      - name: Create issue on drift
        if: steps.drift.outputs.drift == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Infrastructure drift detected',
              body: 'Terraform plan detected changes outside of IaC. See plan output.'
            })
```

### Importing Existing Resources

```bash
# Import an existing resource into Terraform state
terraform import aws_instance.web i-0123456789abcdef0

# Generate configuration for imported resource (Terraform 1.5+)
terraform plan -generate-config-out=generated.tf
```

```hcl
# import block (Terraform 1.5+)
import {
  to = aws_s3_bucket.existing
  id = "my-existing-bucket"
}

resource "aws_s3_bucket" "existing" {
  bucket = "my-existing-bucket"
  # Terraform will generate the rest after import
}
```

### Custom Validation Rules

```hcl
variable "instance_type" {
  type = string

  validation {
    condition     = can(regex("^t3\\.", var.instance_type)) || can(regex("^m6\\.", var.instance_type))
    error_message = "Only t3 and m6g instance families are allowed."
  }
}

variable "environment" {
  type = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# Lifecycle rules to prevent accidental destruction
resource "aws_db_instance" "production" {
  # ...

  lifecycle {
    prevent_destroy = true       # Block terraform destroy for this resource
  }
}
```

### Testing with Terratest

```go
// test/vpc_test.go
package test

import (
	"testing"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestVPCModule(t *testing.T) {
	t.Parallel()

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "../modules/vpc",
		Vars: map[string]interface{}{
			"name":       "test-vpc",
			"cidr_block": "10.99.0.0/16",
		},
	})

	defer terraform.Destroy(t, terraformOptions)
	terraform.InitAndApply(t, terraformOptions)

	vpcID := terraform.Output(t, terraformOptions, "vpc_id")
	assert.NotEmpty(t, vpcID)

	privateSubnets := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
	assert.Len(t, privateSubnets, 3)
}
```

## Pulumi

### Language-Native Infrastructure

```typescript
// Pulumi: TypeScript infrastructure as code
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const environment = config.require("environment");

// VPC
const vpc = new aws.ec2.Vpc(`${environment}-vpc`, {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    tags: { Name: `${environment}-vpc`, Environment: environment },
});

// Subnets derived from config
const azs = aws.getAvailabilityZones({ state: "available" });
const privateSubnets = azs.then(zones =>
    zones.names.slice(0, 3).map((az, i) =>
        new aws.ec2.Subnet(`${environment}-private-${i}`, {
            vpcId: vpc.id,
            cidrBlock: `10.0.${i + 1}.0/24`,
            availabilityZone: az,
            tags: { Name: `${environment}-private-${i}` },
        })
    )
);

// Export outputs
export const vpcId = vpc.id;
export const privateSubnetIds = pulumi.all(privateSubnets).apply(subnets =>
    subnets.map(s => s.id)
);
```

### Component Resources

```typescript
// Reusable component: encapsulates multiple resources
class WebService extends pulumi.ComponentResource {
    public readonly url: pulumi.Output<string>;

    constructor(name: string, args: {
        image: string;
        port: number;
        cpu?: number;
        memory?: number;
    }, opts?: pulumi.ComponentResourceOptions) {
        super("custom:index:WebService", name, {}, opts);

        const cluster = new aws.ecs.Cluster(`${name}-cluster`, {}, { parent: this });

        const taskDef = new aws.ecs.TaskDefinition(`${name}-task`, {
            family: name,
            cpu: String(args.cpu ?? 256),
            memory: String(args.memory ?? 512),
            networkMode: "awsvpc",
            requiresCompatibilities: ["FARGATE"],
            executionRoleArn: new aws.iam.Role(`${name}-exec-role`, {
                assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
                    Service: "ecs-tasks.amazonaws.com",
                }),
            }).arn,
            containerDefinitions: pulumi.output([{
                name: "app",
                image: args.image,
                essential: true,
                portMappings: [{ containerPort: args.port, protocol: "tcp" }],
            }]),
        }, { parent: this });

        const service = new aws.ecs.Service(`${name}-service`, {
            cluster: cluster.arn,
            taskDefinition: taskDef.arn,
            desiredCount: 2,
            launchType: "FARGATE",
        }, { parent: this });

        this.url = pulumi.interpolate`https://${name}.example.com`;
    }
}

// Usage
const api = new WebService("api", {
    image: "myorg/api:latest",
    port: 3000,
    cpu: 512,
    memory: 1024,
});

export const apiUrl = api.url;
```

### Policy as Code with CrossGuard

```typescript
// policies/index.ts
import * as aws from "@pulumi/policy-aws";

const policyPack = new aws.PolicyPack("security-policies", {
    policies: [
        {
            name: "s3-no-public-read",
            description: "S3 buckets must not allow public read access",
            enforcementLevel: "mandatory",
            validateResource: (resource, reportViolation) => {
                if (resource.type === "aws:s3/bucket:Bucket") {
                    const acl = resource.props.acl;
                    if (acl === "public-read" || acl === "public-read-write") {
                        reportViolation("S3 bucket must not have public read ACL");
                    }
                }
            },
        },
        {
            name: "rds-encryption-required",
            description: "RDS instances must have encryption enabled",
            enforcementLevel: "mandatory",
            validateResource: (resource, reportViolation) => {
                if (resource.type === "aws:rds/instance:Instance") {
                    if (!resource.props.storageEncrypted) {
                        reportViolation("RDS instance must have storage encryption enabled");
                    }
                }
            },
        },
    ],
});
```

## Secrets Management

### HashiCorp Vault with Terraform

```hcl
# Retrieve secrets from Vault
provider "vault" {}

data "vault_generic_secret" "db_credentials" {
  path = "secret/data/production/database"
}

resource "aws_db_instance" "main" {
  engine   = "postgres"
  username = data.vault_generic_secret.db_credentials.data["username"]
  password = data.vault_generic_secret.db_credentials.data["password"]
  # ...
}
```

### SOPS for Encrypted Config Files

```bash
# Encrypt a file with SOPS (AWS KMS)
sops --encrypt --kms "arn:aws:kms:us-east-1:123456789012:key/abc-123" \
  secrets/production.yaml > secrets/production.enc.yaml

# Decrypt for use in CI/CD
sops --decrypt secrets/production.enc.yaml > /tmp/decrypted.yaml

# Edit encrypted file in-place
sops secrets/production.enc.yaml
```

```yaml
# secrets/production.enc.yaml (encrypted values, safe to commit)
database:
  host: db.example.com              # Unencrypted metadata
  port: 5432                        # Unencrypted metadata
  username: ENC[AES256_GCM,data:abc...]   # Encrypted
  password: ENC[AES256_GCM,data:xyz...]   # Encrypted
```

### Sealed Secrets for Kubernetes

```bash
# Create a sealed secret (safe to commit to Git)
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=super-secret \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-credentials.yaml
```

```yaml
# sealed-db-credentials.yaml (safe to commit, only decryptable by cluster controller)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  encryptedData:
    username: AgBy3i4OJSWK+PiTySYZZA9r...
    password: AgBq5k6pLMTX+RiUaZZbW3s...
```

## GitOps with ArgoCD

### Application Definition

```yaml
# argocd/my-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app-manifests.git
    targetRevision: main
    path: overlays/production
    kustomize:
      images:
        - my-app=myregistry.io/my-app:${IMAGE_TAG}
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true                  # Delete resources removed from Git
      selfHeal: true               # Revert manual changes to match Git
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        maxDuration: 3m
        factor: 2
```

### ArgoCD Image Updater

```yaml
# Automatically update container images from registry
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    argocd-image-updater.argoproj.io/image-list: my-app=myregistry.io/my-app
    argocd-image-updater.argoproj.io/my-app.update-strategy: semver
    argocd-image-updater.argoproj.io/my-app.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+$
```

## Cost Estimation with Infracost

```bash
# Show cost diff before applying
infracost breakdown --path . --format table

# In CI/CD: post cost estimate as PR comment
infracost diff --path . --format json --out-file infracost.json
infracost comment github --path infracost.json \
  --github-token $GITHUB_TOKEN \
  --pull-request $PR_NUMBER
```

```hcl
# Usage file for more accurate estimates
# infracost-usage.yml
version: 0.1
resource_usage:
  module.app_cluster.aws_ecs_service.main:
    monthly_cpu_hours: 730          # 24/7 for a month
    monthly_memory_gb_hours: 730
  module.database.aws_db_instance.main:
    monthly_additional_backup_storage_gb: 50
```

## Plan/Apply Workflow for Teams

```bash
# Local development workflow
terraform init
terraform plan -out=tfplan              # Generate plan file
terraform show tfplan                   # Review plan
terraform apply tfplan                  # Apply exact plan (no re-planning)

# Team workflow with plan review
# 1. Developer opens PR with .tf changes
# 2. CI runs `terraform plan` and posts output as PR comment
# 3. Team reviews plan output
# 4. On merge, CI runs `terraform apply`
```

## Anti-Patterns

```
# BAD: Storing state in git or locally
# Always use remote backends (S3, GCS, Azure Blob) with locking

# BAD: One giant Terraform state for all environments
# Split by environment and layer (networking, compute, data) for blast radius control

# BAD: Hardcoding resource names or configurations
# Use variables with validation rules and sensible defaults

# BAD: Committing secrets to the repository
# Use Vault, SOPS, or sealed-secrets. Never put plaintext secrets in tfvars

# BAD: Running terraform apply without reviewing the plan
# Always run and review terraform plan first, especially in CI/CD pipelines

# BAD: Ignoring drift
# Schedule regular drift detection and remediate promptly

# BAD: Skipping tests for infrastructure modules
# Use Terratest or similar to validate module behavior before production use
```

## Related Skills

- `csp-cicd-pipelines` -- Running Terraform in CI/CD with plan/apply workflows
- `csp-kubernetes-patterns` -- Deploying to Kubernetes with Helm and Kustomize
- `csp-cloud-platform-patterns` -- Cloud-specific resource patterns on AWS, GCP, and Azure
- `csp-docker-patterns` -- Container images used in ECS, EKS, and Cloud Run deployments
