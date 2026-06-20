---
name: csp-db-backup
description: >
  Implement automated database backup and point-in-time recovery for PostgreSQL and MySQL with encryption, verification, and disaster recovery runbooks.
version: 0.1.0
layer: 4
category: patterns
---

# Database Backup and Recovery

Implement reliable database backup strategies with automated scheduling, remote storage, encryption, verification testing, and step-by-step disaster recovery procedures.

## When to Activate

- Setting up automated database backups for PostgreSQL or MySQL
- Implementing point-in-time recovery (PITR) for production databases
- Configuring remote backup storage (S3, B2, secondary server)
- Planning RTO/RPO targets for a solo-developer project
- Writing a disaster recovery runbook
- Verifying backup integrity through automated restore testing

## Backup Strategy Matrix

| Strategy        | Type      | RPO            | RTO            | Storage    | Best For                |
|-----------------|-----------|----------------|----------------|------------|-------------------------|
| pg_dump/mysqldump | Logical  | Hours (daily)  | Minutes-hours  | Small      | Small DBs (<10GB), migrations |
| WAL archiving   | Physical  | Minutes        | Minutes-hours  | Medium     | Production PostgreSQL   |
| pg_basebackup   | Physical  | Hours (daily)  | Minutes        | Large      | Full cluster restore    |
| XtraBackup      | Physical  | Minutes (incr) | Minutes        | Medium     | Production MySQL        |
| pgBackRest      | Physical  | Minutes        | Minutes        | Medium     | Best-in-class PostgreSQL|
| Snapshots       | Physical  | Minutes        | Seconds        | Depends    | Cloud-managed databases |

### Decision Guide

```
What database engine?
  PostgreSQL ->
    DB size < 5GB?  -> pg_dump (daily) + WAL archiving (continuous)
    DB size 5-100GB? -> pgBackRest (full + incremental + WAL)
    DB size > 100GB? -> pgBackRest with parallel backup + S3
    Managed (RDS)?   -> Automated snapshots + PITR (built-in)

  MySQL ->
    DB size < 5GB?  -> mysqldump (daily) + binlog (continuous)
    DB size 5-100GB? -> Percona XtraBackup (full + incremental)
    DB size > 100GB? -> XtraBackup with parallel + S3
    Managed (RDS)?   -> Automated snapshots + PITR (built-in)
```

## PostgreSQL Backups

### Logical Backups with pg_dump

```bash
# Full database dump (custom format, compressed)
pg_dump -Fc -Z 9 -d myapp_production -f /backups/myapp_$(date +%Y%m%d_%H%M%S).dump

# Full cluster dump (all databases + roles)
pg_dumpall -f /backups/cluster_$(date +%Y%m%d_%H%M%S).sql

# Dump specific schema only
pg_dump -Fc -n public -d myapp_production -f /backups/public_$(date +%Y%m%d).dump

# Dump with parallel workers (faster for large DBs)
pg_dump -Fd -j 4 -d myapp_production -f /backups/myapp_dir_$(date +%Y%m%d)/

# Restore from custom format dump
pg_restore -d myapp_restored -j 4 /backups/myapp_20240115.dump

# Restore to a different database
pg_restore -C -d postgres /backups/myapp_20240115.dump
```

### pg_basebackup (Physical Backup)

```bash
# Full physical backup
pg_basebackup -D /backups/base_$(date +%Y%m%d) \
  -Ft -z -P \
  --checkpoint=fast \
  --wal-method=stream

# With progress and label
pg_basebackup -D /backups/base_$(date +%Y%m%d) \
  -Ft -z -P -v \
  --checkpoint=fast \
  --label="weekly_backup_$(date +%Y%m%d)"
```

### WAL Archiving Configuration

```ini
# postgresql.conf — enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /wal_archive/%f && cp %p /wal_archive/%f'
archive_timeout = 300   # force archive every 5 minutes
```

