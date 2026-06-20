---
name: csp-vps-deploy
description: >
  Deploy and manage applications on VPS servers with Nginx reverse proxy, SSL, systemd services, and security hardening for solo developers.
version: 0.1.0
layer: 4
category: patterns
---

# VPS Deployment and Server Management

Deploy applications to a virtual private server with Nginx reverse proxy, automated SSL, process management, security hardening, and backup automation.

## When to Activate

- Provisioning a new VPS for a web application
- Setting up Nginx as a reverse proxy with SSL termination
- Configuring systemd services for long-running applications
- Hardening server security (firewall, SSH, fail2ban)
- Setting up automated backups via cron or systemd timers
- Troubleshooting server performance or deployment issues

## Provider Comparison

| Feature          | DigitalOcean  | Linode (Akamai) | Hetzner       | Vultr          |
|------------------|---------------|-----------------|---------------|----------------|
| Cheapest VPS     | $4/mo (512MB) | $5/mo (1GB)     | EUR 3.99/mo   | $2.50/mo       |
| Best value       | $12/mo (2GB)  | $12/mo (2GB)    | EUR 7.49/mo (4GB) | $6/mo (1GB) |
| Locations        | 15 regions    | 11 regions      | 6 (EU+US)     | 32 locations   |
| Managed DB       | Yes           | Yes             | No            | Yes            |
| Object storage   | Spaces ($5/mo)| Object Storage  | Storage Boxes | Object Storage |
| Backups          | 20% of droplet cost | 20% of linode cost | Included in some plans | $2/mo+ |
| API quality      | Excellent     | Good            | Good          | Good           |
| IPv6             | Yes           | Yes             | Yes           | Yes            |

### Provider Decision Guide

- **DigitalOcean**: Best documentation, great API, managed databases, ideal for first-time VPS users
- **Hetzner**: Best price-to-performance ratio, excellent for CPU/RAM-heavy workloads, EU-focused
- **Linode**: Good balance of price and features, strong community, reliable network
- **Vultr**: Most locations worldwide, hourly billing, good for burst workloads

## Initial Server Setup

### User Creation and SSH Key Authentication

```bash
# Connect as root initially
ssh root@your-server-ip

# Create deploy user with sudo
adduser deploy
usermod -aG sudo deploy

# Set up SSH key auth
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# Copy your public key
echo "ssh-ed25519 AAAA..." >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Disable root login and password auth
# Edit /etc/ssh/sshd_config
```

```bash
# /etc/ssh/sshd_config hardening
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
```

```bash
# Restart SSH (keep your current session open!)
systemctl restart sshd
# Test new connection in a separate terminal before closing
ssh deploy@your-server-ip
```

### Firewall Configuration (UFW)

```bash
# Enable UFW with safe defaults
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Optional: allow specific IPs for admin
ufw allow from 1.2.3.4 to any port 22 comment 'Admin SSH'

# Enable firewall
ufw enable
ufw status verbose
```

## Nginx Reverse Proxy

### Basic Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/myapp
upstream myapp_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to application
    location / {
        proxy_pass http://myapp_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }

    # Static file caching
    location /static/ {
        alias /var/www/myapp/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://myapp_backend;
    }
}
```

### Enable the Site

```bash
ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Load Balancing (Multiple Backends)

```nginx
upstream myapp_cluster {
    least_conn;
    server 127.0.0.1:3000 weight=3;
    server 127.0.0.1:3001 weight=2;
    server 127.0.0.1:3002 backup;
}
```

### Response Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=myapp_cache:10m max_size=1g inactive=60m;

server {
    location /api/public/ {
        proxy_cache myapp_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status $upstream_cache_status;
        proxy_pass http://myapp_backend;
    }
}
```

## Systemd Service Management

### Node.js Application Service

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/var/www/myapp
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60

# Environment
Environment=NODE_ENV=production
EnvironmentFile=/var/www/myapp/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/myapp/data /var/log/myapp
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

### Python Application with Gunicorn

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Python Application
After=network.target

[Service]
Type=notify
User=deploy
Group=deploy
WorkingDirectory=/var/www/myapp
ExecStart=/var/www/myapp/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile - \
    --error-logfile - \
    myapp.asgi:application
Restart=on-failure
RestartSec=5
EnvironmentFile=/var/www/myapp/.env

[Install]
WantedBy=multi-user.target
```

