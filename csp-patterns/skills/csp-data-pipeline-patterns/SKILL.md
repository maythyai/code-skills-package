---
name: csp-data-pipeline-patterns
description: Production data pipeline patterns covering Airflow DAG design, dbt transformations, data quality checks, incremental processing, idempotent pipelines, schema evolution, data lineage, ODPS/MaxCompute, data lake/warehouse patterns, and CDC with Debezium. Use when designing, building, or debugging data pipelines.
metadata:
  origin: CSP
layer: 4
category: patterns
----
name: csp-data-pipeline-patterns
description: Production data pipeline patterns covering Airflow DAG design, dbt transformations, data quality checks, incremental processing, idempotent pipelines, schema evolution, data lineage, ODPS/MaxCompute, data lake/warehouse patterns, and CDC with Debezium. Use when designing, building, or debugging data pipelines.
metadata:
  origin: CSP
---

# Data Pipeline Patterns

Use this skill to design, build, and operate reliable data pipelines with proper task orchestration, data quality gates, incremental processing, schema evolution, and observability.

## When to Activate

- Designing new data pipelines (ETL, ELT, streaming, batch)
- Building Airflow DAGs with proper dependencies, retries, and SLAs
- Implementing dbt models with tests, documentation, and incremental runs
- Adding data quality checks with Great Expectations, dbt tests, or Soda
- Designing idempotent pipelines that handle re-runs safely
- Managing schema evolution in upstream sources or downstream consumers
- Working with ODPS/MaxCompute for large-scale batch processing
- Implementing Change Data Capture (CDC) with Debezium or similar tools
- Choosing between data lake, warehouse, and lakehouse architectures
- Debugging data freshness, completeness, or correctness issues

## Related Skills

- `postgres-patterns` and `clickhouse-io` for database-specific patterns
- `database-migrations` for schema versioning and safe migrations
- `docker-patterns` for containerized pipeline components
- `deployment-patterns` for CI/CD of pipeline code

## Airflow DAG Design

### DAG Structure with Best Practices

```python
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.sensors.sql import SqlSensor

# Default arguments applied to all tasks in the DAG
DEFAULT_ARGS = {
    "owner": "data-platform",
    "depends_on_past": False,
    "email": ["data-alerts@company.com"],
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=2),
}


def _check_data_quality(**context) -> str:
    """Branch based on data quality check results.

    Returns the task_id to execute next based on quality thresholds.
    """
    ti = context["ti"]
    row_count = ti.xcom_pull(task_ids="extract_users", key="row_count")
    null_rate = ti.xcom_pull(task_ids="extract_users", key="null_rate")

    if row_count and row_count > 0 and null_rate and null_rate < 0.05:
        return "transform_users"
    return "quality_alert"


with DAG(
    dag_id="user_analytics_pipeline",
    default_args=DEFAULT_ARGS,
    description="Extract, transform, and load user analytics data",
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,  # Prevent backfilling unless explicitly requested
    max_active_runs=1,  # Prevent overlapping runs
    tags=["analytics", "users", "daily"],
    doc_md=Path(__file__).parent.joinpath("README.md").read_text() if Path(__file__).parent.joinpath("README.md").exists() else "",
) as dag:

    # Wait for upstream DAG to complete
    wait_for_upstream = ExternalTaskSensor(
        task_id="wait_for_source_pipeline",
        external_dag_id="source_data_ingestion",
        external_task_id="finalize",
        timeout=3600,
        mode="reschedule",  # Free up worker slot while waiting
        poke_interval=300,
    )

    # Validate source data is ready
    check_source_freshness = SqlSensor(
        task_id="check_source_freshness",
        conn_id="source_db",
        sql="""
            SELECT CASE
                WHEN MAX(updated_at) >= CURRENT_TIMESTAMP - INTERVAL '2 hours'
                THEN TRUE
                ELSE FALSE
            END
            FROM source_db.public.users
        """,
        timeout=600,
        mode="poke",
    )

    # Extract with row count tracking
    extract_users = PythonOperator(
        task_id="extract_users",
        python_callable=_extract_users,
        op_kwargs={"batch_size": 10000},
    )

    # Branch based on quality
    quality_gate = BranchPythonOperator(
        task_id="quality_gate",
        python_callable=_check_data_quality,
    )

    # Transform
    transform_users = PythonOperator(
        task_id="transform_users",
        python_callable=_transform_users,
    )

    # Load
    load_users = PostgresOperator(
        task_id="load_users",
        postgres_conn_id="warehouse_db",
        sql="sql/load_users.sql",
    )

    # Quality alert branch
    quality_alert = EmptyOperator(task_id="quality_alert")
    notify_failure = PythonOperator(
        task_id="notify_data_quality_failure",
        python_callable=_send_quality_alert,
        trigger_rule="none_failed_min_one_success",
    )

    # Task dependencies
    wait_for_upstream >> check_source_freshness >> extract_users >> quality_gate
    quality_gate >> transform_users >> load_users
    quality_gate >> quality_alert >> notify_failure
```

