#!/usr/bin/env tsx
/**
 * Storage Management Script
 * 
 * Provides Tigris/S3 storage operations for listing, uploading, and managing files.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { S3Client, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

const program = new Command();

program
  .name('storage-manage')
  .description('Storage management utilities for Tigris/S3')
  .version('1.0.0');

// Initialize S3 client
function getS3Client() {
  return new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || 'https://fly.storage.tigris.dev',
    region: process.env.AWS_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucketName() {
  return process.env.TIGRIS_BUCKET_NAME || 'eval-data';
}

// List objects command
program
  .command('list')
  .description('List objects in cloud storage')
  .option('-p, --prefix <prefix>', 'Filter by prefix')
  .option('-d, --detailed', 'Show detailed information')
  .action(async (options) => {
    try {
      const s3Client = getS3Client();
      const bucketName = getBucketName();
      
      console.log(chalk.blue.bold(`\n📁 Listing objects in bucket '${bucketName}'`));
      if (options.prefix) {
        console.log(chalk.gray(`   Prefix: ${options.prefix}`));
      }

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: options.prefix || undefined,
      });

      const response = await s3Client.send(command);
      const objects = response.Contents || [];

      if (objects.length === 0) {
        console.log(chalk.gray('No objects found'));
        return;
      }

      let totalSize = 0;
      objects.forEach((obj: any) => {
        const sizeMB = (obj.Size || 0) / (1024 * 1024);
        totalSize += obj.Size || 0;
        
        if (options.detailed) {
          console.log(chalk.white(obj.Key));
          console.log(chalk.gray(`  Size: ${sizeMB.toFixed(2)} MB`));
          console.log(chalk.gray(`  Modified: ${obj.LastModified?.toISOString()}`));
          console.log();
        } else {
          console.log(chalk.white(obj.Key), chalk.gray(`(${sizeMB.toFixed(2)} MB)`));
        }
      });

      console.log(chalk.blue(`\n📊 Total: ${objects.length} objects, ${(totalSize / (1024 * 1024)).toFixed(2)} MB`));

    } catch (error) {
      console.error(chalk.red('Error listing storage objects:'), error);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Get information about the storage bucket')
  .action(async () => {
    try {
      const s3Client = getS3Client();
      const bucketName = getBucketName();

      console.log(chalk.blue.bold('\n🪣 Storage Bucket Information\n'));
      console.log(chalk.white('Bucket:'), chalk.yellow(bucketName));
      console.log(chalk.white('Endpoint:'), chalk.yellow(process.env.AWS_ENDPOINT_URL_S3 || 'https://fly.storage.tigris.dev'));
      console.log(chalk.white('Region:'), chalk.yellow(process.env.AWS_REGION || 'auto'));

      // Get bucket statistics
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
      });

      const response = await s3Client.send(command);
      const objects = response.Contents || [];
      const totalSize = objects.reduce((sum: number, obj: any) => sum + (obj.Size || 0), 0);

      console.log(chalk.white('Objects:'), chalk.yellow(`${objects.length.toLocaleString()}`));
      console.log(chalk.white('Total Size:'), chalk.yellow(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`));
      console.log(chalk.green('\n✅ Bucket accessible'));

    } catch (error) {
      console.error(chalk.red('❌ Error accessing storage:'), error);
      process.exit(1);
    }
  });

// Upload command
program
  .command('upload <file> <key>')
  .description('Upload a file to storage')
  .option('-t, --content-type <type>', 'Content type (auto-detected if not specified)')
  .action(async (file, key, options) => {
    try {
      const s3Client = getS3Client();
      const bucketName = getBucketName();

      if (!fs.existsSync(file)) {
        console.error(chalk.red(`File not found: ${file}`));
        process.exit(1);
      }

      const fileData = fs.readFileSync(file);
      const fileSize = fs.statSync(file).size;

      // Auto-detect content type if not specified
      let contentType = options.contentType;
      if (!contentType) {
        const ext = path.extname(file).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.mp4': 'video/mp4',
          '.mov': 'video/quicktime',
          '.avi': 'video/x-msvideo',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.json': 'application/json',
        };
        contentType = mimeTypes[ext] || 'application/octet-stream';
      }

      console.log(chalk.blue(`📤 Uploading ${file} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`));
      console.log(chalk.gray(`   Destination: ${bucketName}/${key}`));
      console.log(chalk.gray(`   Content-Type: ${contentType}`));

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileData,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await s3Client.send(command);

      const publicUrl = `https://${process.env.AWS_ENDPOINT_URL_S3?.replace('https://', '') || 'fly.storage.tigris.dev'}/${bucketName}/${key}`;
      
      console.log(chalk.green('✅ Upload complete!'));
      console.log(chalk.blue(`   URL: ${publicUrl}`));

    } catch (error) {
      console.error(chalk.red('Upload failed:'), error);
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete <key>')
  .description('Delete an object from storage')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (key, options) => {
    try {
      const s3Client = getS3Client();
      const bucketName = getBucketName();

      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.red(`⚠️  Are you sure you want to delete "${key}"? Type "yes" to confirm: `), resolve);
        });
        
        rl.close();
        
        if (answer !== 'yes') {
          console.log(chalk.gray('Operation cancelled'));
          return;
        }
      }

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
      console.log(chalk.green(`✅ Deleted: ${key}`));

    } catch (error) {
      console.error(chalk.red('Delete failed:'), error);
      process.exit(1);
    }
  });

// Object info command
program
  .command('object-info <key>')
  .description('Get detailed information about an object')
  .action(async (key) => {
    try {
      const s3Client = getS3Client();
      const bucketName = getBucketName();

      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);

      console.log(chalk.blue.bold(`\n📄 Object Information: ${key}\n`));
      console.log(chalk.white('Bucket:'), chalk.yellow(bucketName));
      console.log(chalk.white('Size:'), chalk.yellow(`${((response.ContentLength || 0) / (1024 * 1024)).toFixed(2)} MB`));
      console.log(chalk.white('Modified:'), chalk.yellow(response.LastModified?.toISOString()));
      console.log(chalk.white('ETag:'), chalk.yellow(response.ETag));
      console.log(chalk.white('Content-Type:'), chalk.yellow(response.ContentType || 'Unknown'));

      const publicUrl = `https://${process.env.AWS_ENDPOINT_URL_S3?.replace('https://', '') || 'fly.storage.tigris.dev'}/${bucketName}/${key}`;
      console.log(chalk.white('Public URL:'), chalk.blue(publicUrl));

    } catch (error) {
      console.error(chalk.red('Error getting object info:'), error);
      process.exit(1);
    }
  });

program.parse();