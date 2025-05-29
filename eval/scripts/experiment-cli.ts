#!/usr/bin/env node

import { Command } from 'commander';
import { generateSlug, isValidSlug, slugify } from '../frontend/src/lib/utils/slug';
import * as readline from 'readline';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { requireAuth, clearAuth } from './auth';
import { prisma } from './prisma-client';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

// Create readline interface lazily to avoid conflicts with auth
let rl: readline.Interface | null = null;
let question: (prompt: string) => Promise<string>;

function getReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    question = promisify(rl.question).bind(rl);
  }
  return { rl, question };
}

const program = new Command();

program
  .name('experiment-cli')
  .description('CLI for managing evaluation experiments')
  .version('1.0.0');

// Create new experiment command
program
  .command('create')
  .description('Create a new experiment interactively')
  .option('-n, --name <name>', 'Experiment name')
  .option('-s, --slug <slug>', 'URL-friendly slug (auto-generated if not provided)')
  .option('-d, --description <description>', 'Experiment description')
  .action(async (options) => {
    await requireAuth('create experiments', async (auth) => {
      console.log(chalk.blue.bold('\n🧪 Creating a new experiment\n'));

      try {
      const { rl, question } = getReadline();
      
      // Interactive prompts
      const name = options.name || await question(chalk.cyan('Experiment name: '));
      
      let slug = options.slug;
      if (!slug) {
        const suggestedSlug = generateSlug();
        const useGenerated = await question(
          chalk.cyan(`Slug (press Enter for "${chalk.yellow(suggestedSlug)}"): `)
        );
        slug = useGenerated || suggestedSlug;
      }
      
      // Validate slug
      if (!isValidSlug(slug)) {
        console.log(chalk.red('Invalid slug. Converting to valid format...'));
        slug = slugify(slug);
      }
      
      const description = options.description || 
        await question(chalk.cyan('Description (optional): '));
      
      // Model configuration
      console.log(chalk.blue('\n📊 Model Configuration'));
      const modelsInput = await question(
        chalk.cyan('Models to compare (comma-separated, e.g., "model1,model2"): ')
      );
      const models = modelsInput.split(',').map((m: string) => m.trim());
      
      // Scenario configuration
      const scenariosInput = await question(
        chalk.cyan('Scenarios (comma-separated, e.g., "forest,desert,ocean"): ')
      );
      const scenarios = scenariosInput.split(',').map((s: string) => s.trim());
      
      // Create experiment
      const experiment = await prisma.experiment.create({
        data: {
          name,
          slug,
          description: description || null,
          status: 'draft',
          createdBy: auth.userId,
          config: {
            models,
            scenarios,
            evaluationsPerComparison: 5,
            dimensions: [
              'overall_quality',
              'controllability',
              'visual_quality',
              'temporal_consistency'
            ]
          }
        }
      });
      
      console.log(chalk.green.bold('\n✅ Experiment created successfully!\n'));
      console.log(chalk.white('ID:'), chalk.yellow(experiment.id));
      console.log(chalk.white('Slug:'), chalk.yellow(experiment.slug));
      console.log(chalk.white('Status:'), chalk.yellow(experiment.status));
      console.log(chalk.white('\nEvaluation URL:'), 
        chalk.blue.underline(`https://yourdomain.com/evaluate/${experiment.slug}`));
      
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('1. Generate videos using: python scripts/cli.py generate-videos'));
      console.log(chalk.gray('2. Import comparisons using: experiment-cli import-comparisons'));
      console.log(chalk.gray('3. Launch experiment using: experiment-cli launch'));
      
      } catch (error) {
        console.error(chalk.red('Error creating experiment:'), error);
      } finally {
        if (rl) {
          rl.close();
        }
        await prisma.$disconnect();
      }
    }, true); // Require admin permissions
  });

// List experiments command
program
  .command('list')
  .description('List all experiments')
  .option('-s, --status <status>', 'Filter by status (draft, active, completed, archived)')
  .action(async (options) => {
    try {
      const where = options.status ? { status: options.status } : {};
      const experiments = await prisma.experiment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              comparisons: true,
              participants: true,
              evaluations: true,
            }
          }
        }
      });
      
      console.log(chalk.blue.bold('\n📋 Experiments\n'));
      
      if (experiments.length === 0) {
        console.log(chalk.gray('No experiments found.'));
      } else {
        experiments.forEach((exp) => {
          const statusColor = {
            draft: 'gray',
            active: 'green',
            completed: 'blue',
            archived: 'red'
          }[exp.status] || 'white';
          
          console.log(chalk.bold.white(`${exp.name} (${exp.slug})`));
          console.log(chalk[statusColor](`  Status: ${exp.status}`));
          console.log(chalk.gray(`  Created: ${exp.createdAt.toLocaleDateString()}`));
          console.log(chalk.gray(`  Comparisons: ${exp._count.comparisons}`));
          console.log(chalk.gray(`  Participants: ${exp._count.participants}`));
          console.log(chalk.gray(`  Evaluations: ${exp._count.evaluations}`));
          if (exp.prolificStudyId) {
            console.log(chalk.cyan(`  Prolific Study: ${exp.prolificStudyId}`));
          }
          console.log();
        });
      }
    } catch (error) {
      console.error(chalk.red('Error listing experiments:'), error);
    } finally {
      await prisma.$disconnect();
    }
  });

