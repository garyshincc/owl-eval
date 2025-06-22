"""
Experiment management commands.
"""

import os
import click
from tabulate import tabulate
from datetime import datetime

# Only load environment when needed
_dotenv_loaded = False

def _ensure_dotenv():
    global _dotenv_loaded
    if not _dotenv_loaded:
        from dotenv import load_dotenv
        from pathlib import Path
        dotenv_path = Path('frontend/.env.local')
        load_dotenv(dotenv_path=dotenv_path)
        _dotenv_loaded = True

def _get_db_connection():
    _ensure_dotenv()
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    
    conn = psycopg2.connect(database_url)
    return conn, RealDictCursor


@click.group()
def experiments_cli():
    """Experiment management operations."""
    pass


@experiments_cli.command('list')
@click.option('--status', '-s', type=click.Choice(['draft', 'active', 'completed', 'archived']),
              help='Filter by status')
@click.option('--limit', '-l', default=20, help='Maximum number to show')
def list_experiments(status, limit):
    """List experiments in the database."""
    try:
        conn, RealDictCursor = _get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Build WHERE clause
            where_clause = ""
            params = []
            
            if status:
                where_clause = "WHERE e.status = %s"
                params.append(status)
            
            cursor.execute(f"""
                SELECT 
                    e.id,
                    e.name,
                    e.description,
                    e.status,
                    e."createdAt",
                    e."updatedAt",
                    COUNT(c.id) as comparison_count,
                    COUNT(CASE WHEN ev.status = 'completed' THEN 1 END) as evaluation_count,
                    COUNT(DISTINCT p.id) as participant_count
                FROM "Experiment" e
                LEFT JOIN "Comparison" c ON e.id = c."experimentId"
                LEFT JOIN "Evaluation" ev ON e.id = ev."experimentId"
                LEFT JOIN "Participant" p ON e.id = p."experimentId"
                {where_clause}
                GROUP BY e.id, e.name, e.description, e.status, e."createdAt", e."updatedAt"
                ORDER BY e."createdAt" DESC
                LIMIT %s
            """, params + [limit])
            
            experiments = cursor.fetchall()
            
            if not experiments:
                click.echo("No experiments found")
                return
            
            click.echo("🧪 Experiments:")
            
            table_data = []
            for exp in experiments:
                status_emoji = {
                    'draft': '🟡',
                    'active': '🟢', 
                    'completed': '🔵',
                    'archived': '🔴'
                }.get(exp['status'], '⚪')
                
                table_data.append([
                    f"{status_emoji} {exp['name'][:30]}",
                    exp['id'][:8] + '...',
                    exp['status'],
                    exp['comparison_count'],
                    exp['evaluation_count'],
                    exp['participant_count'],
                    exp['createdAt'].strftime('%Y-%m-%d')
                ])
            
            headers = ['Name', 'ID', 'Status', 'Comparisons', 'Evaluations', 'Participants', 'Created']
            click.echo(tabulate(table_data, headers=headers, tablefmt='grid'))
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")