### Task Group Pattern for Complex Pipelines

```python
from airflow.utils.task_group import TaskGroup


def build_source_group(dag: DAG, source_name: str, source_conn: str) -> TaskGroup:
    """Reusable task group pattern for a data source.

    Groups extract, validate, and stage tasks for each source,
    making the DAG readable and the pattern reusable.
    """
    with TaskGroup(group_id=f"ingest_{source_name}", dag=dag) as group:
        extract = PythonOperator(
            task_id="extract",
            python_callable=_extract_from_source,
            op_kwargs={"source": source_name, "conn_id": source_conn},
        )
        validate = PythonOperator(
            task_id="validate",
            python_callable=_validate_extracted_data,
            op_kwargs={"source": source_name},
        )
        stage = PythonOperator(
            task_id="stage",
            python_callable=_stage_to_landing,
            op_kwargs={"source": source_name},
        )
        extract >> validate >> stage

    return group
```

### SLA Configuration

```python
from datetime import timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator


def _sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    """Handle SLA misses with structured alerting."""
    import json
    from datetime import datetime

    alert = {
        "timestamp": datetime.utcnow().isoformat(),
        "dag_id": dag.dag_id,
        "failed_tasks": [str(t) for t in task_list],
        "blocking_tasks": [str(t) for t in blocking_task_list],
        "sla_details": [
            {"task": str(s.task_id), "sla": str(s.sla), "timestamp": str(s.timestamp)}
            for s in slas
        ],
    }
    # Send to monitoring system
    print(f"SLA_MISS: {json.dumps(alert)}")


with DAG(
    dag_id="sla_monitored_pipeline",
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    sla_miss_callback=_sla_miss_callback,
) as dag:

    # Individual task SLAs
    extract = PythonOperator(
        task_id="extract",
        python_callable=_extract,
        sla=timedelta(hours=1),  # Must complete within 1 hour
    )

    transform = PythonOperator(
        task_id="transform",
        python_callable=_transform,
        sla=timedelta(hours=2),
    )

    load = PythonOperator(
        task_id="load",
        python_callable=_load,
        sla=timedelta(hours=3),  # End-to-end SLA
    )

    extract >> transform >> load
```

## dbt Models and Transformations

### Model Structure

```sql
-- models/marts/users/dim_users.sql
-- Materialization: table for frequently queried dimension

{{ config(
    materialized='table',
    tags=['mart', 'users'],
    schema='marts'
) }}

WITH source_users AS (
    SELECT * FROM {{ ref('stg_users') }}
    WHERE _loaded_at >= CURRENT_DATE - INTERVAL '{{ var("lookback_days", 90) }} days'
),

user_orders AS (
    SELECT
        user_id,
        COUNT(DISTINCT order_id) AS total_orders,
        SUM(amount) AS total_spent,
        MIN(created_at) AS first_order_at,
        MAX(created_at) AS last_order_at
    FROM {{ ref('fct_orders') }}
    WHERE status != 'cancelled'
    GROUP BY user_id
),

user_segments AS (
    SELECT
        u.user_id,
        u.email,
        u.created_at AS registered_at,
        COALESCE(o.total_orders, 0) AS total_orders,
        COALESCE(o.total_spent, 0) AS total_spent,
        o.first_order_at,
        o.last_order_at,
        CASE
            WHEN o.total_orders IS NULL THEN 'never_ordered'
            WHEN o.total_orders = 1 THEN 'one_time'
            WHEN o.total_orders BETWEEN 2 AND 5 THEN 'repeat'
            WHEN o.total_orders > 5 AND COALESCE(o.total_spent, 0) > 1000 THEN 'vip'
            ELSE 'regular'
        END AS user_segment,
        CURRENT_TIMESTAMP AS _updated_at
    FROM source_users u
    LEFT JOIN user_orders o ON u.user_id = o.user_id
)

SELECT * FROM user_segments
```

