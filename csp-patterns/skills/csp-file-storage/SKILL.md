---
name: csp-file-storage
description: >
  Design and implement file upload, storage, and processing architectures using
  S3, R2, and other object storage providers. Use when building file upload
  flows, configuring presigned URLs, setting up image processing pipelines,
  or optimizing storage costs and CDN delivery.
version: 0.1.0
layer: 4
category: patterns
---

# File Upload, Storage, and Processing Architecture

Patterns for building production-grade file storage systems with direct uploads, image processing, CDN delivery, and cost optimization.

## When to Activate

- Designing a file upload system with direct-to-storage uploads (presigned URLs)
- Choosing between S3, R2, Backblaze B2, or other object storage providers
- Building an image processing pipeline (resize, thumbnails, format conversion)
- Implementing multipart upload for large files with resume capability
- Configuring CDN delivery with cache invalidation strategies
- Optimizing storage costs with tiered storage and egress reduction

## Storage Provider Comparison

| Feature | AWS S3 | Cloudflare R2 | Backblaze B2 | GCS | Azure Blob |
|---|---|---|---|---|---|
| **Storage** | $0.023/GB | $0.015/GB | $0.006/GB | $0.020/GB | $0.018/GB |
| **Egress** | $0.09/GB | **Free** | $0.01/GB | $0.12/GB | $0.087/GB |
| **API** | Native | S3-compat | S3-compat | Native | Native |
| **CDN** | CloudFront | Built-in | External | Cloud CDN | Azure CDN |
| **Best for** | AWS ecosystem | High egress | Budget | GCP ecosystem | Azure |

### Decision Matrix

```
Egress bandwidth a major cost? -> Cloudflare R2 (zero egress fees)
Already on a cloud provider?   -> Use native storage (S3, GCS, Azure Blob)
Need event-driven processing?  -> S3 with Lambda triggers
No cloud lock-in needed?       -> Backblaze B2 (cheapest, S3-compatible)
```

## Upload Patterns

| Pattern | Latency | Server Load | Best For |
|---|---|---|---|
| **Presigned URL** | Low | Minimal | Files > 1MB |
| **Server-proxied** | Higher | High | Small files, simple auth |
| **Multipart** | Low (parallel) | Minimal | Files > 100MB |
| **Chunked (tus)** | Low | Medium | Resumable, unreliable networks |

### Presigned URL Flow

```
Client -> POST /upload-url -> Server -> Generate presigned URL -> S3
Client <- { uploadUrl, key } <- Server
Client -> PUT file directly to S3
Client -> POST /upload/confirm -> Server -> Verify + store DB record
```

### S3 Presigned URL Generation

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const BUCKET = process.env.STORAGE_BUCKET!;

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "video/mp4", "video/webm",
]);

export async function generatePresignedUpload(
  filename: string, contentType: string, userId: string
) {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error(`Content type not allowed: ${contentType}`);
  }

  const ext = filename.split(".").pop() ?? "bin";
  const key = `uploads/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET, Key: key, ContentType: contentType,
    Metadata: { "original-filename": filename, "user-id": userId },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, key, expiresIn: 3600 };
}

export async function generatePresignedDownload(key: string, expiresIn = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}
```

### Upload API Endpoint

```typescript
import { Router } from "express";
import { z } from "zod";

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|application|video)\//),
  size: z.number().int().positive().max(100 * 1024 * 1024),
});

router.post("/upload-url", authenticate, async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const usage = await getUserStorageUsage(req.user.id);
  if (usage + parsed.data.size > MAX_USER_STORAGE) {
    return res.status(413).json({ error: "Storage quota exceeded" });
  }

  const result = await generatePresignedUpload(
    parsed.data.filename, parsed.data.contentType, req.user.id
  );
  res.json(result);
});

router.post("/upload/confirm", authenticate, async (req, res) => {
  const { key, metadata } = req.body;
  const obj = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  const file = await db.files.create({ data: {
    key, userId: req.user.id,
    contentType: obj.ContentType!, size: obj.ContentLength!,
    originalFilename: metadata?.filename, status: "active",
  }});
  res.json(file);
});
```

### Client-Side Upload

```typescript
async function uploadFile(file: File) {
  const { uploadUrl, key } = await fetch("/api/upload-url", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  }).then(r => r.json());

  await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

  return fetch("/api/upload/confirm", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, metadata: { filename: file.name } }),
  }).then(r => r.json());
}
```

