"""Apply the repository schema from a temporary VPC-connected Lambda."""
import os
from pathlib import Path
import psycopg2


def handler(event, context):
    root = Path(__file__).parent / "sql"
    connection = psycopg2.connect(
        host=os.environ["DB_HOST"], port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ["DB_NAME"], user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"], sslmode="require", connect_timeout=15,
    )
    applied = []
    try:
        with connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_xact_lock(767491588)")
                cursor.execute("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())")
                if event.get("cleanup_cognito_id"):
                    cursor.execute("DELETE FROM users WHERE cognito_id = %s", (event["cleanup_cognito_id"],))
                    return {"deleted_test_profiles": cursor.rowcount}
                files = [root / "schema.sql", *sorted((root / "migrations").glob("*.sql")), root / "engagement_schema.sql"]
                for file in files:
                    name = file.name
                    cursor.execute("SELECT 1 FROM schema_migrations WHERE name = %s", (name,))
                    if cursor.fetchone():
                        continue
                    cursor.execute(file.read_text())
                    cursor.execute("INSERT INTO schema_migrations(name) VALUES (%s)", (name,))
                    applied.append(name)
                cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
                table_count = cursor.fetchone()[0]
        return {"applied": applied, "table_count": table_count, "database": os.environ["DB_NAME"]}
    finally:
        connection.close()
