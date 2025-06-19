"""
Test data generation and management commands.
"""

import os
import click
import yaml
import numpy as np
from typing import Dict

from models.model_loader import ModelLoader
from evaluation.test_scenarios import TestScenarios
from evaluation.ab_testing import ABTestingFramework
from dotenv import load_dotenv
from pathlib import Path

# Only load dotenv once when needed
_dotenv_loaded = False

def _ensure_dotenv():
    global _dotenv_loaded
    if not _dotenv_loaded:
        dotenv_path = Path('frontend/.env.local')
        load_dotenv(dotenv_path=dotenv_path)
        _dotenv_loaded = True


@click.group()
def testdata_cli():
    """Test data generation and management."""
    pass


@testdata_cli.command('generate')
@click.option('--experiment-name', '-n', required=True, help='Name for the experiment')
@click.option('--experiment-description', '-d', default='', help='Description for the experiment')
@click.option('--scenarios', '-s', default=5, help='Number of test scenarios to generate')
@click.option('--pairs-per-scenario', '-p', default=1, help='Number of model pairs per scenario')
@click.option('--config', '-c', help='Path to model configuration file')
@click.option('--mock-models', is_flag=True, help='Use mock models instead of real ones')
@click.option('--activate', is_flag=True, help='Activate experiment immediately after creation')
@click.option('--dry-run', is_flag=True, help='Show what would be generated without creating')
def generate_testdata(experiment_name, experiment_description, scenarios, pairs_per_scenario, 
                     config, mock_models, activate, dry_run):
    """Generate test data and create experiment in database."""
    
    if dry_run:
        click.echo("🔍 DRY RUN MODE - No data will be generated")
    
    # Load environment variables only when needed
    _ensure_dotenv()
    
    # Validate environment
    required_vars = ['DATABASE_URL', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'TIGRIS_BUCKET_NAME']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        click.echo(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return
    
    click.echo(f"🧪 Generating test data for experiment: {experiment_name}")
    
    try:
        # Initialize framework
        if not dry_run:
            framework = ABTestingFramework(
                experiment_name=experiment_name,
                experiment_description=experiment_description
            )
            click.echo(f"✅ Created experiment: {framework.experiment_id}")
        else:
            click.echo("🔍 Would create new experiment in database")
        
        # Load models
        models = _load_models(config, mock_models, dry_run)
        click.echo(f"✅ {'Loaded' if not dry_run else 'Would load'} {len(models)} models: {list(models.keys())}")
        
        # Create scenarios
        test_scenarios = TestScenarios.create_balanced_test_set(
            scenarios_per_biome=max(1, scenarios // 8)
        )[:scenarios]
        click.echo(f"✅ Created {len(test_scenarios)} scenarios")
        
        for scenario in test_scenarios:
            click.echo(f"   • {scenario['name']} ({scenario['biome']})")
        
        # Generate reference images
        reference_images = _create_reference_images(test_scenarios)
        click.echo(f"✅ Generated {len(reference_images)} reference images")
        
        # Calculate total comparisons
        model_pairs = [(m1, m2) for i, m1 in enumerate(models.keys()) 
                      for m2 in list(models.keys())[i+1:]]
        total_comparisons = len(test_scenarios) * len(model_pairs) * pairs_per_scenario
        
        click.echo(f"📊 Plan: {len(test_scenarios)} scenarios × {len(model_pairs)} pairs × {pairs_per_scenario} reps = {total_comparisons} comparisons")
        
        if dry_run:
            click.echo("🔍 Dry run complete - no data generated")
            return
        
        # Create comparisons
        click.echo("🔄 Creating comparisons (this may take a while)...")
        
        comparisons = framework.create_comparison_batch(
            models=models,
            scenarios=test_scenarios,
            reference_images=reference_images,
            pairs_per_scenario=pairs_per_scenario
        )
        
        click.echo(f"✅ Created {len(comparisons)} comparisons")
        
        # Optionally activate
        if activate:
            framework.finalize_experiment()
            click.echo("✅ Experiment activated and ready for evaluation")
        
        # Show summary
        stats = framework.get_experiment_stats()
        click.echo("\n🎉 Test data generation complete!")
        click.echo(f"   📝 Experiment: {stats['name']}")
        click.echo(f"   🆔 ID: {stats['experiment_id']}")
        click.echo(f"   📊 Status: {stats['status']}")
        click.echo(f"   🔄 Comparisons: {stats['comparison_count']}")
        
        if stats['status'] == 'active':
            click.echo(f"\n🌐 Ready for evaluation: http://localhost:3000/evaluate")
        else:
            click.echo(f"\n💡 To activate: owl-eval experiments activate {stats['experiment_id']}")
        
        framework.close()
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        import traceback
        if click.get_current_context().params.get('verbose'):
            click.echo(traceback.format_exc())


@testdata_cli.command('upload')
@click.option('--data-dir', '-d', required=True, help='Path to data directory (e.g., data/test_run)')
@click.option('--experiment-name', '-n', required=True, help='Name for the imported experiment')
@click.option('--experiment-description', '-desc', default='', help='Description for the imported experiment')
@click.option('--upload-videos/--no-upload-videos', default=True, help='Upload local videos to Tigris')
@click.option('--dry-run', is_flag=True, help='Show what would be imported without making changes')
def upload_existing_data(data_dir, experiment_name, experiment_description, upload_videos, dry_run):
    """Upload existing file-based test data to database."""
    
    from scripts.migrate_file_data import (
        validate_data_directory, load_comparisons, create_experiment,
        upload_video_to_tigris, insert_comparison, activate_experiment
    )
    import json
    import uuid
    import psycopg2
    import boto3
    from datetime import datetime
    
    if dry_run:
        click.echo("🔍 DRY RUN MODE - No changes will be made")
    
    click.echo(f"📤 Uploading data from: {data_dir}")
    click.echo(f"📝 Experiment name: {experiment_name}")
    
    # Validate directory
    if not validate_data_directory(data_dir):
        return
    
    # Load environment variables only when needed
    _ensure_dotenv()
    
    # Validate environment
    required_vars = ['DATABASE_URL']
    if upload_videos:
        required_vars.extend(['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'TIGRIS_BUCKET_NAME'])
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        click.echo(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return
    
    try:
        # Load data
        comparisons_data = load_comparisons(data_dir)
        click.echo(f"📋 Found {len(comparisons_data)} comparisons")
        
        if not comparisons_data:
            click.echo("❌ No comparison data found")
            return
        
        if dry_run:
            click.echo("🔍 Dry run - would upload:")
            for comp in comparisons_data[:3]:  # Show first 3
                click.echo(f"   • {comp['comparison_id']} - {comp['scenario_id']}")
            if len(comparisons_data) > 3:
                click.echo(f"   • ... and {len(comparisons_data) - 3} more")
            return
        
        # Initialize connections
        db_conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        db_conn.autocommit = True
        
        s3_client = None
        if upload_videos:
            s3_client = boto3.client(
                's3',
                endpoint_url=os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev'),
                region_name=os.getenv('AWS_REGION', 'auto'),
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
            )
        
        # Create experiment
        experiment_id = str(uuid.uuid4())
        create_experiment(db_conn, experiment_id, experiment_name, experiment_description)
        click.echo(f"✅ Created experiment: {experiment_id}")
        
        # Process comparisons
        video_uploads = 0
        
        with click.progressbar(comparisons_data, label='Processing comparisons') as bar:
            for comparison_data in bar:
                # Handle video uploads
                video_a_url = comparison_data['model_a_video_path']
                video_b_url = comparison_data['model_b_video_path']
                
                if upload_videos:
                    # Upload videos if they're local files
                    video_a_path = os.path.join(data_dir, comparison_data['model_a_video_path'].replace('./', ''))
                    video_b_path = os.path.join(data_dir, comparison_data['model_b_video_path'].replace('./', ''))
                    
                    if os.path.exists(video_a_path):
                        video_a_url = upload_video_to_tigris(
                            s3_client, video_a_path, experiment_id, 
                            comparison_data['comparison_id'], 'model_a'
                        )
                        video_uploads += 1
                    
                    if os.path.exists(video_b_path):
                        video_b_url = upload_video_to_tigris(
                            s3_client, video_b_path, experiment_id, 
                            comparison_data['comparison_id'], 'model_b'
                        )
                        video_uploads += 1
                
                # Insert comparison
                insert_comparison(db_conn, comparison_data, experiment_id, video_a_url, video_b_url)
        
        # Activate experiment
        activate_experiment(db_conn, experiment_id)
        
        # Summary
        click.echo(f"\n🎉 Upload complete!")
        click.echo(f"   📝 Experiment: {experiment_name} ({experiment_id})")
        click.echo(f"   📊 Comparisons: {len(comparisons_data)}")
        if upload_videos:
            click.echo(f"   📹 Videos uploaded: {video_uploads}")
        click.echo(f"   🌐 Available at: http://localhost:3000/evaluate")
        
        db_conn.close()
        
    except Exception as e:
        click.echo(f"❌ Upload failed: {e}")
        import traceback
        if click.get_current_context().params.get('verbose'):
            click.echo(traceback.format_exc())


def _load_models(config_path: str, use_mock: bool, dry_run: bool) -> Dict:
    """Load models based on configuration."""
    
    if use_mock or not config_path:
        return _create_mock_models(dry_run)
    
    try:
        if not dry_run:
            models = ModelLoader.load_from_config(config_path)
            click.echo(f"✅ Loaded {len(models)} models from config")
            return models
        else:
            with open(config_path, 'r') as f:
                cfg = yaml.safe_load(f)
            model_names = list(cfg.get('models', {}).keys())
            click.echo(f"🔍 Would load {len(model_names)} models from config: {model_names}")
            return {name: None for name in model_names}
    except Exception as e:
        click.echo(f"⚠️  Failed to load models from config: {e}")
        click.echo("Falling back to mock models...")
        return _create_mock_models(dry_run)


def _create_mock_models(dry_run: bool = False) -> Dict:
    """Create mock models for testing."""
    
    if dry_run:
        return {
            "Skywork/Matrix-Game": None,
            "baseline_model": None
        }
    
    from models.base_model import BaseWorldModel
    
    class MockModel(BaseWorldModel):
        def load_model(self, checkpoint_path=None):
            pass
        
        def generate_video(self, reference_image, actions, **kwargs):
            num_frames = kwargs.get('num_frames', 65)
            frames = np.random.randint(0, 255, (num_frames, 720, 1280, 3), dtype=np.uint8)
            
            # Add model-specific characteristics
            if "matrix" in self.model_name.lower():
                frames[:, :360, :, 1] = np.minimum(frames[:, :360, :, 1] + 30, 255)  # Green tint
            else:
                frames[:, :360, :, 2] = np.minimum(frames[:, :360, :, 2] + 30, 255)  # Blue tint
            
            return frames
        
        def preprocess_image(self, image):
            return image
        
        def preprocess_actions(self, actions):
            return actions
    
    models = {
        "Skywork/Matrix-Game": MockModel("Skywork/Matrix-Game"),
        "baseline_model": MockModel("baseline_model")
    }
    
    for model in models.values():
        model.load_model()
    
    return models


def _create_reference_images(scenarios):
    """Create reference images for scenarios."""
    reference_images = {}
    
    biome_colors = {
        "beach": [255, 220, 150],
        "desert": [255, 200, 100],
        "forest": [50, 150, 50],
        "hills": [100, 150, 100],
        "icy": [200, 220, 255],
        "mushroom": [200, 100, 150],
        "plains": [100, 200, 100],
        "river": [100, 150, 200]
    }
    
    for scenario in scenarios:
        biome = scenario.get("biome", "plains")
        color = biome_colors.get(biome, [128, 128, 128])
        
        # Create gradient background
        ref_image = np.zeros((720, 1280, 3), dtype=np.uint8)
        
        # Sky gradient (top third)
        sky_color = [135, 206, 235]
        for y in range(240):
            blend_factor = y / 240
            ref_image[y, :] = [
                int(sky_color[0] * (1 - blend_factor) + color[0] * blend_factor),
                int(sky_color[1] * (1 - blend_factor) + color[1] * blend_factor),
                int(sky_color[2] * (1 - blend_factor) + color[2] * blend_factor)
            ]
        
        # Ground
        ref_image[240:, :] = color
        
        # Add texture
        noise = np.random.randint(-20, 20, (720, 1280, 3))
        ref_image = np.clip(ref_image.astype(int) + noise, 0, 255).astype(np.uint8)
        
        reference_images[scenario.get("id", scenario["name"])] = ref_image
    
    return reference_images