### Managing Services

```bash
# Enable and start
systemctl daemon-reload
systemctl enable myapp
systemctl start myapp

# Monitor
systemctl status myapp
journalctl -u myapp -f --no-pager

# Restart after deploy
systemctl restart myapp
```

## Let's Encrypt SSL with Certbot

### Installation and Certificate Issuance

```bash
# Install Certbot with Nginx plugin
apt install certbot python3-certbot-nginx

# Issue certificate (Nginx plugin auto-configures)
certbot --nginx -d example.com -d www.example.com

# Or standalone (if Nginx is not running)
certbot certonly --standalone -d example.com

# Wildcard certificate (requires DNS validation)
certbot certonly --manual --preferred-challenges dns -d "*.example.com" -d "example.com"
# Add the TXT record certbot requests, then continue
```

### Auto-Renewal Verification

```bash
# Certbot auto-renewal is installed by default. Verify:
systemctl status certbot.timer

# Test renewal without actually renewing
certbot renew --dry-run

# Add post-renewal hook to reload Nginx
echo '#!/bin/bash
systemctl reload nginx' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

## Deployment Patterns

### Blue-Green Deployment

```bash
#!/bin/bash
# deploy.sh — blue-green deployment
set -euo pipefail

APP_DIR="/var/www/myapp"
BLUE_DIR="${APP_DIR}-blue"
GREEN_DIR="${APP_DIR}-green"
CURRENT=$(readlink -f "$APP_DIR" 2>/dev/null || echo "$BLUE_DIR")

if [[ "$CURRENT" == *"-blue" ]]; then
  TARGET="$GREEN_DIR"
  NGINX_UPSTREAM="127.0.0.1:3001"
  OLD_UPSTREAM="127.0.0.1:3000"
else
  TARGET="$BLUE_DIR"
  NGINX_UPSTREAM="127.0.0.1:3000"
  OLD_UPSTREAM="127.0.0.1:3001"
fi

# 1. Deploy to inactive slot
cd "$TARGET"
git fetch origin && git reset --hard origin/main
npm ci --production
npm run build

# 2. Start new instance
PORT=$(echo "$NGINX_UPSTREAM" | cut -d: -f2)
PORT=$PORT systemctl start myapp-next

# 3. Health check
for i in {1..10}; do
  if curl -sf "http://$NGINX_UPSTREAM/health" > /dev/null; then
    echo "Health check passed"
    break
  fi
  sleep 2
done

# 4. Switch Nginx upstream
sed -i "s|$OLD_UPSTREAM|$NGINX_UPSTREAM|g" /etc/nginx/sites-available/myapp
nginx -t && systemctl reload nginx

# 5. Stop old instance
PORT=$(echo "$OLD_UPSTREAM" | cut -d: -f2)
PORT=$PORT systemctl stop myapp-next

echo "Deployed to $TARGET successfully"
```

### Simple Rolling Deploy

```bash
#!/bin/bash
# Simple deploy: pull, install, build, restart
set -euo pipefail

cd /var/www/myapp
git fetch origin && git reset --hard origin/main
npm ci --production
npm run build
systemctl restart myapp

# Verify
sleep 3
if curl -sf http://127.0.0.1:3000/health > /dev/null; then
  echo "Deploy successful"
else
  echo "Health check failed, rolling back"
  git reflog | head -1
  git reset --hard HEAD@{1}
  npm ci --production && npm run build
  systemctl restart myapp
fi
```

## Process Managers

### PM2 (Node.js)

```bash
# Install
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # generates systemd unit

