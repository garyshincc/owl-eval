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
  Database
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
      id: 'studio',
      title: 'Database Studio',
      description: 'Open database admin interface',
      icon: <ExternalLink className="h-4 w-4" />,
      category: 'Development',
      command: 'npm run db:studio',
      explanation: 'Launch Prisma Studio for direct database inspection and management.'
    }
  ]

  const categories = ['Generation', 'Management', 'Experiments', 'Development']

  const workflowExample = `#!/bin/bash
# Generate content
python scripts/cli.py generate-content --models diamond-1b genie-2b --scenarios simple_task complex_task

# Upload to library  
npm run upload-content --dir ./generated-content

# Create experiment
npm run experiment create --name "Diamond vs Genie World Models" --auto-assign-content

# Launch experiment
npm run experiment launch diamond-vs-genie-world-models`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          CLI Tools & Commands
        </CardTitle>
        <CardDescription>
          Command-line tools for power users and automation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Commands by Category */}
        {categories.map((category) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{category}</h3>
              <Badge variant="outline" className="text-xs">
                {commands.filter(cmd => cmd.category === category).length} commands
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {commands
                .filter(cmd => cmd.category === category)
                .map((cmd) => (
                  <div key={cmd.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {cmd.icon}
                        <h4 className="font-medium">{cmd.title}</h4>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(cmd.command, cmd.id)}
                        className="flex-shrink-0"
                      >
                        {copiedCommand === cmd.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-600">{cmd.description}</p>
                    
                    <div className="relative">
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
                        <code>{cmd.command}</code>
                      </pre>
                    </div>
                    
                    <p className="text-xs text-gray-500">{cmd.explanation}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Automated Workflow */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Automated Workflow Example</h3>
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              End-to-End
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Complete workflow from content generation to experiment launch:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto font-mono">
              <code>{workflowExample}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={() => copyToClipboard(workflowExample, 'full-workflow')}
            >
              {copiedCommand === 'full-workflow' ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Workflow Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Generate evaluation content for multiple models and scenarios</li>
              <li>2. Upload the generated content to your library</li>
              <li>3. Create a new experiment with auto-assigned content</li>
              <li>4. Launch the experiment for participant evaluations</li>
            </ol>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Quick Reference
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Common Flags</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">--help</code>
                  <span className="text-gray-600">Show command help</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">--verbose</code>
                  <span className="text-gray-600">Detailed output</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">--dry-run</code>
                  <span className="text-gray-600">Preview changes</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Environment</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">NODE_ENV</code>
                  <span className="text-gray-600">Runtime environment</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">DEBUG</code>
                  <span className="text-gray-600">Debug mode</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">DATABASE_URL</code>
                  <span className="text-gray-600">Database connection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}