## Multipart Upload

```typescript
import { CreateMultipartUploadCommand, UploadPartCommand } from "@aws-sdk/client-s3";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PARALLEL = 3;

export async function initiateMultipartUpload(key: string, contentType: string) {
  const result = await s3.send(new CreateMultipartUploadCommand({
    Bucket: BUCKET, Key: key, ContentType: contentType,
  }));
  return { key, uploadId: result.UploadId! };
}

export async function generatePartUrls(key: string, uploadId: string, partCount: number) {
  const urls: string[] = [];
  for (let n = 1; n <= partCount; n++) {
    urls.push(await getSignedUrl(s3, new UploadPartCommand({
      Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: n,
    }), { expiresIn: 3600 }));
  }
  return urls;
}

// Client: parallel chunked upload with concurrency control
async function uploadMultipart(file: File) {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const { key, uploadId } = await fetch("/api/upload/multipart/init", {
    method: "POST", body: JSON.stringify({ filename: file.name, partCount: chunks }),
  }).then(r => r.json());

  const urls: string[] = await fetch("/api/upload/multipart/urls", {
    method: "POST", body: JSON.stringify({ key, uploadId, partCount: chunks }),
  }).then(r => r.json());

  const etags: { ETag: string; PartNumber: number }[] = [];
  const queue = Array.from({ length: chunks }, (_, i) => i).values();

  async function next() {
    const { value: i, done } = queue.next();
    if (done) return;
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const res = await fetch(urls[i], { method: "PUT", body: chunk });
    etags.push({ ETag: res.headers.get("ETag")!, PartNumber: i + 1 });
    await next();
  }
  await Promise.all(Array.from({ length: MAX_PARALLEL }, () => next()));

  await fetch("/api/upload/multipart/complete", {
    method: "POST", body: JSON.stringify({ key, uploadId, parts: etags }),
  });
}
```

## Image Processing Pipeline

```typescript
import sharp from "sharp";

export async function processImage(input: Buffer) {
  const img = sharp(input).rotate(); // Auto-orient from EXIF
  const [original, thumbnail, small, medium, webp] = await Promise.all([
    img.clone().toBuffer(),
    img.clone().resize(150, 150, { fit: "cover" }).toBuffer(),
    img.clone().resize(400, null, { fit: "inside", withoutEnlargement: true }).toBuffer(),
    img.clone().resize(800, null, { fit: "inside", withoutEnlargement: true }).toBuffer(),
    img.clone().resize(800, null, { fit: "inside" }).webp({ quality: 80 }).toBuffer(),
  ]);
  return { original, thumbnail, small, medium, webp };
}

async function uploadVariants(key: string, variants: Awaited<ReturnType<typeof processImage>>) {
  const base = key.replace(/\.[^.]+$/, "");
  const items = [
    { s: "", data: variants.original, ct: "image/jpeg" },
    { s: "_thumb", data: variants.thumbnail, ct: "image/jpeg" },
    { s: "_small", data: variants.small, ct: "image/jpeg" },
    { s: "_medium", data: variants.medium, ct: "image/jpeg" },
    { s: "_medium.webp", data: variants.webp, ct: "image/webp" },
  ];
  await Promise.all(items.map(({ s, data, ct }) =>
    s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: `${base}${s}`, Body: data,
      ContentType: ct, CacheControl: "public, max-age=31536000, immutable",
    }))
  ));
}
```

## CDN and Caching

```typescript
// CloudFront invalidation (prefer content-hash keys to avoid this)
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
const cf = new CloudFrontClient({ region: "us-east-1" });

async function invalidateCdn(paths: string[]) {
  await cf.send(new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DIST_ID!,
    InvalidationBatch: {
      CallerReference: `inv-${Date.now()}`,
      Paths: { Quantity: paths.length, Items: paths },
    },
  }));
}
```

```
Cache strategy:
  Immutable (content-hash names): Cache-Control: public, max-age=31536000, immutable
  Avatars (rarely change):        Cache-Control: public, max-age=86400
  Thumbnails (moderate):          Cache-Control: public, max-age=3600
  Private originals:              No CDN, presigned URLs only
```

## File Type Validation