### Incremental Models

```sql
-- models/marts/events/fct_page_views.sql
-- Incremental materialization for large event tables

{{ config(
    materialized='incremental',
    unique_key='event_id',
    incremental_strategy='merge',
    partition_by={
        "field": "event_date",
        "data_type": "date",
        "granularity": "day"
    },
    cluster_by=['user_id'],
    tags=['mart', 'events']
) }}

WITH new_events AS (
    SELECT
        event_id,
        user_id,
        page_url,
        referrer_url,
        session_id,
        event_timestamp,
        CAST(event_timestamp AS DATE) AS event_date,
        device_type,
        country,
        duration_ms
    FROM {{ source('analytics', 'raw_page_views') }}
    WHERE 1 = 1
    {% if is_incremental() %}
        -- Only process new data since last run
        AND event_timestamp > (
            SELECT MAX(event_timestamp) FROM {{ this }}
        )
        -- Safety: cap lookback to prevent runaway processing
        AND event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '3 days'
    {% endif %}
),

deduplicated AS (
    SELECT *
    FROM new_events
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY event_id
        ORDER BY event_timestamp DESC
    ) = 1
)

SELECT * FROM deduplicated
```

### dbt Tests

```yaml
# models/marts/users/_dim_users.yml
version: 2

models:
  - name: dim_users
    description: "User dimension table with segmentation"
    columns:
      - name: user_id
        description: "Primary key"
        tests:
          - unique
          - not_null
      - name: email
        description: "User email address"
        tests:
          - unique
          - not_null
      - name: user_segment
        tests:
          - accepted_values:
              values: ['never_ordered', 'one_time', 'repeat', 'vip', 'regular']
      - name: total_orders
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
      - name: total_spent
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= 0"

    tests:
      # Custom test: row count should not drop more than 20%
      - dbt_utils.expression_is_true:
          name: row_count_stability
          expression: |
            (SELECT COUNT(*) FROM {{ this }}) >=
            (SELECT COUNT(*) FROM {{ this }}) * 0.8
```

## Data Quality Checks

### Great Expectations Integration

```python
import great_expectations as gx
from great_expectations.core import ExpectationSuite
from great_expectations.data_context import FileDataContext


def create_user_data_suite(context: FileDataContext) -> ExpectationSuite:
    """Define data quality expectations for the users table."""
    suite = context.add_expectation_suite("user_data_quality")

    # Table-level expectations
    suite.add_expectation(gx.expectations.ExpectTableRowCountToBeBetween(
        min_value=1000,
        max_value=10_000_000,
    ))
    suite.add_expectation(gx.expectations.ExpectTableColumnsToMatchOrderedList(
        column_list=["user_id", "email", "name", "created_at", "updated_at", "status"],
    ))

    # Column-level expectations
    suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(
        column="user_id",
        mostly=1.0,
    ))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(
        column="user_id",
    ))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToMatchRegex(
        column="email",
        regex=r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$",
        mostly=0.99,  # Allow 1% invalid emails
    ))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(
        column="created_at",
        min_value="2020-01-01",
        max_value={"$NOW": "%Y-%m-%d"},
    ))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToBeInSet(
        column="status",
        value_set=["active", "inactive", "suspended", "deleted"],
    ))
    suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(
        column="email",
        mostly=0.999,
    ))

    context.save_expectation_suite(suite)
    return suite


def run_quality_checkpoint(
    context: FileDataContext,
    datasource_name: str,
    table_name: str,
    suite_name: str,
) -> dict:
    """Run a data quality checkpoint and return results.

    Use this as an Airflow PythonOperator or as a standalone script
    in CI/CD to gate deployments on data quality.
    """
    batch_request = context.get_datasource(datasource_name).get_asset(table_name).build_batch_request()
    results = context.run_checkpoint(
        checkpoint_name=f"{table_name}_checkpoint",
        batch_request=batch_request,
        expectation_suite_name=suite_name,
    )
    return {
        "success": results.success,
        "statistics": results.result["statistics"],
        "failed_expectations": [
            {
                "expectation": r["expectation_config"]["type"],
                "column": r["expectation_config"].get("kwargs", {}).get("column"),
                "unexpected_count": r["result"].get("unexpected_count"),
            }
            for r in results.result["results"]
            if not r["success"]
        ],
    }
```

