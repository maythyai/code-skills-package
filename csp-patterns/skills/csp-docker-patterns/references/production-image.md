# 生产镜像构建参考

`SKILL.md` 的 `## Production Image` 一节给判据，本文件给可复制的配置与踩坑细节。

---

## 1. 基础镜像选型

没有"最优基础镜像"，只有"你能接受哪种排障代价"。四条轴：**体积 / 攻击面 / 可调试性 / glibc 兼容性**。

| 基础镜像 | 典型体积 | Shell | 包管理 | glibc | 适用 | 不适用 |
|---|---|---|---|---|---|---|
| `gcr.io/distroless/static-debian12` | ~2 MB | ✗ | ✗ | ✗（静态链接） | 纯静态 Go/Rust 二进制 | 需要 CA 之外的任何系统库 |
| `gcr.io/distroless/base-debian12` | ~20 MB | ✗ | ✗ | ✓ | 动态链接但依赖少的服务 | 需要 `curl`/`sh` 排障的场景 |
| `gcr.io/distroless/python3` / `java` / `nodejs` | 40–200 MB | ✗ | ✗ | ✓ | 解释型语言运行时 | 需要装 pip/npm 依赖到镜像里 |
| `scratch` | 0 + 应用 | ✗ | ✗ | ✗ | 极简、完全自控 rootfs | 几乎全部真实服务（连 CA 证书都要自己 COPY） |
| `*-alpine`（musl） | 5–50 MB | ✓ `sh` | ✓ `apk` | ✗ musl | 需要 shell 排障、体积敏感 | DNS/并发行为依赖 glibc 的服务、含 C 扩展的 Python |
| `debian:12-slim` / `python:3.x-slim` | 30–150 MB | ✓ | ✓ `apt` | ✓ | 兼容性优先、默认选择 | 极致瘦身要求 |
| `registry.access.redhat.com/ubi9-minimal` | ~80 MB | ✓ | ✓ `microdnf` | ✓ | 需要商业支持与合规背书 | 无此需求时纯属额外体积 |

### 选型判据

1. **先问排障方式，再问体积。** distroless 无 shell，`docker exec -it ... sh` 直接失败。
   如果没有成熟的 sidecar 或 ephemeral container 流程，distroless 会把线上排障成本转嫁到事故现场。
2. **musl vs glibc 不是风格问题。** Alpine 的 musl 在这几处与 glibc 行为不同：
   - DNS 解析默认不支持 `search` 域叠加并发（曾导致大量 `getaddrinfo` 超时）
   - 无内置 locale，依赖 `LC_ALL`/排序的库会得到意外结果
   - C 扩展需要重新编译（Python `numpy`/`psycopg2`、Node native addon）
   踩过其中任一条，就不要用 alpine。
3. **distroless 的 CA 证书已内置**（`/etc/ssl/certs/ca-certificates.crt`），但 `/etc/passwd` 里
   只有 `root` 和 `nonroot`（uid 65532）。应用若假设 uid 1001 存在于 passwd 中（部分 Java/Node 库会读），
   要么改用 65532，要么自行 COPY 一份 passwd。

### distroless 的排障替代方案

```yaml
# Kubernetes ephemeral debug container —— 不改生产镜像即可拿到 shell
kubectl debug -it <pod> --image=debian:12-slim --target=app -- sh
```

```dockerfile
# 或保留一个 debug 构建目标，只在需要时构建
FROM gcr.io/distroless/base-debian12 AS production
COPY --from=build /app/server /server
ENTRYPOINT ["/server"]

FROM debian:12-slim AS debug
RUN apt-get update && apt-get install -y --no-install-recommends curl dnsutils iproute2 procps \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/server /server
ENTRYPOINT ["/server"]
```

`docker build --target debug` 出的镜像只用于开发环境，生产 CI 只允许 `--target production`。

---

## 2. 体积削减与层缓存

### 层缓存顺序：变动频率从低到高