@experiments_cli.command('show')
@click.argument('experiment_id')
def show_experiment(experiment_id):
    """Show detailed information about an experiment."""
    try:
        conn, RealDictCursor = _get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get experiment details
            cursor.execute("""
                SELECT *
                FROM "Experiment"
                WHERE id = %s OR slug = %s
            """, (experiment_id, experiment_id))
            
            experiment = cursor.fetchone()
            
            if not experiment:
                click.echo(f"❌ Experiment not found: {experiment_id}")
                return
            
            # Get statistics
            cursor.execute("""
                SELECT 
                    COUNT(c.id) as comparison_count,
                    COUNT(CASE WHEN ev.status = 'completed' THEN 1 END) as evaluation_count,
                    COUNT(DISTINCT p.id) as participant_count,
                    ARRAY_AGG(DISTINCT c."modelA") || ARRAY_AGG(DISTINCT c."modelB") as all_models,
                    ARRAY_AGG(DISTINCT c."scenarioId") as scenarios
                FROM "Comparison" c
                LEFT JOIN "Evaluation" ev ON c.id = ev."comparisonId"
                LEFT JOIN "Participant" p ON c."experimentId" = p."experimentId"
                WHERE c."experimentId" = %s
            """, (experiment['id'],))
            
            stats = cursor.fetchone()
            
            # Clean up models list
            all_models = stats['all_models'] or []
            unique_models = list(set([m for m in all_models if m is not None]))
            
            click.echo(f"🧪 Experiment Details")
            click.echo(f"   Name: {experiment['name']}")
            click.echo(f"   ID: {experiment['id']}")
            click.echo(f"   Slug: {experiment['slug']}")
            click.echo(f"   Description: {experiment['description'] or 'None'}")
            click.echo(f"   Status: {experiment['status']}")
            click.echo(f"   Group: {experiment['group'] or 'None'}")
            click.echo(f"   Created: {experiment['createdAt']}")
            click.echo(f"   Updated: {experiment['updatedAt']}")
            
            if experiment['createdBy']:
                click.echo(f"   Created By: {experiment['createdBy']}")
            
            click.echo(f"\n📊 Statistics:")
            click.echo(f"   Comparisons: {stats['comparison_count']}")
            click.echo(f"   Evaluations: {stats['evaluation_count']}")
            click.echo(f"   Participants: {stats['participant_count']}")
            
            if unique_models:
                click.echo(f"   Models: {', '.join(unique_models)}")
            
            if stats['scenarios'] and stats['scenarios'][0]:
                scenarios = [s for s in stats['scenarios'] if s]
                click.echo(f"   Scenarios: {', '.join(scenarios[:5])}")
                if len(scenarios) > 5:
                    click.echo(f"              ... and {len(scenarios) - 5} more")
            
            # Show recent evaluations
            cursor.execute("""
                SELECT 
                    ev.id,
                    ev."participantId",
                    ev.status,
                    ev."createdAt",
                    c."scenarioId"
                FROM "Evaluation" ev
                JOIN "Comparison" c ON ev."comparisonId" = c.id
                WHERE ev."experimentId" = %s
                ORDER BY ev."createdAt" DESC
                LIMIT 5
            """, (experiment['id'],))
            
            recent_evals = cursor.fetchall()
            
            if recent_evals:
                click.echo(f"\n📝 Recent Evaluations:")
                eval_data = []
                for ev in recent_evals:
                    eval_data.append([
                        ev['id'][:8] + '...',
                        ev['participantId'][:12] + '...',
                        ev['scenarioId'],
                        ev['status'],
                        ev['createdAt'].strftime('%Y-%m-%d %H:%M')
                    ])
                
                headers = ['Evaluation', 'Participant', 'Scenario', 'Status', 'Created']
                click.echo(tabulate(eval_data, headers=headers, tablefmt='grid'))
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")


@experiments_cli.command('activate')
@click.argument('experiment_id')
def activate_experiment(experiment_id):
    """Activate an experiment to make it available for evaluation."""
    try:
        conn, _ = _get_db_connection()
        conn.autocommit = True
        
        with conn.cursor() as cursor:
            # Check if experiment exists
            cursor.execute("""
                SELECT name, status FROM "Experiment" 
                WHERE id = %s OR slug = %s
            """, (experiment_id, experiment_id))
            
            result = cursor.fetchone()
            
            if not result:
                click.echo(f"❌ Experiment not found: {experiment_id}")
                return
            
            name, current_status = result
            
            if current_status == 'active':
                click.echo(f"✅ Experiment '{name}' is already active")
                return
            
            # Activate experiment
            cursor.execute("""
                UPDATE "Experiment" 
                SET status = 'active'
                WHERE id = %s OR slug = %s
            """, (experiment_id, experiment_id))
            
            click.echo(f"✅ Activated experiment: {name}")
            click.echo(f"🌐 Available at: http://localhost:3000/evaluate")
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")


@experiments_cli.command('deactivate')
@click.argument('experiment_id')
def deactivate_experiment(experiment_id):
    """Deactivate an experiment (set to draft status)."""
    try:
        conn, _ = _get_db_connection()
        conn.autocommit = True
        
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE "Experiment" 
                SET status = 'draft'
                WHERE id = %s OR slug = %s
                RETURNING name
            """, (experiment_id, experiment_id))
            
            result = cursor.fetchone()
            
            if not result:
                click.echo(f"❌ Experiment not found: {experiment_id}")
                return
            
            click.echo(f"✅ Deactivated experiment: {result[0]}")
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")


@experiments_cli.command('archive')
@click.argument('experiment_id')
@click.confirmation_option(prompt='Are you sure you want to archive this experiment?')
def archive_experiment(experiment_id):
    """Archive an experiment."""
    try:
        conn, _ = _get_db_connection()
        conn.autocommit = True
        
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE "Experiment" 
                SET status = 'archived', archived = true, "archivedAt" = %s
                WHERE id = %s OR slug = %s
                RETURNING name
            """, (datetime.now(), experiment_id, experiment_id))
            
            result = cursor.fetchone()
            
            if not result:
                click.echo(f"❌ Experiment not found: {experiment_id}")
                return
            
            click.echo(f"✅ Archived experiment: {result[0]}")
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")