### Soda Checks

```yaml
# soda_checks.yml — Soda Core data quality checks
checks for dim_users:
  - schema:
      name: Confirm schema integrity
      fail:
        when required column missing: [user_id, email, user_segment]
        when forbidden column present: [password_hash, ssn]
  - row_count:
      warn: when < 1000
      fail: when < 100
  - duplicate_count(user_id) = 0:
      name: user_id must be unique
  - missing_count(email) = 0:
      name: email must not be null
  - invalid_count(email):
      name: email format validation
      valid format: email
      warn: when > 10
      fail: when > 100
  - avg(total_orders):
      warn: when < 0
      fail: when < -1
  - freshness(updated_at) < 24h:
      name: Data must be fresh
  - distribution_difference(user_segment, threshold=0.1):
      name: Segment distribution stability
      method: ks

checks for fct_orders:
  - row_count_change:
      warn: when ratio < 0.8 or ratio > 1.5
      name: Row count should not change drastically between runs
  - anomaly score for row_count > 3.5:
      name: Anomalous row count
```

## Idempotent Pipelines

```python
from datetime import date, datetime
from typing import Protocol


class IdempotentWriter(Protocol):
    """Interface for idempotent data writes."""

    def write(self, data: list[dict], run_id: str, partition_key: str) -> None:
        """Write data with guaranteed idempotency.

        The writer must ensure that calling write() multiple times with
        the same run_id and partition_key produces the same result as
        calling it once.
        """
        ...


class PostgresUpsertWriter:
    """Idempotent writes using UPSERT (INSERT ... ON CONFLICT)."""

    def __init__(self, conn, table: str, conflict_keys: list[str]):
        self.conn = conn
        self.table = table
        self.conflict_keys = conflict_keys

    def write(self, data: list[dict], run_id: str, partition_key: str) -> None:
        if not data:
            return

        columns = list(data[0].keys())
        placeholders = ", ".join(f"%({col})s" for col in columns)
        conflict_cols = ", ".join(self.conflict_keys)
        update_cols = ", ".join(f"{col} = EXCLUDED.{col}" for col in columns if col not in self.conflict_keys)

        query = f"""
            INSERT INTO {self.table} ({', '.join(columns)})
            VALUES ({placeholders})
            ON CONFLICT ({conflict_cols})
            DO UPDATE SET {update_cols}
        """

        with self.conn.cursor() as cur:
            cur.executemany(query, data)
        self.conn.commit()


class PartitionedFileWriter:
    """Idempotent writes to partitioned file storage (S3, GCS, ADLS).

    Achieves idempotency by:
    1. Writing to a temporary path first
    2. Atomically replacing the partition directory
    3. Using run_id for deduplication tracking
    """

    def __init__(self, bucket: str, prefix: str, filesystem=None):
        self.bucket = bucket
        self.prefix = prefix
        self.fs = filesystem  # pyarrow filesystem, s3fs, etc.

    def write(self, data: list[dict], run_id: str, partition_key: str) -> None:
        import pyarrow as pa
        import pyarrow.parquet as pq

        partition_path = f"{self.prefix}/partition={partition_key}"
        temp_path = f"{self.prefix}/.tmp/{run_id}/partition={partition_key}"

        # Write to temp path
        table = pa.Table.from_pylist(data)
        pq.write_table(table, f"s3://{self.bucket}/{temp_path}/data.parquet", filesystem=self.fs)

        # Atomic rename (replace partition)
        # In S3: copy + delete. In local FS: rename.
        if self.fs is not None:
            self.fs.delete_dir(f"s3://{self.bucket}/{partition_path}")
            self.fs.copy_files(
                f"s3://{self.bucket}/{temp_path}",
                f"s3://{self.bucket}/{partition_path}",
            )
            self.fs.delete_dir(f"s3://{self.bucket}/{self.prefix}/.tmp/{run_id}")
```

## Schema Evolution