```dockerfile
# ✗ 反例：任何源码改动都会让 npm ci 层失效
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# ✓ 正例：依赖层只在 lockfile 变动时重建
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

缓存判据：**把最常变的东西放最后**。源码 > 配置 > 依赖清单 > 系统包 > 基础镜像。

### 削减体积的具体手段

| 手段 | 典型收益 | 备注 |
|---|---|---|
| 多阶段构建，最终阶段只 COPY 产物 | 50–90% | 最有效的一招，其他都是补充 |
| `npm ci --omit=dev` / `pip install --no-cache-dir` | 10–40% | `--no-cache-dir` 防止 pip 缓存进层 |
| `apt-get install --no-install-recommends` + `rm -rf /var/lib/apt/lists/*` | 20–50% | 两条必须在**同一个 RUN** 里，分层删不掉已写入的层 |
| Go: `-ldflags="-s -w"` + `CGO_ENABLED=0` | 25–30% | 去掉符号表和 DWARF，代价是不能用 delve 调试 |
| 只 COPY 需要的文件，而非 `COPY . .` | 视仓库 | 配合 `.dockerignore` |
| `--mount=type=cache` 复用构建缓存 | 不减体积，减构建时间 | 需要 BuildKit |

```dockerfile
# 同一个 RUN 内完成安装与清理 —— 分两个 RUN 则体积不会下降
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
```

```dockerfile
# BuildKit 缓存挂载：跨构建复用 apt/pip/npm 缓存，不进最终层
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends build-essential
```

### 度量而不是猜

```bash
# 每层体积
docker history --no-trunc --format 'table {{.Size}}\t{{.CreatedBy}}' <image> | head -20

# 逐层文件树 + 重复文件检测
docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock <dive-image> <image>

# 两个镜像的体积对比（CI 里做回归门禁）
docker image inspect <image> --format '{{.Size}}'
```

给 CI 一个体积预算（如 ≤ 256 MB），超出即失败。没有门禁的瘦身会在两周内被回退。

---

## 3. 只读根文件系统实战

`read_only: true` 会让**任何**对 rootfs 的写入失败。上线前必须逐一确认这些写入点：

| 常见写入点 | 症状 | 处理 |
|---|---|---|
| `/tmp` | `OSError: [Errno 30] Read-only file system` | `tmpfs: [/tmp]` |
| 应用缓存目录（`/app/.cache`、`~/.npm`、`~/.cache/pip`） | 性能下降或启动失败 | tmpfs 挂载，或改环境变量指向可写路径 |
| `/var/run`、`/run` | PID 文件、socket 写入失败 | tmpfs 挂载 |
| `/var/log/<app>` | 日志写文件失败 | 改为写 stdout（容器日志的正确姿势） |
| `/etc/ssl/certs`（某些运行时启动时写） | TLS 初始化失败 | 只读挂载 CA 卷 |
| Java `/tmp/.java_pidNNN`（attach 机制） | jcmd/jstack 无法 attach | tmpfs `/tmp` 即可 |
| SQLite / 本地文件数据库 | 写事务失败 | 必须挂 volume，不能靠 tmpfs（重启丢数据） |

```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp:size=64M,mode=1777
      - /app/.cache:size=256M
      - /run:size=8M
    volumes:
      - appdata:/var/lib/app          # 真正需要持久化的数据
```

**tmpfs 计入容器内存配额。** `size=256M` 的 tmpfs 写满会同时吃掉 memory limit 并触发 OOMKill，
症状看起来像内存泄漏。给 tmpfs 显式 size，并让它远小于 memory limit。

### 渐进式收紧

一次性开 `read_only` 通常失败。推荐顺序：

1. 先开 `security_opt: [no-new-privileges:true]` —— 几乎无副作用
2. 再开 `cap_drop: [ALL]` + 按需 `cap_add` —— 常见坑是绑定 <1024 端口需要 `NET_BIND_SERVICE`
3. 然后 `read_only: true` + 全量 tmpfs —— 在 staging 跑满一个业务周期
4. 最后收紧 `seccomp` / `apparmor` profile

每一步单独上线，出问题能定位到具体那一步。

---

## 4. 漏洞扫描与 SBOM

### 扫描

```bash
# Trivy：文件系统 / 镜像 / 仓库一体
trivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed <image>

# 只报告"有修复版本可用"的漏洞 —— 否则 CI 会长期红着没人看
trivy image --ignore-unfixed --format json --output trivy.json <image>
```

`--ignore-unfixed` 是扫描能落地的关键。不加它，一个基础镜像里的无修复 CVE 会让所有 PR 永久失败，
团队三周后就会把扫描从流水线里删掉。

**门禁设计：**
- `CRITICAL` + 有修复 → 阻断合并
- `HIGH` + 有修复 → 阻断发布，不阻断合并（给修复窗口）
- 无修复版本 → 记录到例外清单，写明缓解措施与复审日期
- 例外清单必须有到期日。永不到期的例外清单等于没有扫描。

### SBOM

```bash
# SPDX 格式（工具生态最广）
syft <image> -o spdx-json=sbom.spdx.json

# CycloneDX 格式（依赖漏洞关联更好）
syft <image> -o cyclonedx-json=sbom.cdx.json

# 直接用 trivy 生成
trivy image --format cyclonedx --output sbom.cdx.json <image>
```

SBOM 的价值不在生成，在于**可查询**：某个依赖爆出漏洞时，能在几分钟内回答"哪些在跑的镜像含它"。
把 SBOM 作为构建产物与镜像一起归档（同一 tag / digest），否则事后无法重建。

---

## 5. Dockerfile Lint

```bash
hadolint Dockerfile

# CI 中作为门禁
hadolint --failure-threshold warning Dockerfile
```

hadolint 会捕获的高频问题：

| 规则 | 含义 |
|---|---|
| `DL3008` | `apt-get install` 未锁版本 |
| `DL3009` | 未清理 apt 列表 |
| `DL3015` | 未用 `--no-install-recommends` |
| `DL3018` | `apk add` 未清理缓存 |
| `DL3025` | JSON 形式的 `CMD`/`ENTRYPOINT` 未使用 |
| `DL3042` | `pip install` 未加 `--no-cache-dir` |
| `DL3059` | 连续多个 `RUN`（应合并以减少层） |
| `DL4006` | 未设置 `SHELL` 的 pipefail（`RUN a \| b` 会吞掉 a 的失败） |

`DL4006` 是最危险的一条：

```dockerfile
# ✗ curl 失败会被 sh 吞掉，构建"成功"但产物是空的
RUN curl -fsSL https://example.com/tool.tar.gz | tar xz

# ✓
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN curl -fsSL https://example.com/tool.tar.gz | tar xz
```

---

## 6. 可复现构建与 digest 固定

**tag 是可变的，digest 不是。** `node:22-alpine` 今天和明天可能指向不同内容。

```dockerfile
# 固定到 digest —— 唯一能保证"同一 Dockerfile 出同一镜像"的写法
FROM node:22.12-alpine3.20@sha256:<64位十六进制>
```

获取 digest：

```bash
docker buildx imagetools inspect node:22.12-alpine3.20 \
  --format '{{.Manifest.Digest}}'
```

代价：无法自动获得基础镜像的安全更新。配套做法是用 Renovate/Dependabot 之类的工具
定期提 digest 升级 PR，让升级成为一次可审查的变更，而不是构建时的随机事件。

### 其他可复现要素

- `docker build --pull` 会强制拉取最新 tag，**破坏**可复现性；固定 digest 后不要加 `--pull`
- 构建时间戳：避免 `RUN date > /build-time`；需要构建元数据用 `--build-arg` + `LABEL`，
  且知晓 LABEL 值变化会使该层及之后所有层失效
- 构建平台：跨架构（amd64/arm64）产物不同，CI 必须显式 `--platform`
- BuildKit 的 `--mount=type=cache` 不进层，但缓存内容影响构建结果 —— 依赖 lockfile 的构建才安全

---

## 7. HEALTHCHECK 设计

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
```

### 参数取值判据

| 参数 | 常见错误 | 判据 |
|---|---|---|
| `--interval` | 设成 5s | 健康检查本身是负载。30s 起步；探测开销大就放到 60s |
| `--timeout` | 默认 30s（太长） | 必须**远小于** interval，否则探测会堆积。3–5s |
| `--start-period` | 不设 | 冷启动期间失败不计数。设为 P99 启动耗时 × 1.5 |
| `--retries` | 设成 1 | 单次网络抖动即判死。3 次是合理下限 |

### 三个容易踩的坑

1. **distroless / scratch 里没有 shell，也没有 `curl`/`wget`。**
   `CMD wget ...` 在这类镜像里直接失败。用 exec 形式调用应用运行时自身：
   `CMD ["node", "-e", "..."]`、`CMD ["/app/healthcheck"]`（一个专门编译进去的静态二进制）。

2. **健康检查要打真实依赖，还是只打进程存活？**
   Docker 的 `HEALTHCHECK` 语义是"这个容器能否被摘掉重启"，**不是**"这个服务能否对外提供能力"。
   把数据库连通性放进 Docker HEALTHCHECK，会导致 DB 抖动时**全部** app 容器被判定不健康并重启，
   把局部故障放大成全局故障。
   - Docker HEALTHCHECK：只检查进程与 HTTP 端口存活（liveness 语义）
   - 依赖连通性：交给编排层（Kubernetes readiness probe）或监控系统

3. **健康检查端点本身要有成本上限。**
   `/health` 里做全表扫描或调用下游，会让每 30s 一次的探测变成周期性负载尖峰。
   两个端点分工：`/health/live`（永远 200，只要进程在）与 `/health/ready`（检查依赖，供 readiness 用）。

---

## 8. 交付前自检

```bash
# 体积
docker image inspect <image> --format '{{.Size}}' | numfmt --to=iec

# 运行用户不是 root
docker inspect <image> --format '{{.Config.User}}'

# 没有 :latest
grep -n 'FROM' Dockerfile | grep -c ':latest'   # 期望 0

# lint
hadolint Dockerfile

# 扫描（只报可修复项）
trivy image --ignore-unfixed --severity HIGH,CRITICAL --exit-code 1 <image>

# SBOM 已归档
syft <image> -o spdx-json=sbom.spdx.json
```
