'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Loader2, LogOut, ExternalLink, Plus, Terminal, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EvaluationStats {
  total_comparisons: number
  total_evaluations: number
  evaluations_by_scenario: Record<string, number>
  target_evaluations_per_comparison: number
}

interface ModelPerformance {
  model: string
  dimension: string
  win_rate: number
  num_evaluations: number
}

interface Experiment {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  prolificStudyId: string | null
  config: any
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  _count: {
    comparisons: number
    participants: number
    evaluations: number
  }
}

export default function AdminPage() {
  const [stats, setStats] = useState<EvaluationStats | null>(null)
  const [performance, setPerformance] = useState<ModelPerformance[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewExperimentDialog, setShowNewExperimentDialog] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  
  // Check if Stack Auth is configured (client-side check)
  const isStackAuthConfigured = typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID && 
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, perfRes, expRes] = await Promise.all([
        fetch('/api/evaluation-stats'),
        fetch('/api/model-performance'),
        fetch('/api/experiments')
      ])
      const statsData = await statsRes.json()
      const perfData = await perfRes.json()
      const expData = await expRes.json()
      setStats(statsData)
      setPerformance(perfData || [])
      setExperiments(expData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, commandId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCommand(commandId)
      setTimeout(() => setCopiedCommand(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const scenarioData = stats ? Object.entries(stats.evaluations_by_scenario).map(([scenario, count]) => ({
    scenario,
    evaluations: count
  })) : []

  const modelData = performance.reduce((acc, item) => {
    const model = acc.find(m => m.model === item.model)
    if (model) {
      model[item.dimension] = item.win_rate * 100
    } else {
      acc.push({
        model: item.model,
        [item.dimension]: item.win_rate * 100
      })
    }
    return acc
  }, [] as any[])

  const radarData = ['overall_quality', 'controllability', 'visual_quality', 'temporal_consistency'].map(dimension => {
    const dimensionData: any = { dimension }
    performance.filter(p => p.dimension === dimension).forEach(p => {
      dimensionData[p.model] = p.win_rate * 100
    })
    return dimensionData
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Evaluation Progress Dashboard</h1>
        {isStackAuthConfigured && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/handler/sign-out'}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats?.total_comparisons || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats?.total_evaluations || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Target per Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats?.target_evaluations_per_comparison || 5}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="experiments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>
        
        <TabsContent value="experiments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Experiments</CardTitle>
                  <CardDescription>Manage and monitor all evaluation experiments</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => setShowNewExperimentDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Experiment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {experiments.map((exp) => (
                  <div key={exp.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{exp.name}</h3>
                          <Badge variant={
                            exp.status === 'active' ? 'default' : 
                            exp.status === 'completed' ? 'secondary' :
                            exp.status === 'draft' ? 'outline' : 'destructive'
                          }>
                            {exp.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{exp.description}</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>Slug: <code className="bg-gray-100 px-1 rounded">{exp.slug}</code></span>
                          <span>Comparisons: {exp._count.comparisons}</span>
                          <span>Participants: {exp._count.participants}</span>
                          <span>Evaluations: {exp._count.evaluations}</span>
                        </div>
                        {exp.prolificStudyId && (
                          <p className="text-sm text-blue-600 mt-1">
                            Prolific Study: {exp.prolificStudyId}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/evaluate/${exp.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {exp._count.comparisons > 0 && (
                      <div className="mt-3">
                        <Progress 
                          value={(exp._count.evaluations / (exp._count.comparisons * 5)) * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round((exp._count.evaluations / (exp._count.comparisons * 5)) * 100)}% complete
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {experiments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No experiments found.</p>
                    <p className="text-sm mt-2">Create your first experiment using the CLI or button above.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>Evaluations by Scenario</CardTitle>
              <CardDescription>Distribution of evaluations across different scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scenarioData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scenario" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="evaluations" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Comparison</CardTitle>
              <CardDescription>Win rates across evaluation dimensions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {modelData.map((model, index) => (
                      <Radar
                        key={model.model}
                        name={model.model}
                        dataKey={model.model}
                        stroke={index === 0 ? '#3b82f6' : '#ef4444'}
                        fill={index === 0 ? '#3b82f6' : '#ef4444'}
                        fillOpacity={0.6}
                      />
                    ))}
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Comparison Progress</CardTitle>
              <CardDescription>Evaluation completion status for each comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would be populated with actual comparison progress data */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Forest Navigation</span>
                    <Badge>3/5</Badge>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Desert Mining</span>
                    <Badge variant="success">5/5</Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ocean Exploration</span>
                    <Badge variant="secondary">1/5</Badge>
                  </div>
                  <Progress value={20} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showNewExperimentDialog} onOpenChange={setShowNewExperimentDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Experiment</DialogTitle>
            <DialogDescription>
              Follow these steps to create and launch a new experiment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Step 1: Generate Videos with Python Backend
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                First, use the Python backend to generate comparison videos:
              </p>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{`# From the matrix-game-eval directory
python scripts/cli.py generate-videos \\
  --models model1 model2 \\
  --scenarios forest desert ocean \\
  --output-dir data/experiments/my-experiment`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    'python scripts/cli.py generate-videos --models model1 model2 --scenarios forest desert ocean --output-dir data/experiments/my-experiment',
                    'generate-videos'
                  )}
                >
                  {copiedCommand === 'generate-videos' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Step 2: Create Experiment in Database
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Use the interactive CLI to create a new experiment:
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                    <code>{`# Interactive mode (recommended)
npm run experiment create`}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard('npm run experiment create', 'create-interactive')}
                  >
                    {copiedCommand === 'create-interactive' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                    <code>{`# Or with options
npm run experiment create --name "Winter 2025 Study" --slug "winter-2025"`}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(
                      'npm run experiment create --name "Winter 2025 Study" --slug "winter-2025"',
                      'create-options'
                    )}
                  >
                    {copiedCommand === 'create-options' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                The CLI will auto-generate a unique slug if not provided (e.g., cosmic-study-x8k2n9p1)
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 3: Launch Experiment</h3>
              <p className="text-sm text-gray-600 mb-3">
                Once ready, launch your experiment:
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                    <code>{`# Launch experiment
npm run experiment launch winter-2025-study`}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(
                      'npm run experiment launch winter-2025-study',
                      'launch-basic'
                    )}
                  >
                    {copiedCommand === 'launch-basic' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                    <code>{`# With Prolific study ID
npm run experiment launch winter-2025-study --prolific-id YOUR_PROLIFIC_STUDY_ID`}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(
                      'npm run experiment launch winter-2025-study --prolific-id YOUR_PROLIFIC_STUDY_ID',
                      'launch-prolific'
                    )}
                  >
                    {copiedCommand === 'launch-prolific' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Other Useful Commands</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">npm run experiment list</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('npm run experiment list', 'list')}
                  >
                    {copiedCommand === 'list' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">npm run experiment stats [slug]</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('npm run experiment stats', 'stats')}
                  >
                    {copiedCommand === 'stats' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">npm run db:studio</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('npm run db:studio', 'studio')}
                  >
                    {copiedCommand === 'studio' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}