```python
from dataclasses import dataclass
from enum import Enum


class SchemaChangeType(Enum):
    ADD_COLUMN = "add_column"
    DROP_COLUMN = "drop_column"
    TYPE_CHANGE = "type_change"
    RENAME_COLUMN = "rename_column"
    NULLABILITY_CHANGE = "nullability_change"


@dataclass
class SchemaChange:
    change_type: SchemaChangeType
    column: str
    old_value: str | None
    new_value: str | None
    is_breaking: bool


class SchemaEvolutionManager:
    """Detect and handle schema changes in upstream data sources.

    Breaking changes require downstream consumer coordination.
    Non-breaking changes can be applied automatically.
    """

    BREAKING_CHANGES = {
        SchemaChangeType.DROP_COLUMN,
        SchemaChangeType.TYPE_CHANGE,
        SchemaChangeType.NULLABILITY_CHANGE,  # Making nullable -> not null
    }

    def detect_changes(
        self,
        current_schema: dict[str, str],
        new_schema: dict[str, str],
    ) -> list[SchemaChange]:
        """Compare schemas and classify changes."""
        changes = []

        # Detect dropped columns
        for col in current_schema:
            if col not in new_schema:
                changes.append(SchemaChange(
                    change_type=SchemaChangeType.DROP_COLUMN,
                    column=col,
                    old_value=current_schema[col],
                    new_value=None,
                    is_breaking=True,
                ))

        # Detect added columns
        for col in new_schema:
            if col not in current_schema:
                changes.append(SchemaChange(
                    change_type=SchemaChangeType.ADD_COLUMN,
                    column=col,
                    old_value=None,
                    new_value=new_schema[col],
                    is_breaking=False,  # Adding columns is non-breaking
                ))

        # Detect type changes
        for col in set(current_schema) & set(new_schema):
            if current_schema[col] != new_schema[col]:
                is_breaking = not _is_safe_type_widen(current_schema[col], new_schema[col])
                changes.append(SchemaChange(
                    change_type=SchemaChangeType.TYPE_CHANGE,
                    column=col,
                    old_value=current_schema[col],
                    new_value=new_schema[col],
                    is_breaking=is_breaking,
                ))

        return changes

    def apply_non_breaking(self, changes: list[SchemaChange]) -> list[SchemaChange]:
        """Apply non-breaking changes automatically, return breaking ones for review."""
        applied = []
        blocked = []
        for change in changes:
            if change.is_breaking:
                blocked.append(change)
            else:
                # Apply the change (implementation depends on storage)
                applied.append(change)
        return blocked


def _is_safe_type_widen(old_type: str, new_type: str) -> bool:
    """Check if a type change is a safe widening conversion."""
    SAFE_WIDENS = {
        ("int", "bigint"),
        ("int", "float"),
        ("float", "double"),
        ("varchar(100)", "varchar(255)"),
        ("varchar(255)", "text"),
    }
    return (old_type, new_type) in SAFE_WIDENS
```

## ODPS/MaxCompute Patterns

### Table Design and Partitioning

```sql
-- ODPS table with partitioning for efficient querying
CREATE TABLE IF NOT EXISTS user_events (
    event_id        STRING NOT NULL COMMENT 'Unique event identifier',
    user_id         BIGINT NOT NULL COMMENT 'User identifier',
    event_type      STRING NOT NULL COMMENT 'Event category',
    event_detail    STRING COMMENT 'JSON-encoded event payload',
    session_id      STRING COMMENT 'Session identifier',
    device_info     STRING COMMENT 'JSON device metadata',
    event_timestamp DATETIME NOT NULL COMMENT 'Event occurrence time',
    ip_address      STRING COMMENT 'Client IP (masked)',
    duration_ms     BIGINT COMMENT 'Event duration in milliseconds'
)
PARTITIONED BY (
    dt      STRING COMMENT 'Date partition: YYYYMMDD',
    hour    STRING COMMENT 'Hour partition: HH'
)
LIFECYCLE 365  -- Auto-cleanup after 365 days
;

-- Partition pruning query (efficient)
SELECT user_id, event_type, COUNT(*) AS cnt
FROM user_events
WHERE dt = '20260614'
  AND hour BETWEEN '09' AND '18'
  AND event_type = 'purchase'
GROUP BY user_id, event_type;

-- Anti-pattern: full table scan (no partition filter)
-- SELECT * FROM user_events WHERE event_type = 'purchase';  -- EXPENSIVE
```

### MapReduce vs SQL Decision

