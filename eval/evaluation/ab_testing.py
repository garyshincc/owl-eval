"""
A/B testing framework for comparing world generation models.
Stores videos in Tigris and metadata in PostgreSQL.
"""

import os
import uuid
import json
import tempfile
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import imageio
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from botocore.exceptions import ClientError

from models.base_model import BaseWorldModel


@dataclass
class VideoComparison:
    """Container for a single A/B comparison."""
    comparison_id: str
    scenario_id: str
    model_a_name: str
    model_b_name: str
    model_a_video_url: str
    model_b_video_url: str
    action_sequence: List[Dict[str, Any]]
    scenario_metadata: Dict[str, Any]
    randomized_labels: Dict[str, str]  # Maps "A"/"B" to actual model names
    created_at: datetime
    experiment_id: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "comparison_id": self.comparison_id,
            "scenario_id": self.scenario_id,
            "model_a_name": self.model_a_name,
            "model_b_name": self.model_b_name,
            "model_a_video_url": self.model_a_video_url,
            "model_b_video_url": self.model_b_video_url,
            "action_sequence": self.action_sequence,
            "scenario_metadata": self.scenario_metadata,
            "randomized_labels": self.randomized_labels,
            "created_at": self.created_at.isoformat(),
            "experiment_id": self.experiment_id
        }


@dataclass
class EvaluationResult:
    """Results from a single human evaluation."""
    result_id: str
    comparison_id: str
    evaluator_id: str
    dimension_scores: Dict[str, str]  # dimension -> selected model ("A" or "B")
    # detailed_ratings: Dict[str, int]  # criterion -> rating value
    evaluation_time_seconds: float
    created_at: datetime
    status: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "result_id": self.result_id,
            "comparison_id": self.comparison_id,
            "evaluator_id": self.evaluator_id,
            "dimension_scores": self.dimension_scores,
            # "detailed_ratings": self.detailed_ratings,
            "evaluation_time_seconds": self.evaluation_time_seconds,
            "created_at": self.created_at.isoformat(),
            "status": self.status
        }


