'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink,
  Zap,
  Code,
  Upload,
  Settings,
  Database,
  Users,
  DollarSign
} from 'lucide-react'

interface CLIToolsPanelProps {
  onCopyCommand?: (command: string, id: string) => void
  copiedCommand?: string | null
}

export function CLIToolsPanel({ onCopyCommand, copiedCommand }: CLIToolsPanelProps) {
  const copyToClipboard = async (text: string, commandId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (onCopyCommand) {
        onCopyCommand(text, commandId)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const commands = [
    {
      id: 'generate-content',
      title: 'Generate Content',
      description: 'Generate comparison content using the Python backend',
      icon: <Code className="h-4 w-4" />,
      category: 'Generation',
      command: `python scripts/cli.py generate-content \\
  --models diamond-1b genie-2b \\
  --scenarios simple_task complex_task \\
  --output-dir data/experiments/my-experiment`,
      explanation: 'This command generates evaluation content for comparing different models across specified scenarios.'
    },
    {
      id: 'upload-content',
      title: 'Upload Content to Library',
      description: 'Upload generated content to the library for use in experiments',
      icon: <Upload className="h-4 w-4" />,
      category: 'Management',
      command: 'npm run upload-content --dir ./data/experiments/my-experiment',
      explanation: 'Batch upload content files from a directory to your evaluation library.'
    },
    {
      id: 'create-interactive',
      title: 'Create Experiment (Interactive)',
      description: 'Interactive experiment creation with prompts',
      icon: <Terminal className="h-4 w-4" />,
      category: 'Experiments',
      command: 'npm run experiment create',
      explanation: 'Launch interactive mode to create experiments with step-by-step guidance.'
    },
    {
      id: 'create-options',
      title: 'Create Experiment (With Options)',
      description: 'Create experiment with predefined options',
      icon: <Settings className="h-4 w-4" />,
      category: 'Experiments',
      command: 'npm run experiment create --name "Diamond vs Genie Study" --slug "diamond-vs-genie"',
      explanation: 'Create experiments programmatically with specific configuration options.'
    },
    {
      id: 'list',
      title: 'List Experiments',
      description: 'List all experiments',
      icon: <Database className="h-4 w-4" />,
      category: 'Management',
      command: 'npm run experiment list',
      explanation: 'Display all experiments with their current status and statistics.'
    },
    {
      id: 'stats',
      title: 'Experiment Statistics',
      description: 'Get experiment statistics',
      icon: <Database className="h-4 w-4" />,
      category: 'Management',
      command: 'npm run experiment stats [slug]',
      explanation: 'View detailed statistics for a specific experiment or all experiments.'
    },
    {
      id: 'launch',
      title: 'Launch Experiment',
      description: 'Launch experiment for participants',
      icon: <Zap className="h-4 w-4" />,
      category: 'Experiments',
      command: 'npm run experiment launch [slug]',
      explanation: 'Start an experiment and make it available for participant evaluations.'
    },
    {
      id: 'launch-prolific',
      title: 'Launch with Prolific Study',
      description: 'Launch experiment and create Prolific study',
      icon: <Users className="h-4 w-4" />,
      category: 'Prolific',
      command: 'npm run experiment launch [slug] --prolific',
      explanation: 'Launch experiment and automatically create a Prolific study for human evaluation recruitment.'
    },
    {
      id: 'launch-prolific-custom',
      title: 'Launch with Custom Prolific Settings',
      description: 'Launch with custom Prolific study parameters',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'Prolific',
      command: `npm run experiment launch [slug] --prolific \\
  --prolific-title "Custom Study Title" \\
  --prolific-description "Custom description" \\
  --prolific-reward 10.00 \\
  --prolific-participants 100`,
      explanation: 'Launch experiment with customized Prolific study settings including title, description, reward amount, and participant count.'
    },
    {
      id: 'studio',
      title: 'Database Studio',
      description: 'Open database admin interface',
      icon: <ExternalLink className="h-4 w-4" />,
      category: 'Development',
      command: 'npm run db:studio',
      explanation: 'Launch Prisma Studio for direct database inspection and management.'
    }
  ]

  const categories = ['Generation', 'Management', 'Experiments', 'Prolific', 'Development']

  const workflowExample = `#!/bin/bash
# Generate content
python scripts/cli.py generate-content --models diamond-1b genie-2b --scenarios simple_task complex_task

# Upload to library  
npm run upload-content --dir ./generated-content

# Create experiment
npm run experiment create --name "Diamond vs Genie World Models" --auto-assign-content

# Launch experiment with Prolific study
npm run experiment launch diamond-vs-genie-world-models --prolific \\
  --prolific-title "Diamond vs Genie World Models Evaluation" \\
  --prolific-reward 8.00 --prolific-participants 50`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Terminal className="h-5 w-5" />
          CLI Tools & Commands
        </CardTitle>
        <CardDescription className="text-slate-300">
          Command-line tools for power users and automation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Commands by Category */}
        {categories.map((category) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-200">{category}</h3>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {commands.filter(cmd => cmd.category === category).length} commands
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {commands
                .filter(cmd => cmd.category === category)
                .map((cmd) => (
                  <div key={cmd.id} className="border border-slate-600/50 bg-slate-800/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{cmd.icon}</span>
                        <h4 className="font-medium text-slate-200">{cmd.title}</h4>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(cmd.command, cmd.id)}
                        className="flex-shrink-0 hover:bg-slate-700"
                      >
                        {copiedCommand === cmd.id ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-slate-300">{cmd.description}</p>
                    
                    <div className="relative">
                      <pre className="bg-slate-700/50 border border-slate-600/50 p-3 rounded text-xs overflow-x-auto font-mono text-slate-200">
                        <code>{cmd.command}</code>
                      </pre>
                    </div>
                    
                    <p className="text-xs text-slate-400">{cmd.explanation}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Automated Workflow */}
        <div className="border-t border-slate-600/50 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-slate-200">Automated Workflow Example</h3>
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
              End-to-End
            </Badge>
          </div>
          
          <p className="text-sm text-slate-300 mb-4">
            Complete workflow from content generation to experiment launch:
          </p>
          
          <div className="relative">
            <pre className="bg-slate-800/50 border border-slate-600/50 text-slate-200 p-4 rounded-lg text-sm overflow-x-auto font-mono">
              <code>{workflowExample}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              onClick={() => copyToClipboard(workflowExample, 'full-workflow')}
            >
              {copiedCommand === 'full-workflow' ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <h4 className="text-sm font-medium text-cyan-300 mb-2">Workflow Steps:</h4>
            <ol className="text-sm text-cyan-200 space-y-1">
              <li>1. Generate evaluation content for multiple models and scenarios</li>
              <li>2. Upload the generated content to your library</li>
              <li>3. Create a new experiment with auto-assigned content</li>
              <li>4. Launch the experiment with automated Prolific study creation</li>
            </ol>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="border-t border-slate-600/50 pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200">
            <Terminal className="h-5 w-5" />
            Quick Reference
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-200">Common Flags</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <code className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-200">--help</code>
                  <span className="text-slate-400">Show command help</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-200">--verbose</code>
                  <span className="text-slate-400">Detailed output</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-200">--dry-run</code>
                  <span className="text-slate-400">Preview changes</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-200">Environment</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <code className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-200">NODE_ENV</code>
                  <span className="text-slate-400">Runtime environment</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-200">DEBUG</code>
                  <span className="text-slate-400">Debug mode</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-200">DATABASE_URL</code>
                  <span className="text-slate-400">Database connection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}