```python
# Use ODPS SQL for:
# - Aggregations, joins, filters on structured data
# - Window functions, CTEs, set operations
# - Simple UDFs (Python/Java)
# - Most ETL transformations

# Use MapReduce for:
# - Custom graph algorithms
# - Complex stateful processing
# - Non-relational operations (e.g., TF-IDF computation)
# - Multi-stage processing with intermediate data

# ODPS PyODPS example
from odps import ODPS

odps = ODPS(
    access_id="your_access_id",
    access_key="your_access_key",
    project="your_project",
    endpoint="http://service.odps.aliyun.com/api",
)


def run_sql_transform(sql: str, hints: dict | None = None) -> str:
    """Execute a SQL transformation with resource hints."""
    default_hints = {
        "odps.sql.mapper.split.size": "256",  # MB per mapper
        "odps.sql.reducer.instances": "100",  # Number of reducers
        "odps.sql.type.system.odps2": "true",  # Enable ODPS 2.0 type system
    }
    if hints:
        default_hints.update(hints)

    instance = odps.execute_sql(sql, hints=default_hints)
    instance.wait_for_success()
    return instance.id


def incremental_load(
    source_table: str,
    target_table: str,
    partition_date: str,
    incremental_key: str = "updated_at",
) -> str:
    """Incremental load pattern for ODPS.

    Reads only new/changed records since the last load timestamp.
    """
    # Get watermark from target table
    watermark_sql = f"""
        SELECT MAX({incremental_key}) AS last_loaded
        FROM {target_table}
        WHERE dt = '{partition_date}'
    """
    with odps.execute_sql(watermark_sql).open_reader() as reader:
        last_loaded = reader[0]["last_loaded"] if reader.count > 0 else "1970-01-01"

    # Incremental extract and load
    load_sql = f"""
        INSERT OVERWRITE TABLE {target_table}
        PARTITION (dt = '{partition_date}')
        SELECT *
        FROM {source_table}
        WHERE dt = '{partition_date}'
          AND {incremental_key} > '{last_loaded}'
    """
    return run_sql_transform(load_sql)
```

## CDC with Debezium

```yaml
# debezium-connector-config.json — PostgreSQL CDC connector
{
    "name": "users-cdc-connector",
    "config": {
        "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
        "database.hostname": "source-db.example.com",
        "database.port": "5432",
        "database.user": "${DEBEZIUM_DB_USER}",
        "database.password": "${DEBEZIUM_DB_PASSWORD}",
        "database.dbname": "app_db",
        "database.server.name": "app-db-server",

        "table.include.list": "public.users,public.orders,public.products",
        "plugin.name": "pgoutput",

        # Snapshot behavior for initial load
        "snapshot.mode": "initial",
        "snapshot.lock.timeout.ms": "60000",

        # Schema change handling
        "schema.history.internal.kafka.topic": "schema-changes.app-db",
        "schema.history.internal.store.only.captured.tables.ddl": "true",

        # Heartbeat for monitoring lag
        "heartbeat.interval.ms": "10000",
        "heartbeat.action.query": "INSERT INTO debezium_heartbeat (id, ts) VALUES (1, NOW()) ON CONFLICT (id) DO UPDATE SET ts = NOW()",

        # Tombstone events for deletes
        "tombstones.on.delete": "true",

        # Column masking for sensitive data
        "column.mask.with.12.chars": "public.users.email",
        "column.mask.hash.SHA-256": "public.users.phone_number"
    }
}
```

### CDC Consumer Pattern

```python
from dataclasses import dataclass
from enum import Enum

from confluent_kafka import Consumer, KafkaError


class CDCOperation(Enum):
    CREATE = "c"
    UPDATE = "u"
    DELETE = "d"
    READ = "r"  # Snapshot read


@dataclass
class CDCEvent:
    operation: CDCOperation
    table: str
    before: dict | None
    after: dict | None
    timestamp_ms: int
    source_lsn: int  # Log sequence number for ordering


def parse_debezium_message(message: dict) -> CDCEvent:
    """Parse a Debezium CDC message into a structured event."""
    payload = message.get("payload", message)
    op = CDCOperation(payload["op"])

    return CDCEvent(
        operation=op,
        table=payload.get("source", {}).get("table", "unknown"),
        before=payload.get("before"),
        after=payload.get("after"),
        timestamp_ms=payload.get("ts_ms", 0),
        source_lsn=payload.get("source", {}).get("lsn", 0),
    )


def consume_cdc_stream(
    bootstrap_servers: str,
    topics: list[str],
    group_id: str,
    handler,
) -> None:
    """Consume CDC events with exactly-once processing guarantees.

    The handler function should be idempotent since Kafka consumer
    rebalancing may cause message redelivery.
    """
    consumer = Consumer({
        "bootstrap.servers": bootstrap_servers,
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,  # Manual commit for exactly-once
    })
    consumer.subscribe(topics)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise RuntimeError(f"Kafka error: {msg.error()}")

            import json
            raw = json.loads(msg.value())
            event = parse_debezium_message(raw)

            # Process the event (handler must be idempotent)
            handler(event)

            # Commit offset after successful processing
            consumer.commit(asynchronous=False)
    finally:
        consumer.close()
```