// Launch experiment command
program
  .command('launch <slug>')
  .description('Launch an experiment (change status to active)')
  .option('-p, --prolific-id <id>', 'Prolific study ID')
  .action(async (slug, options) => {
    await requireAuth('launch experiments', async (auth) => {
      try {
      const updateData: any = { status: 'active', startedAt: new Date() };
      
      if (options.prolificId) {
        updateData.prolificStudyId = options.prolificId;
      }
      
      const experiment = await prisma.experiment.update({
        where: { slug },
        data: updateData,
      });
      
      console.log(chalk.green.bold('\n🚀 Experiment launched!\n'));
      console.log(chalk.white('Name:'), chalk.yellow(experiment.name));
      console.log(chalk.white('Status:'), chalk.green('active'));
      console.log(chalk.white('Started:'), chalk.yellow(experiment.startedAt?.toLocaleString()));
      
      if (experiment.prolificStudyId) {
        console.log(chalk.white('\nProlific Study ID:'), chalk.cyan(experiment.prolificStudyId));
      }
      
        console.log(chalk.white('\nEvaluation URL:'), 
          chalk.blue.underline(`https://${process.env.NEXT_PUBLIC_BASE_URL}/evaluate/${experiment.slug}`));
        
      } catch (error) {
        console.error(chalk.red('Error launching experiment:'), error);
      } finally {
        await prisma.$disconnect();
      }
    }, true); // Require admin permissions
  });

// Complete experiment command
program
  .command('complete <slug>')
  .description('Mark an experiment as completed')
  .action(async (slug) => {
    await requireAuth('complete experiments', async (auth) => {
      try {
        const experiment = await prisma.experiment.update({
        where: { slug },
        data: { 
          status: 'completed',
          completedAt: new Date()
        },
      });
      
      console.log(chalk.green.bold('\n✅ Experiment completed!\n'));
      console.log(chalk.white('Name:'), chalk.yellow(experiment.name));
        console.log(chalk.white('Completed:'), chalk.yellow(experiment.completedAt?.toLocaleString()));
        
      } catch (error) {
        console.error(chalk.red('Error completing experiment:'), error);
      } finally {
        await prisma.$disconnect();
      }
    }, true); // Require admin permissions
  });

// Stats command
program
  .command('stats <slug>')
  .description('Show experiment statistics')
  .action(async (slug) => {
    await requireAuth('view experiment stats', async (auth) => {
      try {
        const experiment = await prisma.experiment.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              comparisons: true,
              participants: true,
              evaluations: true,
            }
          },
          evaluations: {
            select: {
              dimensionScores: true,
              completionTimeSeconds: true,
            }
          }
        }
      });
      
      if (!experiment) {
        console.log(chalk.red('Experiment not found'));
        return;
      }
      
      console.log(chalk.blue.bold(`\n📊 Statistics for "${experiment.name}"\n`));
      console.log(chalk.white('Status:'), chalk.yellow(experiment.status));
      console.log(chalk.white('Total Comparisons:'), chalk.yellow(experiment._count.comparisons));
      console.log(chalk.white('Total Participants:'), chalk.yellow(experiment._count.participants));
      console.log(chalk.white('Total Evaluations:'), chalk.yellow(experiment._count.evaluations));
      
      if (experiment._count.comparisons > 0) {
        const avgEvaluationsPerComparison = 
          experiment._count.evaluations / experiment._count.comparisons;
        console.log(chalk.white('Avg Evaluations/Comparison:'), 
          chalk.yellow(avgEvaluationsPerComparison.toFixed(2)));
      }
      
      if (experiment.evaluations.length > 0) {
        const avgCompletionTime = experiment.evaluations
          .filter(e => e.completionTimeSeconds)
          .reduce((sum, e) => sum + (e.completionTimeSeconds || 0), 0) / 
          experiment.evaluations.filter(e => e.completionTimeSeconds).length;
        
          console.log(chalk.white('Avg Completion Time:'), 
            chalk.yellow(`${(avgCompletionTime / 60).toFixed(1)} minutes`));
        }
        
      } catch (error) {
        console.error(chalk.red('Error getting stats:'), error);
      } finally {
        await prisma.$disconnect();
      }
    }, true); // Require admin permissions
  });