# Monitor
pm2 status
pm2 logs --lines 100
pm2 monit
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    script: 'dist/server.js',
    instances: 'max',        // cluster mode
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
```

### When to Use Which

| Manager  | Best For                     | Overhead | Clustering |
|----------|------------------------------|----------|------------|
| systemd  | Any language, production use | Minimal  | Manual     |
| PM2      | Node.js apps, quick setup    | Low      | Built-in   |
| Gunicorn | Python WSGI/ASGI apps        | Low      | Built-in   |
| Supervisor | Multiple processes, legacy | Low      | No         |

## Log Management

### journalctl Commands

```bash
# View recent logs
journalctl -u myapp --since "1 hour ago" --no-pager

# Follow logs in real-time
journalctl -u myapp -f --no-pager

# Filter by priority
journalctl -u myapp -p err --no-pager     # errors only
journalctl -u myapp -p warning --no-pager # warnings+

# Search logs
journalctl -u myapp --grep "500" --no-pager

# Disk usage
journalctl --disk-usage
journalctl --vacuum-size=500M   # keep last 500MB
```

### Logrotate Configuration

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
```

## Security Hardening

### Fail2ban Configuration

```bash
apt install fail2ban
```

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
```

```bash
systemctl enable fail2ban
systemctl start fail2ban
fail2ban-client status
fail2ban-client status sshd
```

### Automatic Security Updates

```bash
apt install unattended-upgrades
```

```bash
# /etc/apt/apt.conf.d/20auto-upgrades
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
```

### Port Management

```bash
# Check what's listening
ss -tlnp

# Only expose what Nginx needs externally
ufw status numbered
# Remove unnecessary rules
ufw delete <rule-number>
```

## Backup Automation

### File-Level Backups

```bash
#!/bin/bash
# /usr/local/bin/backup-files.sh
set -euo pipefail

BACKUP_DIR="/var/backups/myapp"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Backup application data
tar -czf "${BACKUP_DIR}/files_${TIMESTAMP}.tar.gz" \
  /var/www/myapp/data \
  /var/www/myapp/uploads \
  /etc/nginx/sites-available

# Sync to remote (S3-compatible)
aws s3 sync "$BACKUP_DIR" s3://my-backups/server/ \
  --endpoint-url https://s3.us-east-1.amazonaws.com \
  --storage-class STANDARD_IA

# Remove old local backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: files_${TIMESTAMP}.tar.gz"
```

### Database Backups via Cron

```bash
# /etc/cron.d/myapp-backups
# PostgreSQL backup — daily at 2 AM
0 2 * * * deploy /usr/local/bin/backup-postgres.sh
# File backup — daily at 3 AM
0 3 * * * deploy /usr/local/bin/backup-files.sh
```

```bash
#!/bin/bash
# /usr/local/bin/backup-postgres.sh
set -euo pipefail

BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="myapp_production"

mkdir -p "$BACKUP_DIR"

pg_dump -Fc -Z 9 "$DB_NAME" > "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump" \
  s3://my-backups/postgres/ \
  --storage-class GLACIER

# Cleanup old backups (keep last 7)
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
```

## Anti-Patterns

- **Running applications as root**: Always create a dedicated deploy user. Running as root means a compromised application gives the attacker full system access.
- **Disabling the firewall for debugging and forgetting to re-enable**: If you need to open a port temporarily, set a reminder. Use `ufw allow from <your-ip>` instead of disabling the firewall entirely.
- **Storing secrets in plaintext configuration files**: Use systemd's `EnvironmentFile` with restricted permissions (`chmod 600`), or a secrets manager. Never put secrets in version-controlled files.
- **Skipping SSL certificate auto-renewal testing**: Run `certbot renew --dry-run` after initial setup. Expired certificates are a common cause of production outages on VPS-managed servers.
- **Not monitoring disk space**: Logs, backups, and Docker images fill disks silently. Set up `df` monitoring with alerts, and configure logrotate for all log-producing services.
- **Using FTP instead of SFTP/SCP**: FTP transmits credentials in plaintext. Always use SSH-based file transfer (SFTP or SCP) which inherits SSH encryption.

## Related Skills

- [[csp-platform-deploy]]
- [[csp-monitoring-alerting]]
- [[csp-db-backup]]