```bash
# WAL archive cleanup (keep last 7 days)
find /wal_archive -name "*.backup" -mtime +7 -delete
find /wal_archive -name "0*" -mtime +7 -delete
```

### pgBackRest (Recommended for Production)

```ini
# /etc/pgbackrest/pgbackrest.conf
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=7
repo1-type=s3
repo1-s3-bucket=my-db-backups
repo1-s3-region=us-east-1
repo1-s3-endpoint=s3.amazonaws.com
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=ENCRYPTION_KEY_HERE

[myapp]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432

[global:archive-push]
compress-type=zst
compress-level=3
```

```bash
# Initialize the repository
pgbackrest --stanza=myapp stanza-create

# Full backup
pgbackrest --stanza=myapp --type=full backup

# Differential backup (only changed files)
pgbackrest --stanza=myapp --type=diff backup

# Incremental backup
pgbackrest --stanza=myapp --type=incr backup

# Point-in-time restore
pgbackrest --stanza=myapp \
  --type=time \
  --target="2024-01-15 14:30:00" \
  --target-action=promote \
  restore

# Verify backup integrity
pgbackrest --stanza=myapp info
```

## MySQL Backups

### Logical Backups

```bash
# mysqldump — full database
mysqldump --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF \
  myapp_production | gzip > /backups/myapp_$(date +%Y%m%d).sql.gz

# All databases
mysqldump --all-databases --single-transaction --routines --triggers \
  | gzip > /backups/all_dbs_$(date +%Y%m%d).sql.gz

# mysqlpump — parallel dump (MySQL 5.7+)
mysqlpump --default-parallelism=4 \
  --single-transaction \
  --set-gtid-purged=OFF \
  myapp_production > /backups/myapp_pump_$(date +%Y%m%d).sql

# Restore
gunzip < /backups/myapp_20240115.sql.gz | mysql myapp_restored
```

### Percona XtraBackup (Physical)

```bash
# Full backup
xtrabackup --backup \
  --target-dir=/backups/full_$(date +%Y%m%d) \
  --user=root --password=secret

# Prepare the backup (apply WAL)
xtrabackup --prepare --target-dir=/backups/full_$(date +%Y%m%d)

# Incremental backup
xtrabackup --backup \
  --target-dir=/backups/incr_$(date +%Y%m%d) \
  --incremental-basedir=/backups/full_$(date +%Y%m%d) \
  --user=root --password=secret

# Restore (stop MySQL first)
systemctl stop mysql
rm -rf /var/lib/mysql/*
xtrabackup --copy-back --target-dir=/backups/full_$(date +%Y%m%d)
chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

## Automated Backup Scheduling

### Cron Jobs

```bash
# /etc/cron.d/db-backups

# PostgreSQL — daily full backup at 2 AM
0 2 * * * postgres /usr/local/bin/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1

# PostgreSQL — WAL archive cleanup weekly
0 4 * * 0 postgres find /wal_archive -mtime +7 -delete >> /var/log/backup-cleanup.log 2>&1

# MySQL — daily backup at 3 AM
0 3 * * * mysql /usr/local/bin/backup-mysql.sh >> /var/log/backup-mysql.log 2>&1
```

### Systemd Timers (More Reliable)

```ini
# /etc/systemd/system/db-backup.service
[Unit]
Description=Database Backup

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/backup-postgres.sh
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/db-backup.timer
[Unit]
Description=Daily Database Backup Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
systemctl enable --now db-backup.timer
systemctl list-timers --no-pager
```

## Remote Backup Storage

### S3-Compatible Storage

```bash
#!/bin/bash
# upload-to-s3.sh — upload backup to S3
set -euo pipefail

BACKUP_FILE="$1"
S3_BUCKET="${2:-my-db-backups}"
S3_PREFIX="${3:-postgres}"

# Upload with server-side encryption
aws s3 cp "$BACKUP_FILE" \
  "s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "$BACKUP_FILE")" \
  --storage-class STANDARD_IA \
  --sse aws:kms \
  --expected-bucket-owner "123456789012"