@experiments_cli.command('delete')
@click.argument('experiment_id')
@click.confirmation_option(prompt='⚠️  Are you sure you want to permanently delete this experiment and ALL its data?')
def delete_experiment(experiment_id):
    """Permanently delete an experiment and all related data."""
    try:
        conn, _ = _get_db_connection()
        conn.autocommit = True
        
        with conn.cursor() as cursor:
            # Get experiment name first
            cursor.execute("""
                SELECT name FROM "Experiment" 
                WHERE id = %s OR slug = %s
            """, (experiment_id, experiment_id))
            
            result = cursor.fetchone()
            
            if not result:
                click.echo(f"❌ Experiment not found: {experiment_id}")
                return
            
            experiment_name = result[0]
            
            # Delete in order due to foreign key constraints
            tables = ['Evaluation', 'Participant', 'Comparison', 'Experiment']
            
            for table in tables:
                if table == 'Experiment':
                    cursor.execute(f'DELETE FROM "{table}" WHERE id = %s OR slug = %s', 
                                 (experiment_id, experiment_id))
                else:
                    cursor.execute(f'DELETE FROM "{table}" WHERE "experimentId" = %s', 
                                 (experiment_id,))
                
                deleted = cursor.rowcount
                if deleted > 0:
                    click.echo(f"   Deleted {deleted} records from {table}")
            
            click.echo(f"✅ Permanently deleted experiment: {experiment_name}")
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")


@experiments_cli.command('export')
@click.argument('experiment_id')
@click.option('--output', '-o', help='Output file path (default: experiment_<id>.json)')
@click.option('--format', '-f', type=click.Choice(['json', 'csv']), default='json',
              help='Export format')
def export_experiment(experiment_id, output, format):
    """Export experiment data for analysis."""
    try:
        import json
        import csv
        
        conn, RealDictCursor = _get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get experiment
            cursor.execute("""
                SELECT * FROM "Experiment" 
                WHERE id = %s OR slug = %s
            """, (experiment_id, experiment_id))
            
            experiment = cursor.fetchone()
            
            if not experiment:
                click.echo(f"❌ Experiment not found: {experiment_id}")
                return
            
            exp_id = experiment['id']
            
            # Get all related data
            cursor.execute("""
                SELECT * FROM "Comparison" 
                WHERE "experimentId" = %s
                ORDER BY "createdAt"
            """, (exp_id,))
            comparisons = cursor.fetchall()
            
            cursor.execute("""
                SELECT * FROM "Evaluation" 
                WHERE "experimentId" = %s
                ORDER BY "createdAt"
            """, (exp_id,))
            evaluations = cursor.fetchall()
            
            cursor.execute("""
                SELECT * FROM "Participant" 
                WHERE "experimentId" = %s
                ORDER BY "startedAt"
            """, (exp_id,))
            participants = cursor.fetchall()
            
            # Prepare output filename
            if not output:
                safe_name = experiment['slug'].replace('/', '_')
                output = f"experiment_{safe_name}.{format}"
            
            # Export data
            if format == 'json':
                export_data = {
                    'experiment': dict(experiment),
                    'comparisons': [dict(c) for c in comparisons],
                    'evaluations': [dict(e) for e in evaluations],
                    'participants': [dict(p) for p in participants],
                    'export_date': datetime.now().isoformat(),
                    'total_records': {
                        'comparisons': len(comparisons),
                        'evaluations': len(evaluations),
                        'participants': len(participants)
                    }
                }
                
                with open(output, 'w') as f:
                    json.dump(export_data, f, indent=2, default=str)
            
            elif format == 'csv':
                # Export evaluations as CSV (most useful for analysis)
                with open(output, 'w', newline='') as f:
                    if evaluations:
                        writer = csv.DictWriter(f, fieldnames=evaluations[0].keys())
                        writer.writeheader()
                        writer.writerows([dict(e) for e in evaluations])
                    else:
                        f.write("No evaluations found\n")
            
            click.echo(f"✅ Exported experiment data to: {output}")
            click.echo(f"   Experiment: {experiment['name']}")
            click.echo(f"   Comparisons: {len(comparisons)}")
            click.echo(f"   Evaluations: {len(evaluations)}")
            click.echo(f"   Participants: {len(participants)}")
        
        conn.close()
        
    except Exception as e:
        click.echo(f"❌ Export failed: {e}")