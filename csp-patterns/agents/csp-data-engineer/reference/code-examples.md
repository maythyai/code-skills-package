# Data Engineer — Code Examples Reference

## Spark Pipeline (PySpark + Delta Lake)

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, row_number, desc
from pyspark.sql.window import Window
from delta.tables import DeltaTable

spark = SparkSession.builder \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

def ingest_bronze(source_path: str, bronze_table: str, source_system: str) -> int:
    df = spark.read.format("json").option("inferSchema", "true").load(source_path)
    df = df.withColumn("_ingested_at", current_timestamp()) \
           .withColumn("_source_system", lit(source_system)) \
           .withColumn("_source_file", col("_metadata.file_path"))
    df.write.format("delta").mode("append").option("mergeSchema", "true").save(bronze_table)
    return df.count()

def upsert_silver(bronze_table: str, silver_table: str, pk_cols: list[str]) -> None:
    source = spark.read.format("delta").load(bronze_table)
    w = Window.partitionBy(*pk_cols).orderBy(desc("_ingested_at"))
    source = source.withColumn("_rank", row_number().over(w)).filter(col("_rank") == 1).drop("_rank")
    if DeltaTable.isDeltaTable(spark, silver_table):
        target = DeltaTable.forPath(spark, silver_table)
        merge_condition = " AND ".join([f"target.{c} = source.{c}" for c in pk_cols])
        target.alias("target").merge(source.alias("source"), merge_condition) \
            .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()
    else:
        source.write.format("delta").mode("overwrite").save(silver_table)
```

## dbt Data Quality Contract

```yaml
version: 2
models:
  - name: silver_orders
    description: "Cleansed, deduplicated orders. SLA: refreshed every 15 min."
    config:
      contract:
        enforced: true
    columns:
      - name: order_id
        data_type: string
        tests: [not_null, unique]
      - name: revenue
        data_type: decimal(18, 2)
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 1000000
    tests:
      - dbt_utils.recency:
          datepart: hour
          field: _updated_at
          interval: 1
```

## Pipeline Observability (Great Expectations)

```python
import great_expectations as gx

def validate_silver_orders(df) -> dict:
    context = gx.get_context()
    batch = context.sources.pandas_default.read_dataframe(df)
    result = batch.validate(expectation_suite_name="silver_orders.critical")
    stats = {
        "success": result["success"],
        "evaluated": result["statistics"]["evaluated_expectations"],
        "passed": result["statistics"]["successful_expectations"],
        "failed": result["statistics"]["unsuccessful_expectations"],
    }
    if not result["success"]:
        raise DataQualityException(f"Silver orders failed: {stats['failed']} checks failed")
    return stats
```

## Kafka Streaming Pipeline

```python
from pyspark.sql.functions import from_json, col, current_timestamp
from pyspark.sql.types import StructType, StringType, DoubleType, TimestampType

def stream_bronze_orders(kafka_bootstrap: str, topic: str, bronze_path: str):
    order_schema = StructType() \
        .add("order_id", StringType()) \
        .add("customer_id", StringType()) \
        .add("revenue", DoubleType()) \
        .add("event_time", TimestampType())

    stream = spark.readStream.format("kafka") \
        .option("kafka.bootstrap.servers", kafka_bootstrap) \
        .option("subscribe", topic) \
        .option("startingOffsets", "latest").load()

    parsed = stream.select(
        from_json(col("value").cast("string"), order_schema).alias("data"),
        current_timestamp().alias("_ingested_at")
    ).select("data.*", "_ingested_at")

    return parsed.writeStream.format("delta").outputMode("append") \
        .option("checkpointLocation", f"{bronze_path}/_checkpoint") \
        .trigger(processingTime="30 seconds").start(bronze_path)
```

## Advanced Patterns

- **Time Travel**: Delta/Iceberg snapshots for point-in-time queries
- **Row-Level Security**: Column masking and row filters for multi-tenant
- **Z-Ordering**: Multi-dimensional clustering for compound filter queries
- **Liquid Clustering**: Auto-compaction on Delta Lake 3.x+
- **Bloom Filters**: Skip files on high-cardinality string columns