echo "Uploaded $(basename "$BACKUP_FILE") to s3://${S3_BUCKET}/${S3_PREFIX}/"
```

### Backblaze B2

```bash
#!/bin/bash
# upload-to-b2.sh — upload to Backblaze B2
set -euo pipefail

BACKUP_FILE="$1"
B2_BUCKET="my-db-backups"
B2_PREFIX="postgres"

# Upload via B2 CLI
b2 upload-file "$B2_BUCKET" \
  "$BACKUP_FILE" \
  "${B2_PREFIX}/$(basename "$BACKUP_FILE")"

echo "Uploaded to B2: ${B2_PREFIX}/$(basename "$BACKUP_FILE")"
```

### Rsync to Secondary Server

```bash
#!/bin/bash
# rsync-backup.sh — replicate to secondary server
set -euo pipefail

BACKUP_DIR="/var/backups/postgres"
REMOTE_HOST="backup.example.com"
REMOTE_DIR="/backups/primary-db"
SSH_KEY="/home/deploy/.ssh/backup_key"

rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$BACKUP_DIR/" \
  "deploy@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "Rsync complete to ${REMOTE_HOST}:${REMOTE_DIR}"
```

## Backup Encryption

### Using age (Recommended)

```bash
# Install age
apt install age   # or brew install age

# Generate key pair
age-keygen -o /etc/backup/age-key.txt
# Public key: age1xxxxxxxx...

# Encrypt backup
age -r "age1xxxxxxxx..." \
  -o /backups/myapp_$(date +%Y%m%d).dump.age \
  /backups/myapp_$(date +%Y%m%d).dump

# Decrypt for restore
age -d -i /etc/backup/age-key.txt \
  -o /tmp/myapp_restored.dump \
  /backups/myapp_20240115.dump.age
```

### Using GPG

```bash
# Generate key
gpg --gen-key

# Encrypt
gpg --batch --yes --trust-model always \
  --recipient "backup@example.com" \
  --output /backups/myapp_$(date +%Y%m%d).dump.gpg \
  --encrypt /backups/myapp_$(date +%Y%m%d).dump

# Decrypt
gpg --batch --yes --passphrase-file /etc/backup/gpg-passphrase \
  --output /tmp/restored.dump \
  --decrypt /backups/myapp_20240115.dump.gpg
```

## Point-in-Time Recovery (PITR)

### PostgreSQL PITR Implementation

```bash
#!/bin/bash
# pitr-restore.sh — restore PostgreSQL to a specific point in time
set -euo pipefail

TARGET_TIME="${1:?Usage: pitr-restore.sh '2024-01-15 14:30:00'}"
BACKUP_DIR="/var/backups/postgres"
PG_DATA="/var/lib/postgresql/16/main"
WAL_ARCHIVE="/wal_archive"

echo "Starting PITR to: $TARGET_TIME"

# 1. Stop PostgreSQL
systemctl stop postgresql

# 2. Find the most recent base backup before target time
BASE_BACKUP=$(ls -dt ${BACKUP_DIR}/base_* | head -1)
echo "Using base backup: $BASE_BACKUP"

