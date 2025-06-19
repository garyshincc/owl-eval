"""
Tigris cloud storage management commands.
"""

import os
import click
from tabulate import tabulate
from pathlib import Path

# Only load environment when needed
_dotenv_loaded = False

def _ensure_dotenv():
    global _dotenv_loaded
    if not _dotenv_loaded:
        from dotenv import load_dotenv
        dotenv_path = Path('frontend/.env.local')
        load_dotenv(dotenv_path=dotenv_path)
        _dotenv_loaded = True

def get_s3_client():
    """Get configured S3 client for Tigris."""
    _ensure_dotenv()
    import boto3
    return boto3.client(
        's3',
        endpoint_url=os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev'),
        region_name=os.getenv('AWS_REGION', 'auto'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )


@click.group()
def tigris_cli():
    """Tigris cloud storage operations."""
    pass


@tigris_cli.command('ls')
@click.option('--prefix', '-p', default='', help='Filter by prefix (e.g., experiments/)')
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
@click.option('--detailed', '-d', is_flag=True, help='Show detailed information')
def list_objects(prefix, bucket, detailed):
    """List objects in Tigris storage."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')
        
        
        click.echo(f"📁 Listing objects in bucket '{bucket_name}'" + (f" with prefix '{prefix}'" if prefix else ""))
        
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
        
        objects = []
        total_size = 0
        
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    size_mb = obj['Size'] / (1024 * 1024)
                    total_size += obj['Size']
                    
                    if detailed:
                        objects.append([
                            obj['Key'],
                            f"{size_mb:.2f} MB",
                            obj['LastModified'].strftime('%Y-%m-%d %H:%M'),
                            obj.get('StorageClass', 'STANDARD')
                        ])
                    else:
                        objects.append([obj['Key'], f"{size_mb:.2f} MB"])
        
        if not objects:
            click.echo("No objects found")
            return
        
        headers = ['Key', 'Size', 'Modified', 'Storage Class'] if detailed else ['Key', 'Size']
        click.echo(tabulate(objects, headers=headers, tablefmt='grid'))
        
        click.echo(f"\n📊 Total: {len(objects)} objects, {total_size / (1024 * 1024):.2f} MB")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except ImportError:
            click.echo(f"❌ Error: {e}")


@tigris_cli.command('rm')
@click.argument('key')
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
@click.confirmation_option(prompt='Are you sure you want to delete this object?')
def remove_object(key, bucket):
    """Delete an object from Tigris storage."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')
        
        s3_client.delete_object(Bucket=bucket_name, Key=key)
        click.echo(f"✅ Deleted: {key}")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except ImportError:
            click.echo(f"❌ Error: {e}")


@tigris_cli.command('info')
@click.argument('key')
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
def object_info(key, bucket):
    """Get detailed information about an object."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')

        response = s3_client.head_object(Bucket=bucket_name, Key=key)
        
        click.echo(f"📄 Object Information: {key}")
        click.echo(f"   Bucket: {bucket_name}")
        click.echo(f"   Size: {response['ContentLength'] / (1024 * 1024):.2f} MB")
        click.echo(f"   Modified: {response['LastModified']}")
        click.echo(f"   ETag: {response['ETag']}")
        click.echo(f"   Content-Type: {response.get('ContentType', 'Unknown')}")
        
        # Generate public URL
        endpoint = os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev').replace('https://', '')
        public_url = f"https://{endpoint}/{bucket_name}/{key}"
        click.echo(f"   Public URL: {public_url}")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError) and e.response['Error']['Code'] == 'NoSuchKey':
                click.echo(f"❌ Object not found: {key}")
            elif isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except (ImportError, AttributeError):
            click.echo(f"❌ Error: {e}")


@tigris_cli.command('upload')
@click.argument('local_path', type=click.Path(exists=True))
@click.argument('key')
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
@click.option('--content-type', '-t', help='Content type (auto-detected if not specified)')
def upload_file(local_path, key, bucket, content_type):
    """Upload a file to Tigris storage."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')

        # Auto-detect content type if not specified
        if not content_type:
            import mimetypes
            content_type, _ = mimetypes.guess_type(local_path)
            content_type = content_type or 'application/octet-stream'
        
        file_size = os.path.getsize(local_path)
        
        click.echo(f"📤 Uploading {local_path} ({file_size / (1024 * 1024):.2f} MB)")
        click.echo(f"   Destination: {bucket_name}/{key}")
        click.echo(f"   Content-Type: {content_type}")
        
        with open(local_path, 'rb') as f:
            s3_client.upload_fileobj(
                f, bucket_name, key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'
                }
            )
        
        # Generate public URL
        endpoint = os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev').replace('https://', '')
        public_url = f"https://{endpoint}/{bucket_name}/{key}"
        
        click.echo(f"✅ Upload complete!")
        click.echo(f"   Public URL: {public_url}")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except ImportError:
            click.echo(f"❌ Error: {e}")


