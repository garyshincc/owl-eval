#!/usr/bin/env tsx
/**
 * Video Management Script
 * 
 * Provides video library operations like listing, tagging, and bulk editing.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

const program = new Command();

program
  .name('video-manage')
  .description('Video library management utilities')
  .version('1.0.0');

// Get base URL for API calls
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

// List videos command
program
  .command('list')
  .description('List all videos in the library')
  .option('--model <model>', 'Filter by model name')
  .option('--scenario <scenario>', 'Filter by scenario')
  .option('--tag <tag>', 'Filter by tag')
  .option('--group <group>', 'Filter by group')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n📹 Video Library\n'));
      
      const baseUrl = getBaseUrl();
      let url = `${baseUrl}/api/videos`;
      const params = new URLSearchParams();
      
      if (options.model) params.append('model', options.model);
      if (options.scenario) params.append('scenario', options.scenario);
      if (options.tag) params.append('tag', options.tag);
      if (options.group) params.append('group', options.group);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const videos = await response.json();
      
      if (videos.length === 0) {
        console.log(chalk.gray('No videos found in library.'));
        return;
      }
      
      console.log(chalk.white(`Found ${videos.length} videos:\n`));
      
      videos.forEach((video: any, index: number) => {
        console.log(chalk.white(`${index + 1}. ${video.name}`));
        console.log(chalk.gray(`   Uploaded: ${new Date(video.uploadedAt).toLocaleDateString()}`));
        console.log(chalk.gray(`   Size: ${(video.size / (1024 * 1024)).toFixed(1)} MB`));
        
        if (video.modelName) {
          console.log(chalk.cyan(`   Model: ${video.modelName}`));
        }
        if (video.scenarioId) {
          console.log(chalk.cyan(`   Scenario: ${video.scenarioId}`));
        }
        if (video.tags && video.tags.length > 0) {
          console.log(chalk.magenta(`   Tags: ${video.tags.join(', ')}`));
        }
        if (video.groups && video.groups.length > 0) {
          console.log(chalk.blue(`   Groups: ${video.groups.join(', ')}`));
        }
        console.log();
      });
      
    } catch (error) {
      console.error(chalk.red('Error listing videos:'), error);
      process.exit(1);
    }
  });

// Bulk edit command
program
  .command('bulk-edit')
  .description('Bulk edit video metadata')
  .option('--pattern <pattern>', 'File name pattern to match')
  .option('--model <model>', 'Filter by existing model name')
  .option('--scenario <scenario>', 'Filter by existing scenario')
  .option('--set-model <model>', 'Set model name')
  .option('--set-scenario <scenario>', 'Set scenario ID')
  .option('--add-tags <tags>', 'Add tags (comma-separated)')
  .option('--remove-tags <tags>', 'Remove tags (comma-separated)')
  .option('--add-groups <groups>', 'Add groups (comma-separated)')
  .option('--remove-groups <groups>', 'Remove groups (comma-separated)')
  .option('--dry-run', 'Show what would be changed without making changes')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n✏️  Bulk editing videos\n'));
      
      const baseUrl = getBaseUrl();
      
      // Get videos to edit
      let url = `${baseUrl}/api/videos`;
      const params = new URLSearchParams();
      
      if (options.model) params.append('model', options.model);
      if (options.scenario) params.append('scenario', options.scenario);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }
      
      let videos = await response.json();
      
      // Filter by pattern if provided
      if (options.pattern) {
        const pattern = new RegExp(options.pattern.replace(/\*/g, '.*'), 'i');
        videos = videos.filter((v: any) => pattern.test(v.name));
      }
      
      if (videos.length === 0) {
        console.log(chalk.yellow('No videos match the specified criteria.'));
        return;
      }
      
      console.log(chalk.white(`Found ${videos.length} videos to edit:\n`));
      videos.forEach((video: any, index: number) => {
        console.log(chalk.gray(`${index + 1}. ${video.name}`));
      });
      
      if (options.dryRun) {
        console.log(chalk.blue('\n🔍 DRY RUN - No changes will be made'));
        return;
      }
      
      // Prepare bulk edit data
      const updates: any = {};
      
      if (options.setModel) updates.modelName = options.setModel;
      if (options.setScenario) updates.scenarioId = options.setScenario;
      
      if (options.addTags) {
        updates.tags = {
          operation: 'add',
          values: options.addTags.split(',').map((t: string) => t.trim())
        };
      }
      
      if (options.removeTags) {
        updates.tags = {
          operation: 'remove',
          values: options.removeTags.split(',').map((t: string) => t.trim())
        };
      }
      
      if (options.addGroups) {
        updates.groups = {
          operation: 'add',
          values: options.addGroups.split(',').map((g: string) => g.trim())
        };
      }
      
      if (options.removeGroups) {
        updates.groups = {
          operation: 'remove',
          values: options.removeGroups.split(',').map((g: string) => g.trim())
        };
      }
      
      if (Object.keys(updates).length === 0) {
        console.log(chalk.yellow('No updates specified. Use --set-model, --add-tags, etc.'));
        return;
      }
      
      // Apply bulk edits
      const videoIds = videos.map((v: any) => v.id);
      const bulkEditResponse = await fetch(`${baseUrl}/api/videos/bulk-edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoIds,
          updates
        })
      });
      
      if (!bulkEditResponse.ok) {
        const error = await bulkEditResponse.json();
        throw new Error(error.error || 'Failed to bulk edit videos');
      }
      
      const result = await bulkEditResponse.json();
      console.log(chalk.green.bold(`\n✅ Updated ${result.updatedCount} videos successfully!`));
      
    } catch (error) {
      console.error(chalk.red('Error bulk editing videos:'), error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show video library statistics')
  .action(async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/videos`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const videos = await response.json();
      
      console.log(chalk.blue.bold('\n📊 Video Library Statistics\n'));
      
      // Basic stats
      console.log(chalk.white('Total Videos:'), chalk.yellow(videos.length));
      
      const totalSize = videos.reduce((sum: number, video: any) => sum + (video.size || 0), 0);
      console.log(chalk.white('Total Size:'), chalk.yellow(`${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`));
      
      // Model breakdown
      const modelCounts: Record<string, number> = {};
      const scenarioCounts: Record<string, number> = {};
      
      videos.forEach((video: any) => {
        if (video.modelName) {
          modelCounts[video.modelName] = (modelCounts[video.modelName] || 0) + 1;
        }
        if (video.scenarioId) {
          scenarioCounts[video.scenarioId] = (scenarioCounts[video.scenarioId] || 0) + 1;
        }
      });
      
      if (Object.keys(modelCounts).length > 0) {
        console.log(chalk.blue('\n🤖 By Model:'));
        Object.entries(modelCounts).forEach(([model, count]) => {
          console.log(chalk.white(`  ${model}:`), chalk.yellow(count));
        });
      }
      
      if (Object.keys(scenarioCounts).length > 0) {
        console.log(chalk.blue('\n🌍 By Scenario:'));
        Object.entries(scenarioCounts).forEach(([scenario, count]) => {
          console.log(chalk.white(`  ${scenario}:`), chalk.yellow(count));
        });
      }
      
    } catch (error) {
      console.error(chalk.red('Error getting video stats:'), error);
      process.exit(1);
    }
  });

program.parse();