## Data Lineage

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ColumnLineage:
    """Track column-level lineage for impact analysis and compliance."""
    source_table: str
    source_column: str
    target_table: str
    target_column: str
    transformation: str  # "direct", "aggregation", "derived", "join"
    sql_expression: str | None = None


@dataclass
class TableLineage:
    """Table-level lineage graph node."""
    table: str
    upstream: list[str] = field(default_factory=list)
    downstream: list[str] = field(default_factory=list)
    owner: str = ""
    description: str = ""


class LineageTracker:
    """Track data lineage across pipeline stages.

    Use OpenLineage or Marquez for production lineage tracking.
    This simplified version demonstrates the core concepts.
    """

    def __init__(self):
        self._tables: dict[str, TableLineage] = {}
        self._columns: list[ColumnLineage] = []

    def record_table_lineage(self, target: str, sources: list[str], owner: str = "") -> None:
        if target not in self._tables:
            self._tables[target] = TableLineage(table=target, owner=owner)
        self._tables[target].upstream = sources

        for source in sources:
            if source not in self._tables:
                self._tables[source] = TableLineage(table=source)
            if target not in self._tables[source].downstream:
                self._tables[source].downstream.append(target)

    def record_column_lineage(
        self,
        source_table: str,
        source_column: str,
        target_table: str,
        target_column: str,
        transformation: str = "direct",
        sql_expression: str | None = None,
    ) -> None:
        self._columns.append(ColumnLineage(
            source_table=source_table,
            source_column=source_column,
            target_table=target_table,
            target_column=target_column,
            transformation=transformation,
            sql_expression=sql_expression,
        ))

    def get_impact_analysis(self, table: str) -> dict:
        """Find all downstream tables affected by changes to a given table."""
        visited: set[str] = set()
        queue = [table]

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            if current in self._tables:
                queue.extend(self._tables[current].downstream)

        return {
            "source": table,
            "direct_downstream": self._tables.get(table, TableLineage(table=table)).downstream,
            "all_downstream": list(visited - {table}),
            "affected_columns": [
                cl for cl in self._columns
                if cl.source_table == table or cl.target_table in visited
            ],
        }
```

## Review Checklist

- [ ] Airflow DAGs have explicit dependencies, retries, SLAs, and timeouts
- [ ] Catchup is disabled unless backfilling is explicitly required
- [ ] Data quality checks validate row counts, nulls, uniqueness, and freshness
- [ ] Incremental models use watermark columns and cap lookback windows
- [ ] Pipelines are idempotent (re-runs produce the same result)
- [ ] Schema changes are detected and classified as breaking or non-breaking
- [ ] Sensitive columns are masked or excluded from pipeline outputs
- [ ] CDC consumers commit offsets only after successful processing
- [ ] Table and column lineage tracked for impact analysis
- [ ] ODPS/MaxCompute queries use partition filters to avoid full scans
- [ ] Pipeline monitoring covers freshness, completeness, and quality metrics
- [ ] Alerting configured for SLA misses, quality failures, and lag

## Anti-Patterns

- Running `SELECT *` without partition filters on large ODPS tables
- Airflow tasks with no timeout, causing indefinite hangs
- Idempotency violations: INSERT without deduplication, append-only on re-runs
- Schema changes deployed without checking downstream consumers
- Data quality checks that only validate row count, ignoring content
- CDC consumers with auto-commit enabled, risking data loss on failure
- No lineage tracking, making impact analysis impossible during incidents
- Incremental pipelines without lookback safety caps, risking infinite processing

## Output Expectations

When using this skill, return concrete artifacts: Airflow DAG code, dbt models with tests, data quality check definitions, idempotent write implementations, schema evolution plans, or lineage diagrams. Name infrastructure assumptions (cloud provider, database engine, message broker) that affect implementation choices.