@tigris_cli.command('download')
@click.argument('key')
@click.argument('local_path', type=click.Path())
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
@click.option('--overwrite', is_flag=True, help='Overwrite local file if it exists')
def download_file(key, local_path, bucket, overwrite):
    """Download a file from Tigris storage."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')

        # Check if local file exists
        if os.path.exists(local_path) and not overwrite:
            click.echo(f"❌ File {local_path} already exists. Use --overwrite to replace it.")
            return
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(local_path) or '.', exist_ok=True)
        
        # Get object info first
        try:
            response = s3_client.head_object(Bucket=bucket_name, Key=key)
            file_size = response['ContentLength']
            click.echo(f"📥 Downloading {key} ({file_size / (1024 * 1024):.2f} MB)")
            click.echo(f"   Source: {bucket_name}/{key}")
            click.echo(f"   Destination: {local_path}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                click.echo(f"❌ Object not found: {key}")
                return
            else:
                raise
        
        # Download with progress
        def progress_callback(bytes_transferred):
            progress = (bytes_transferred / file_size) * 100
            click.echo(f"\r   Progress: {progress:.1f}% ({bytes_transferred / (1024 * 1024):.2f} MB)", nl=False)
        
        with open(local_path, 'wb') as f:
            s3_client.download_fileobj(
                bucket_name, key, f,
                Callback=progress_callback
            )
        
        click.echo()  # New line after progress
        click.echo(f"✅ Download complete: {local_path}")
        
        # Verify file size
        downloaded_size = os.path.getsize(local_path)
        if downloaded_size == file_size:
            click.echo(f"   Size verified: {downloaded_size / (1024 * 1024):.2f} MB")
        else:
            click.echo(f"⚠️  Size mismatch: expected {file_size}, got {downloaded_size}")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except ImportError:
            click.echo(f"❌ Error: {e}")


@tigris_cli.command('bucket-info')
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
def bucket_info(bucket):
    """Get information about the bucket."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')
        
        # Check if bucket exists and get info
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            click.echo(f"🪣 Bucket: {bucket_name}")
            click.echo("   Status: ✅ Accessible")
        except Exception as e:
            try:
                from botocore.exceptions import ClientError
                if isinstance(e, ClientError) and e.response['Error']['Code'] == 'NoSuchBucket':
                    click.echo(f"❌ Bucket '{bucket_name}' does not exist")
                    return
                else:
                    raise
            except (ImportError, AttributeError):
                raise
        
        # Get bucket statistics
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket_name)
        
        object_count = 0
        total_size = 0
        
        for page in page_iterator:
            if 'Contents' in page:
                object_count += len(page['Contents'])
                total_size += sum(obj['Size'] for obj in page['Contents'])
        
        click.echo(f"   Objects: {object_count:,}")
        click.echo(f"   Total Size: {total_size / (1024 * 1024):.2f} MB")
        
        # Show bucket region and endpoint
        click.echo(f"   Endpoint: {os.getenv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev')}")
        click.echo(f"   Region: {os.getenv('AWS_REGION', 'auto')}")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except ImportError:
            click.echo(f"❌ Error: {e}")


@tigris_cli.command('cleanup')
@click.option('--prefix', '-p', required=True, help='Delete all objects with this prefix')
@click.option('--bucket', '-b', help='Bucket name (uses env TIGRIS_BUCKET_NAME if not specified)')
@click.option('--dry-run', '-n', is_flag=True, help='Show what would be deleted without actually deleting')
@click.confirmation_option(prompt='Are you sure you want to delete all objects with this prefix?')
def cleanup_prefix(prefix, bucket, dry_run):
    """Delete all objects with a specific prefix."""
    try:
        s3_client = get_s3_client()
        bucket_name = bucket or os.getenv('TIGRIS_BUCKET_NAME', 'eval-data')

        click.echo(f"🗑️  {'Dry run: ' if dry_run else ''}Cleaning up objects with prefix: {prefix}")
        
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
        
        deleted_count = 0
        total_size = 0
        
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    total_size += obj['Size']
                    
                    if dry_run:
                        click.echo(f"   Would delete: {obj['Key']}")
                    else:
                        s3_client.delete_object(Bucket=bucket_name, Key=obj['Key'])
                        click.echo(f"   Deleted: {obj['Key']}")
                    
                    deleted_count += 1
        
        if deleted_count == 0:
            click.echo("No objects found with that prefix")
        else:
            action = "Would delete" if dry_run else "Deleted"
            click.echo(f"✅ {action} {deleted_count} objects ({total_size / (1024 * 1024):.2f} MB)")
        
    except Exception as e:
        # Import ClientError only when needed
        try:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError):
                click.echo(f"❌ Tigris error: {e}")
            else:
                click.echo(f"❌ Error: {e}")
        except ImportError:
            click.echo(f"❌ Error: {e}")