// List video library command
program
  .command('list-videos')
  .description('List all videos in the video library')
  .action(async () => {
    await requireAuth('list videos', async (auth) => {
      try {
        console.log(chalk.blue.bold('\n📹 Video Library\n'));
        
        const response = await fetch('http://localhost:3000/api/video-library');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const videos = await response.json();
        
        if (videos.length === 0) {
          console.log(chalk.gray('No videos found in library.'));
          console.log(chalk.gray('Upload videos using: npm run upload-videos --dir <directory>'));
          return;
        }
        
        console.log(chalk.white(`Found ${videos.length} videos:\n`));
        
        videos.forEach((video: any, index: number) => {
          console.log(chalk.white(`${index + 1}. ${video.name}`));
          console.log(chalk.gray(`   Uploaded: ${new Date(video.uploadedAt).toLocaleDateString()}`));
          console.log(chalk.gray(`   Size: ${(video.size / (1024 * 1024)).toFixed(1)} MB`));
          console.log(chalk.gray(`   URL: ${video.url}\n`));
        });
        
      } catch (error) {
        console.error(chalk.red('Error listing videos:'), error);
      }
    }, true);
  });

// Auto-assign videos to experiment
program
  .command('assign-videos')
  .description('Auto-assign videos from library to experiment comparisons')
  .option('-e, --experiment <slug>', 'Experiment slug')
  .option('--auto', 'Automatically match videos based on filename patterns')
  .action(async (options) => {
    await requireAuth('assign videos', async (auth) => {
      try {
        console.log(chalk.blue.bold('\n🎯 Assigning Videos to Experiment\n'));
        
        let experimentSlug = options.experiment;
        if (!experimentSlug) {
          const { question } = getReadline();
          experimentSlug = await question(chalk.cyan('Experiment slug: '));
        }
        
        // Get experiment
        const experiment = await prisma.experiment.findUnique({
          where: { slug: experimentSlug },
          include: { comparisons: true }
        });
        
        if (!experiment) {
          console.log(chalk.red(`Experiment "${experimentSlug}" not found.`));
          return;
        }
        
        // Get video library
        const response = await fetch('http://localhost:3000/api/video-library');
        if (!response.ok) {
          throw new Error(`Failed to fetch video library: ${response.status}`);
        }
        const videos = await response.json();
        
        if (videos.length === 0) {
          console.log(chalk.red('No videos found in library.'));
          console.log(chalk.gray('Upload videos first using: npm run upload-videos --dir <directory>'));
          return;
        }
        
        console.log(chalk.white(`Found experiment: ${experiment.name}`));
        console.log(chalk.white(`Available videos: ${videos.length}`));
        
        if (options.auto) {
          // Auto-assign based on filename patterns
          console.log(chalk.blue('\n🤖 Auto-assigning videos based on filename patterns...\n'));
          
          const models = experiment.config?.models || [];
          const scenarios = experiment.config?.scenarios || [];
          
          const comparisons = [];
          
          for (const scenario of scenarios) {
            for (let i = 0; i < models.length; i++) {
              for (let j = i + 1; j < models.length; j++) {
                const modelA = models[i];
                const modelB = models[j];
                
                // Find videos matching the pattern: {scenario}_{model}.mp4
                const videoA = videos.find((v: any) => 
                  v.name.toLowerCase().includes(scenario.toLowerCase()) && 
                  v.name.toLowerCase().includes(modelA.toLowerCase())
                );
                const videoB = videos.find((v: any) => 
                  v.name.toLowerCase().includes(scenario.toLowerCase()) && 
                  v.name.toLowerCase().includes(modelB.toLowerCase())
                );
                
                if (videoA && videoB) {
                  comparisons.push({
                    scenarioId: scenario,
                    modelA,
                    modelB,
                    videoAPath: videoA.url,
                    videoBPath: videoB.url,
                    metadata: {
                      videoAName: videoA.name,
                      videoBName: videoB.name
                    }
                  });
                  
                  console.log(chalk.green(`✓ ${scenario}: ${modelA} vs ${modelB}`));
                  console.log(chalk.gray(`  A: ${videoA.name}`));
                  console.log(chalk.gray(`  B: ${videoB.name}\n`));
                } else {
                  console.log(chalk.yellow(`⚠ ${scenario}: ${modelA} vs ${modelB} - videos not found`));
                }
              }
            }
          }
          
          if (comparisons.length > 0) {
            // Create comparisons
            await prisma.comparison.createMany({
              data: comparisons.map(comp => ({
                ...comp,
                experimentId: experiment.id
              }))
            });
            
            console.log(chalk.green.bold(`\n✅ Created ${comparisons.length} comparisons!`));
          } else {
            console.log(chalk.red('\nNo matching videos found. Check your filename patterns.'));
            console.log(chalk.gray('Expected pattern: {scenario}_{model}.mp4'));
          }
          
        } else {
          // Interactive assignment
          console.log(chalk.blue('\n📋 Interactive video assignment (coming soon)'));
          console.log(chalk.gray('Use --auto flag for automatic assignment based on filename patterns'));
        }
        
      } catch (error) {
        console.error(chalk.red('Error assigning videos:'), error);
      } finally {
        if (rl) rl.close();
        await prisma.$disconnect();
      }
    }, true);
  });

// Logout command
program
  .command('logout')
  .description('Clear stored authentication')
  .action(async () => {
    await clearAuth();
  });

program.parse();