# 3. Clear current data directory
rm -rf "${PG_DATA:?}"/*

# 4. Restore base backup
tar -xzf "$BASE_BACKUP" -C "$PG_DATA"

# 5. Create recovery configuration
cat > "$PG_DATA/postgresql.auto.conf" <<EOF
restore_command = 'cp ${WAL_ARCHIVE}/%f %p'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# 6. Create recovery signal file
touch "$PG_DATA/recovery.signal"

# 7. Set correct ownership
chown -R postgres:postgres "$PG_DATA"

# 8. Start PostgreSQL (it will replay WAL to target time)
systemctl start postgresql

echo "PITR initiated. PostgreSQL is replaying WAL to $TARGET_TIME"
echo "Monitor progress: tail -f /var/log/postgresql/postgresql-16-main.log"
```

### MySQL PITR with Binlog

```bash
#!/bin/bash
# mysql-pitr.sh — restore MySQL to a specific point in time
set -euo pipefail

TARGET_TIME="${1:?Usage: mysql-pitr.sh '2024-01-15 14:30:00'}"
BACKUP_DIR="/var/backups/mysql"
BINLOG_DIR="/var/lib/mysql"

echo "Starting MySQL PITR to: $TARGET_TIME"

# 1. Stop MySQL
systemctl stop mysql

# 2. Restore latest full backup
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/full_*.sql.gz | head -1)
rm -rf /var/lib/mysql/*
# (restore full backup process here)
systemctl start mysql
gunzip < "$LATEST_BACKUP" | mysql

# 3. Find binlog position from backup
# The backup file contains the binlog position header
BINLOG_FILE=$(head -1 "$LATEST_BACKUP" | grep -oP 'CHANGE MASTER TO.*?MASTER_LOG_FILE=\K[^,]+')
BINLOG_POS=$(head -1 "$LATEST_BACKUP" | grep -oP 'MASTER_LOG_POS=\K[0-9]+')

# 4. Apply binlog events up to target time
mysqlbinlog \
  --start-position="$BINLOG_POS" \
  --stop-datetime="$TARGET_TIME" \
  ${BINLOG_DIR}/mysql-bin.* | mysql

echo "MySQL PITR complete to $TARGET_TIME"
```

## Backup Verification

### Automated Restore Testing

```bash
#!/bin/bash
# verify-backup.sh — test backup integrity by restoring to a temp database
set -euo pipefail

BACKUP_FILE="${1:?Usage: verify-backup.sh <backup-file>}"
VERIFY_DB="backup_verify_$(date +%s)"
PG_HOST="localhost"

echo "=== Backup Verification ==="
echo "Backup file: $BACKUP_FILE"
echo "Verify DB: $VERIFY_DB"

# 1. Create temporary database
createdb "$VERIFY_DB"

# 2. Restore backup
echo "Restoring..."
pg_restore -d "$VERIFY_DB" -j 4 --no-owner "$BACKUP_FILE" 2>&1 | tee /tmp/restore.log

# 3. Run integrity checks
echo "Running integrity checks..."

# Check table counts match expected
TABLE_COUNT=$(psql -d "$VERIFY_DB" -tAc "
  SELECT count(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
")
echo "Tables found: $TABLE_COUNT"

# Check for empty tables that shouldn't be empty
EMPTY_CRITICAL=$(psql -d "$VERIFY_DB" -tAc "
  SELECT count(*) FROM (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN ('users', 'orders', 'payments')
  ) t
  JOIN LATERAL (
    SELECT count(*) as cnt FROM t.tablename::regclass
  ) c ON c.cnt = 0
" 2>/dev/null || echo "0")
echo "Empty critical tables: $EMPTY_CRITICAL"

# 4. Check row counts
echo "Row counts:"
psql -d "$VERIFY_DB" -c "
  SELECT schemaname, relname, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 10
"

# 5. Cleanup
dropdb "$VERIFY_DB"

if [[ "$TABLE_COUNT" -gt 0 && "$EMPTY_CRITICAL" -eq "0" ]]; then
  echo "=== VERIFICATION PASSED ==="
else
  echo "=== VERIFICATION FAILED ==="
  exit 1
fi
```

### Scheduled Verification

```ini
# /etc/systemd/system/backup-verify.service
[Unit]
Description=Backup Verification

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/verify-backup.sh /var/backups/postgres/latest.dump
```

```ini
# /etc/systemd/system/backup-verify.timer
[Unit]
Description=Weekly Backup Verification

[Timer]
OnCalendar=Sun *-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

## RTO/RPO Planning

### Definitions for Solo Developers

| Term | Meaning                              | Solo Dev Target         |
|------|--------------------------------------|-------------------------|
| RPO  | Maximum acceptable data loss window  | 1 hour (WAL) to 24 hours (daily dump) |
| RTO  | Maximum acceptable downtime for recovery | 1-4 hours           |
| MTTR | Mean time to repair                  | Measure this over time  |

### Backup Schedule Recommendation

| Backup Type           | Frequency    | Retention | Storage     |
|-----------------------|--------------|-----------|-------------|
| WAL/Binlog archiving  | Continuous   | 7 days    | Local + S3  |
| Full logical dump     | Daily at 2AM | 30 days   | Local + S3  |
| Full physical backup  | Weekly       | 4 weeks   | S3 (Glacier)|
| Restore verification  | Weekly       | N/A       | Temp DB     |

## Disaster Recovery Runbook

### Step-by-Step: Full Database Restore

```markdown
## Disaster Recovery Runbook: PostgreSQL Full Restore

### Prerequisites
- [ ] Access to backup storage (S3 credentials or local backup path)
- [ ] Access to encryption key (age/GPG key file)
- [ ] PostgreSQL installed and stopped
- [ ] Sufficient disk space for restore

### Steps

1. **Assess the situation** (5 min)
   - Determine failure type: data corruption, hardware failure, accidental deletion
   - Decide: full restore or point-in-time recovery?
   - Notify users of maintenance window

2. **Stop the application** (1 min)
   ```bash
   systemctl stop myapp
   ```

3. **Retrieve latest backup** (5-30 min)
   ```bash
   # From S3
   aws s3 cp s3://my-db-backups/postgres/latest.dump.age /tmp/
   # Decrypt
   age -d -i /etc/backup/age-key.txt -o /tmp/latest.dump /tmp/latest.dump.age
   ```

4. **Stop PostgreSQL** (1 min)
   ```bash
   systemctl stop postgresql
   ```

5. **Clear and restore data directory** (10-60 min depending on size)
   ```bash
   rm -rf /var/lib/postgresql/16/main/*
   # For logical backup:
   systemctl start postgresql
   createdb myapp_production
   pg_restore -d myapp_production -j 4 /tmp/latest.dump
   # For physical backup (pgBackRest):
   pgbackrest --stanza=myapp restore
   ```

6. **Verify restore** (5-10 min)
   ```bash
   psql -d myapp_production -c "SELECT count(*) FROM users;"
   psql -d myapp_production -c "SELECT count(*) FROM orders;"
   ```

7. **Start application** (1 min)
   ```bash
   systemctl start myapp
   curl -sf http://localhost:3000/health
   ```

8. **Post-restore checks** (10 min)
   - [ ] Verify user count matches expected
   - [ ] Check application logs for errors
   - [ ] Test key user flows (login, payment)
   - [ ] Monitor error rates for 30 minutes
```

## Anti-Patterns

- **Never testing restore procedures**: A backup you cannot restore is not a backup. Schedule weekly automated restore tests to a temporary database. If the test fails, fix the backup process immediately.
- **Storing backups only on the same server**: If the server dies, you lose both the database and the backups. Always replicate backups to at least one remote location (S3, B2, secondary server).
- **Skipping encryption for remote backups**: Database backups contain all your sensitive data. Always encrypt before uploading to remote storage, even if the storage provider offers server-side encryption.
- **Relying solely on logical backups for large databases**: pg_dump is single-threaded and slow for large databases. For databases over 5GB, use physical backup tools (pgBackRest, XtraBackup) that support parallelism and incremental backups.
- **Not monitoring backup success**: A cron job that silently fails gives you a false sense of security. Use Healthchecks.io or similar cron monitoring to alert when a backup job does not complete within its expected window.
- **Keeping backups forever without a retention policy**: Storage costs accumulate. Define a clear retention policy (daily for 30 days, weekly for 12 weeks, monthly for 12 months) and automate cleanup.

## Related Skills

- [[csp-vps-deploy]]
- [[csp-monitoring-alerting]]
- [[csp-db-migration]]
