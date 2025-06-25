"""
PostgreSQL database management commands.
"""

import os

import click
from tabulate import tabulate

# Only load environment when needed
_dotenv_loaded = False


def _ensure_dotenv():
    global _dotenv_loaded
    if not _dotenv_loaded:
        from pathlib import Path

        from dotenv import load_dotenv

        dotenv_path = Path("frontend/.env.local")
        load_dotenv(dotenv_path=dotenv_path)
        _dotenv_loaded = True


# Lazy imports for better performance
def _get_db_connection():
    _ensure_dotenv()
    import psycopg2
    from psycopg2.extras import RealDictCursor

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")

    conn = psycopg2.connect(database_url)
    return conn, RealDictCursor


@click.group()
def postgres_cli():
    """PostgreSQL database operations."""
    pass


@postgres_cli.command("list-tables")
@click.option("--schema", "-s", default="public", help="Database schema to list")
def list_tables(schema):
    """List all tables in the database."""
    try:
        conn, RealDictCursor = _get_db_connection()

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT 
                    table_name,
                    COALESCE(obj_description(c.oid), '') as comment
                FROM information_schema.tables t
                LEFT JOIN pg_class c ON c.relname = t.table_name
                WHERE table_schema = %s
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """,
                (schema,),
            )

            tables = cursor.fetchall()

            if not tables:
                click.echo(f"No tables found in schema '{schema}'")
                return

            click.echo(f"📋 Tables in schema '{schema}':")
            table_data = [[t["table_name"], t["comment"]] for t in tables]
            click.echo(tabulate(table_data, headers=["Table", "Description"], tablefmt="grid"))

        conn.close()

    except Exception as e:
        click.echo(f"❌ Error: {e}")


@postgres_cli.command("count-records")
@click.option("--table", "-t", help="Specific table to count (optional)")
def count_records(table):
    """Count records in database tables."""
    try:
        conn, RealDictCursor = _get_db_connection()

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            if table:
                # Count specific table
                cursor.execute(f'SELECT COUNT(*) as count FROM "{table}"')
                result = cursor.fetchone()
                click.echo(f"📊 {table}: {result['count']:,} records")
            else:
                # Count all main tables
                tables = ["Experiment", "Comparison", "Evaluation", "Participant", "Video"]
                counts = []

                for tbl in tables:
                    try:
                        cursor.execute(f'SELECT COUNT(*) as count FROM "{tbl}"')
                        result = cursor.fetchone()
                        counts.append([tbl, f"{result['count']:,}"])
                    except Exception as e:
                        counts.append([tbl, f"Error: {e}"])

                click.echo("📊 Record Counts:")
                click.echo(tabulate(counts, headers=["Table", "Count"], tablefmt="grid"))

        conn.close()

    except Exception as e:
        click.echo(f"❌ Error: {e}")


@postgres_cli.command("delete-all")
@click.confirmation_option(prompt="⚠️  Are you sure you want to delete ALL data?")
@click.option("--table", "-t", help="Delete specific table only (optional)")
def delete_all(table):
    """Delete all records from tables (DANGEROUS!)."""
    try:
        conn, _ = _get_db_connection()
        conn.autocommit = True

        with conn.cursor() as cursor:
            if table:
                # Delete specific table
                cursor.execute(f'DELETE FROM "{table}"')
                click.echo(f"✅ Deleted all records from {table}")
            else:
                # Delete all tables in dependency order
                tables = ["Evaluation", "Participant", "Comparison", "Experiment", "Video"]

                for tbl in tables:
                    try:
                        cursor.execute(f'DELETE FROM "{tbl}"')
                        click.echo(f"✅ Deleted all records from {tbl}")
                    except Exception as e:
                        click.echo(f"⚠️  Error deleting {tbl}: {e}")

        conn.close()
        click.echo("🗑️  Database cleanup complete")

    except Exception as e:
        click.echo(f"❌ Error: {e}")


@postgres_cli.command("status")
def status():
    """Show database connection status and summary."""
    try:
        conn, RealDictCursor = _get_db_connection()

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get database info
            cursor.execute(
                "SELECT current_database(), current_user, inet_server_addr(), inet_server_port()"
            )
            db_info = cursor.fetchone()

            # Get table counts
            cursor.execute(
                """
                SELECT 
                    schemaname,
                    relname as tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes
                FROM pg_stat_user_tables 
                WHERE schemaname = 'public'
                ORDER BY relname
            """
            )
            table_stats = cursor.fetchall()

            click.echo("🗄️  Database Status:")
            click.echo(f"   Database: {db_info['current_database']}")
            click.echo(f"   User: {db_info['current_user']}")
            click.echo(f"   Host: {db_info['inet_server_addr'] or 'localhost'}")
            click.echo(f"   Port: {db_info['inet_server_port'] or '5432'}")

            if table_stats:
                click.echo("\n📈 Table Statistics:")
                stats_data = [
                    [t["tablename"], t["inserts"], t["updates"], t["deletes"]] for t in table_stats
                ]
                click.echo(
                    tabulate(
                        stats_data,
                        headers=["Table", "Inserts", "Updates", "Deletes"],
                        tablefmt="grid",
                    )
                )

        conn.close()

    except Exception as e:
        click.echo(f"❌ Connection failed: {e}")


@postgres_cli.command("run-query")
@click.argument("query")
@click.option(
    "--format",
    "-f",
    default="table",
    type=click.Choice(["table", "json", "csv"]),
    help="Output format",
)
@click.option(
    "--no-commit",
    is_flag=True,
    help="Don't auto-commit the transaction (for testing)",
)
def run_query(query, format, no_commit):
    """Run a custom SQL query with auto-commit."""
    try:
        conn, RealDictCursor = _get_db_connection()
        
        # Set autocommit for write operations unless --no-commit is specified
        if not no_commit:
            conn.autocommit = True

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)

            if cursor.description:  # SELECT query
                results = cursor.fetchall()

                if not results:
                    click.echo("No results")
                    return

                if format == "json":
                    import json

                    click.echo(json.dumps([dict(r) for r in results], indent=2, default=str))
                elif format == "csv":
                    import csv
                    import sys

                    writer = csv.DictWriter(sys.stdout, fieldnames=results[0].keys())
                    writer.writeheader()
                    writer.writerows(results)
                else:  # table
                    headers = results[0].keys()
                    data = [[r[h] for h in headers] for r in results]
                    click.echo(tabulate(data, headers=headers, tablefmt="grid"))
            else:  # INSERT/UPDATE/DELETE
                if no_commit:
                    click.echo(f"✅ Query executed. Rows affected: {cursor.rowcount} (NOT COMMITTED - use COMMIT; to persist)")
                else:
                    click.echo(f"✅ Query executed and committed. Rows affected: {cursor.rowcount}")

        conn.close()

    except Exception as e:
        click.echo(f"❌ Query failed: {e}")
        try:
            if not no_commit and not conn.autocommit:
                conn.rollback()
                click.echo("Transaction rolled back")
        except:
            pass
