#!/usr/bin/env tsx
/**
 * Database Management Script
 * 
 * Provides database status, counting, and cleanup operations.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { prisma } from './prisma-client';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

const program = new Command();

program
  .name('db-manage')
  .description('Database management utilities')
  .version('1.0.0');

// Database status command
program
  .command('status')
  .description('Show database connection status and summary')
  .action(async () => {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          'Experiments' as table_name,
          COUNT(*) as count
        FROM "Experiment"
        UNION ALL
        SELECT 
          'Comparisons',
          COUNT(*)
        FROM "Comparison"
        UNION ALL
        SELECT 
          'Evaluations',
          COUNT(*)
        FROM "Evaluation"
        UNION ALL
        SELECT 
          'Videos',
          COUNT(*)
        FROM "Video"
      `;

      console.log(chalk.blue.bold('\n🗄️  Database Status\n'));
      
      (stats as any[]).forEach((row) => {
        console.log(chalk.white(`${row.table_name}:`), chalk.yellow(`${row.count} records`));
      });

      console.log(chalk.green('\n✅ Database connection successful'));
      
    } catch (error) {
      console.error(chalk.red('❌ Database connection failed:'), error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Count records command
program
  .command('count')
  .description('Count records in database tables')
  .option('-t, --table <table>', 'Specific table to count')
  .action(async (options) => {
    try {
      if (options.table) {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${options.table}"`);
        console.log(chalk.blue(`📊 ${options.table}:`), chalk.yellow(`${(result as any)[0].count} records`));
      } else {
        const tables = ['Experiment', 'Comparison', 'Evaluation', 'Video', 'Participant'];
        console.log(chalk.blue.bold('\n📊 Record Counts\n'));
        
        for (const table of tables) {
          try {
            const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
            console.log(chalk.white(`${table}:`), chalk.yellow(`${(result as any)[0].count} records`));
          } catch (error) {
            console.log(chalk.white(`${table}:`), chalk.red('Error'));
          }
        }
      }
    } catch (error) {
      console.error(chalk.red('Error counting records:'), error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Clean database command
program
  .command('clean')
  .description('Delete all records from tables (DANGEROUS!)')
  .option('-t, --table <table>', 'Delete specific table only')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.red('⚠️  Are you sure you want to delete ALL data? Type "yes" to confirm: '), resolve);
        });
        
        rl.close();
        
        if (answer !== 'yes') {
          console.log(chalk.gray('Operation cancelled'));
          return;
        }
      }

      if (options.table) {
        await prisma.$queryRawUnsafe(`DELETE FROM "${options.table}"`);
        console.log(chalk.green(`✅ Deleted all records from ${options.table}`));
      } else {
        // Delete in dependency order
        const tables = ['Evaluation', 'Participant', 'Comparison', 'Experiment', 'Video'];
        
        for (const table of tables) {
          try {
            await prisma.$queryRawUnsafe(`DELETE FROM "${table}"`);
            console.log(chalk.green(`✅ Deleted all records from ${table}`));
          } catch (error) {
            console.log(chalk.yellow(`⚠️  Error deleting ${table}:`, error));
          }
        }
      }
      
      console.log(chalk.green.bold('\n🗑️  Database cleanup complete'));
      
    } catch (error) {
      console.error(chalk.red('Error cleaning database:'), error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

// Query command
program
  .command('query <sql>')
  .description('Run a custom SQL query')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .action(async (sql, options) => {
    try {
      const result = await prisma.$queryRawUnsafe(sql);
      
      if (Array.isArray(result) && result.length > 0) {
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // Simple table format
          console.log(chalk.blue.bold('\n📋 Query Results\n'));
          console.table(result);
        }
      } else {
        console.log(chalk.gray('No results returned'));
      }
      
    } catch (error) {
      console.error(chalk.red('Query failed:'), error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();