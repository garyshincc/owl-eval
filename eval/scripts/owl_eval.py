#!/usr/bin/env python3
"""
Owl Eval - Unified command-line interface for the evaluation harness.
"""

import click

try:
    from scripts.python.postgres import postgres_cli
    from scripts.python.tigris import tigris_cli  
    from scripts.python.testdata import testdata_cli
except ImportError as e:
    click.echo(f"❌ Error importing CLI modules: {e}")
    click.echo("Make sure you're in the correct directory and dependencies are installed.")
    import sys
    sys.exit(1)


@click.group()
@click.version_option()
@click.pass_context
def owl_eval(ctx):
    """
    Owl Eval - World Model Evaluation Harness
    
    A unified tool for managing experiments, data, and infrastructure.
    """
    ctx.ensure_object(dict)

owl_eval.add_command(postgres_cli, name='postgres')
owl_eval.add_command(tigris_cli, name='tigris')
owl_eval.add_command(testdata_cli, name='testdata')


if __name__ == '__main__':
    owl_eval()