class ABTestingFramework:
    """Framework for conducting A/B tests with database storage."""
    
    def __init__(self, experiment_name: str, experiment_description: str = ""):
        self.experiment_name = experiment_name
        self.experiment_description = experiment_description
        self.experiment_id = None
        
        # Initialize database connection
        self.db_connection = self._connect_to_database()
        
        # Initialize Tigris S3 client
        self.s3_client = self._initialize_tigris_client()
        self.bucket_name = os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')
        
        # Create experiment in database
        self._create_experiment()
    
    def _connect_to_database(self):
        """Connect to PostgreSQL database."""
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        try:
            conn = psycopg2.connect(database_url)
            conn.autocommit = True
            return conn
        except Exception as e:
            raise ConnectionError(f"Failed to connect to database: {e}")
    
    def _initialize_tigris_client(self):
        """Initialize Tigris S3 client."""
        return boto3.client(
            's3',
            endpoint_url=os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev'),
            region_name=os.getenv('AWS_REGION', 'auto'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
    
    def _create_experiment(self):
        """Create experiment in database following Prisma schema."""
        with self.db_connection.cursor() as cursor:
            # Generate unique experiment ID and slug
            experiment_id = str(uuid.uuid4())
            base_slug = self.experiment_name.lower().replace(' ', '-').replace('_', '-')
            slug = base_slug
            
            # Ensure slug is unique
            counter = 1
            while True:
                cursor.execute('SELECT COUNT(*) FROM "Experiment" WHERE slug = %s', (slug,))
                if cursor.fetchone()[0] == 0:
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            cursor.execute("""
                INSERT INTO "Experiment" (
                    id, slug, name, description, status, config, "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """, (
                experiment_id,
                slug,
                self.experiment_name,
                self.experiment_description or '',
                'draft',
                json.dumps({}),
                datetime.now()
            ))
            
            result = cursor.fetchone()
            self.experiment_id = result[0]
            print(f"Created experiment: {self.experiment_name} (ID: {self.experiment_id})")
    
    def _upload_video_to_tigris(self, frames: np.ndarray, key: str) -> str:
        """Upload video frames to Tigris and return URL."""
        # Ensure frames are in the right format
        if frames.dtype != np.uint8:
            frames = (frames * 255).astype(np.uint8)
        
        # Create temporary file for video
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
            try:
                # Save video to temporary file
                imageio.mimwrite(temp_file.name, frames, fps=16, codec='libx264')
                
                # Upload to Tigris
                with open(temp_file.name, 'rb') as video_file:
                    self.s3_client.upload_fileobj(
                        video_file,
                        self.bucket_name,
                        key,
                        ExtraArgs={
                            'ContentType': 'video/mp4',
                            'ACL': 'public-read'
                        }
                    )
                
                # Generate public URL
                endpoint = os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev').replace('https://', '')
                video_url = f"https://{endpoint}/{self.bucket_name}/{key}"
                
                print(f"Uploaded video to: {video_url}")
                return video_url
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
    
    def _save_comparison_to_database(self, comparison: VideoComparison):
        """Save comparison metadata to database following Prisma schema."""
        with self.db_connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO "Comparison" (
                    id, "experimentId", "scenarioId", "modelA", "modelB",
                    "videoAPath", "videoBPath", metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                comparison.comparison_id,
                comparison.experiment_id,
                comparison.scenario_id,
                comparison.model_a_name,
                comparison.model_b_name,
                comparison.model_a_video_url,
                comparison.model_b_video_url,
                json.dumps({
                    'actionSequence': comparison.action_sequence,
                    'scenarioMetadata': comparison.scenario_metadata,
                    'randomizedLabels': comparison.randomized_labels
                })
            ))
        
        print(f"Saved comparison to database: {comparison.comparison_id}")
    
    def create_comparison(
        self,
        model_a: BaseWorldModel,
        model_b: BaseWorldModel,
        scenario: Dict[str, Any],
        reference_image: np.ndarray,
        randomize_order: bool = True
    ) -> VideoComparison:
        """
        Create a single A/B comparison between two models.
        
        Args:
            model_a: First model
            model_b: Second model
            scenario: Test scenario dictionary
            reference_image: Starting frame for generation
            randomize_order: Whether to randomize which model is shown as "A" or "B"
            
        Returns:
            VideoComparison object with videos uploaded to Tigris
        """
        comparison_id = str(uuid.uuid4())
        
        print(f"Creating comparison {comparison_id}")
        print(f"Generating video for {model_a.model_name}...")
        
        # Generate videos from both models
        video_a = model_a.generate_video(
            reference_image=reference_image,
            actions=scenario["actions"],
            num_frames=scenario["duration_frames"]
        )
        
        print(f"Generating video for {model_b.model_name}...")
        video_b = model_b.generate_video(
            reference_image=reference_image,
            actions=scenario["actions"],
            num_frames=scenario["duration_frames"]
        )
        
        # Generate Tigris keys
        key_a = f"experiments/{self.experiment_id}/comparisons/{comparison_id}/model_a.mp4"
        key_b = f"experiments/{self.experiment_id}/comparisons/{comparison_id}/model_b.mp4"
        
        # Upload videos to Tigris
        print("Uploading videos to Tigris...")
        url_a = self._upload_video_to_tigris(video_a, key_a)
        url_b = self._upload_video_to_tigris(video_b, key_b)
        
        # Randomize labels if requested
        if randomize_order and np.random.random() < 0.5:
            # Swap the models
            randomized_labels = {"A": model_b.model_name, "B": model_a.model_name}
            display_url_a = url_b
            display_url_b = url_a
        else:
            randomized_labels = {"A": model_a.model_name, "B": model_b.model_name}
            display_url_a = url_a
            display_url_b = url_b
        
        # Create comparison object
        comparison = VideoComparison(
            comparison_id=comparison_id,
            scenario_id=scenario.get("id", scenario["name"]),
            model_a_name=model_a.model_name,
            model_b_name=model_b.model_name,
            model_a_video_url=display_url_a,
            model_b_video_url=display_url_b,
            action_sequence=scenario["actions"],
            scenario_metadata=scenario,
            randomized_labels=randomized_labels,
            created_at=datetime.now(),
            experiment_id=self.experiment_id
        )
        
        # Save to database
        self._save_comparison_to_database(comparison)
        
        return comparison
    
    def create_comparison_batch(
        self,
        models: Dict[str, BaseWorldModel],
        scenarios: List[Dict[str, Any]],
        reference_images: Dict[str, np.ndarray],
        pairs_per_scenario: int = 1,
        model_pairs: Optional[List[Tuple[str, str]]] = None
    ) -> List[VideoComparison]:
        """
        Create a batch of comparisons for multiple scenarios.
        
        Args:
            models: Dictionary of model name -> model instance
            scenarios: List of test scenarios
            reference_images: Dictionary of scenario -> reference image
            pairs_per_scenario: Number of comparison pairs per scenario
            model_pairs: Optional list of (model_a, model_b) pairs to compare
            
        Returns:
            List of VideoComparison objects
        """
        comparisons = []
        
        # Default to all pairwise comparisons if not specified
        if model_pairs is None:
            model_names = list(models.keys())
            model_pairs = [
                (model_names[i], model_names[j])
                for i in range(len(model_names))
                for j in range(i + 1, len(model_names))
            ]
        
        print(f"Creating {len(scenarios)} scenarios × {len(model_pairs)} model pairs × {pairs_per_scenario} repetitions = {len(scenarios) * len(model_pairs) * pairs_per_scenario} comparisons")
        
        for scenario_idx, scenario in enumerate(scenarios):
            scenario_biome = scenario.get("biome", "plains")
            ref_image = reference_images.get(
                scenario.get("id", scenario["name"]),
                reference_images.get(scenario_biome)
            )
            
            print(f"\nProcessing scenario {scenario_idx + 1}/{len(scenarios)}: {scenario['name']}")
            
            for rep in range(pairs_per_scenario):
                for pair_idx, (model_a_name, model_b_name) in enumerate(model_pairs):
                    print(f"  Pair {pair_idx + 1}/{len(model_pairs)}, Rep {rep + 1}: {model_a_name} vs {model_b_name}")
                    
                    comparison = self.create_comparison(
                        model_a=models[model_a_name],
                        model_b=models[model_b_name],
                        scenario=scenario,
                        reference_image=ref_image
                    )
                    comparisons.append(comparison)
        
        return comparisons
    
    def finalize_experiment(self):
        """Mark experiment as active and ready for evaluation."""
        with self.db_connection.cursor() as cursor:
            cursor.execute("""
                UPDATE "Experiment" 
                SET status = 'active'
                WHERE id = %s
            """, (self.experiment_id,))
        
        print(f"Experiment {self.experiment_name} is now active and ready for evaluation!")
        print(f"Experiment ID: {self.experiment_id}")
    
    def get_experiment_stats(self) -> Dict[str, Any]:
        """Get statistics about the created experiment."""
        with self.db_connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT 
                    e.name,
                    e.status,
                    e."createdAt",
                    COUNT(c.id) as comparison_count,
                    ARRAY_AGG(DISTINCT c."modelA") || ARRAY_AGG(DISTINCT c."modelB") as models,
                    ARRAY_AGG(DISTINCT c."scenarioId") as scenarios
                FROM "Experiment" e
                LEFT JOIN "Comparison" c ON e.id = c."experimentId"
                WHERE e.id = %s
                GROUP BY e.id, e.name, e.status, e."createdAt"
            """, (self.experiment_id,))
            
            result = cursor.fetchone()
            
            if result:
                # Clean up duplicates in models array
                all_models = result['models'] or []
                unique_models = list(set([m for m in all_models if m is not None]))
                
                return {
                    'experiment_id': self.experiment_id,
                    'name': result['name'],
                    'status': result['status'],
                    'created_at': result['createdAt'],
                    'comparison_count': result['comparison_count'],
                    'unique_models': unique_models,
                    'scenarios': result['scenarios'] or []
                }
            return {}
    
    def close(self):
        """Close database connection."""
        if self.db_connection:
            self.db_connection.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()