```typescript
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg":      [[0xFF, 0xD8, 0xFF]],
  "image/png":       [[0x89, 0x50, 0x4E, 0x47]],
  "image/gif":       [[0x47, 0x49, 0x46, 0x38]],
  "image/webp":      [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

export function validateMagicBytes(buffer: Buffer, type: string): boolean {
  const sigs = MAGIC_BYTES[type];
  if (!sigs) return false;
  return sigs.some(sig => buffer.subarray(0, sig.length).equals(Buffer.from(sig)));
}

export function validateUpload(file: { buffer: Buffer; mimeType: string; size: number; filename: string }) {
  const errors: string[] = [];
  if (!ALLOWED_TYPES.has(file.mimeType)) errors.push(`Type ${file.mimeType} not allowed`);
  if (!validateMagicBytes(file.buffer, file.mimeType)) errors.push("Content does not match MIME type");
  if (file.size > MAX_FILE_SIZE) errors.push("File too large");
  if (/[<>:"/\\|?*]/.test(file.filename)) errors.push("Invalid characters in filename");
  return { valid: errors.length === 0, errors };
}
```

## Storage Organization and Lifecycle

```
bucket/
  uploads/{userId}/{YYYY-MM-DD}/{uuid}.{ext}    # Raw uploads
  processed/{userId}/{uuid}_{variant}.{ext}      # Thumbnails, resized
  public/avatars/  public/banners/               # CDN-fronted assets
  temp/                                          # Transient (lifecycle: 24h delete)
```

```json
{
  "Rules": [
    { "ID": "DeleteTemp", "Filter": { "Prefix": "temp/" }, "Status": "Enabled",
      "Expiration": { "Days": 1 } },
    { "ID": "ArchiveOld", "Filter": { "Prefix": "uploads/" }, "Status": "Enabled",
      "Transitions": [
        { "Days": 90, "StorageClass": "STANDARD_IA" },
        { "Days": 365, "StorageClass": "GLACIER" }
      ] },
    { "ID": "CleanupMultipart", "Filter": {}, "Status": "Enabled",
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 } }
  ]
}
```

## Cost Optimization

| Strategy | Savings | How |
|---|---|---|
| R2 for high egress | 90-100% egress | Zero egress fees, built-in CDN |
| Storage tiering | 50-80% on old data | Lifecycle: Standard -> IA -> Glacier |
| Content-hash keys | Eliminates invalidation | New hash = new URL, no CDN purge |
| WebP/AVIF conversion | 30-50% bandwidth | Serve modern formats via CDN |
| Client-side compression | 40-60% upload BW | Compress before upload |

## Security

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://app.example.com"],
    "AllowedMethods": ["PUT", "POST"],
    "AllowedHeaders": ["Content-Type", "x-amz-meta-*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}
```

Key security rules: deny non-SSL access via bucket policy, use IAM roles (not root keys) for presigned URL generation, set `ContentLength` on presigned commands to prevent oversized uploads, and restrict CORS to your application domain only.

## Anti-Patterns

- **Proxying all uploads through your server**: Consumes bandwidth and memory for every file; use presigned URLs for direct client-to-storage uploads whenever files exceed a few hundred KB.
- **Using user-provided filenames as storage keys**: Filenames can contain path traversal (`../../etc`), duplicates, or special characters; always generate unique keys (UUID + date) and store original names as metadata.
- **Not validating magic bytes**: Client-reported MIME types are trivially spoofed; always verify file content matches the claimed type before processing.
- **Single bucket for all file types**: Mixing public assets, private uploads, and temp files complicates access control and lifecycle; use separate buckets or well-defined prefixes.
- **Forgetting incomplete multipart cleanup**: Abandoned multipart uploads incur storage costs indefinitely; always configure a lifecycle rule to abort them after 7 days.
- **CDN invalidation on every update**: Invalidations are expensive and slow; use content-hash filenames so each version has a unique URL that never needs purging.

## Related Skills

- [[csp-cicd-pipelines]] -- CI/CD integration for deploying storage infrastructure
- [[csp-infrastructure-as-code]] -- Terraform/Pulumi for provisioning storage buckets and CDN
- [[csp-backend-patterns]] -- Backend API patterns for upload endpoints and file management
- [[csp-security-review]] -- Security considerations for file upload and storage systems
