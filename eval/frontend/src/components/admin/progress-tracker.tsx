'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Target,
  TrendingUp,
  Activity
} from 'lucide-react'

interface EvaluationStats {
  total_tasks: number
  total_submissions: number
  total_comparison_tasks: number
  total_single_video_tasks: number
  total_comparison_submissions: number
  total_single_video_submissions: number
  evaluations_by_scenario: Record<string, number>
  target_evaluations_per_comparison: number
}

interface ComparisonProgress {
  id: string
  scenarioId: string
  modelA: string
  modelB: string
  evaluationCount: number
  targetEvaluations: number
  progressPercentage: number
}

interface Experiment {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  archived: boolean
  archivedAt: string | null
  group: string | null
  prolificStudyId: string | null
  config: any
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

interface ProgressTrackerProps {
  stats: EvaluationStats | null
  comparisonProgress: ComparisonProgress[]
  experiments?: Experiment[]
  loading?: boolean
}

export function ProgressTracker({ stats, comparisonProgress, experiments = [], loading }: ProgressTrackerProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getProgressStatus = (percentage: number) => {
    if (percentage >= 100) return { status: 'complete', color: 'text-secondary', bgColor: 'bg-secondary/10 border-secondary/20' }
    if (percentage >= 75) return { status: 'on-track', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' }
    if (percentage >= 50) return { status: 'in-progress', color: 'text-accent', bgColor: 'bg-accent/10 border-accent/20' }
    return { status: 'behind', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' }
  }

  const formatScenarioName = (scenarioId: string) => {
    return scenarioId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Count experiments by status instead of comparison progress
  const completedExperiments = experiments.filter(exp => exp.status === 'completed').length
  const inProgressExperiments = experiments.filter(exp => exp.status === 'active').length  
  const notStartedExperiments = experiments.filter(exp => exp.status === 'draft').length

  return (
    <div className="space-y-6">
      {/* Scenario Overview */}
      {stats && Object.keys(stats.evaluations_by_scenario).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Scenario Overview
            </CardTitle>
            <CardDescription>
              Evaluation distribution across scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.evaluations_by_scenario)
                .sort(([,a], [,b]) => b - a)
                .map(([scenario, count]) => {
                  const percentage = stats.total_submissions ? (count / stats.total_submissions) * 100 : 0
                  return (
                    <div key={scenario} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm">{formatScenarioName(scenario)}</h4>
                        <Badge variant="outline" className="text-xs">
                          {count} evals
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Progress value={percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% of total</span>
                          <span>{count} evaluations</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experiment Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/20 border-secondary/20 glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedExperiments}</p>
                <p className="text-xs text-green-600">experiments done</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-primary/20 glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{inProgressExperiments}</p>
                <p className="text-xs text-primary">actively running</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-muted/30 to-muted/50 border-border glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Not Started</p>
                <p className="text-2xl font-bold text-foreground">{notStartedExperiments}</p>
                <p className="text-xs text-muted-foreground">draft experiments</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Comparison Progress
          </CardTitle>
          <CardDescription>
            Evaluation completion status for each comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comparisonProgress.length > 0 ? (
            <div className="space-y-4">
              {comparisonProgress
                .sort((a, b) => b.progressPercentage - a.progressPercentage)
                .map((comparison) => {
                  const status = getProgressStatus(comparison.progressPercentage)
                  return (
                    <div 
                      key={comparison.id} 
                      className={`border rounded-lg p-4 ${status.bgColor}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {formatScenarioName(comparison.scenarioId)}
                            </h4>
                            <Badge 
                              variant={
                                comparison.progressPercentage >= 100 ? 'default' :
                                comparison.progressPercentage >= 50 ? 'secondary' : 
                                'outline'
                              }
                              className="text-xs"
                            >
                              {comparison.evaluationCount}/{comparison.targetEvaluations}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {comparison.modelA} vs {comparison.modelB}
                          </p>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span className={`font-medium ${status.color}`}>
                                {comparison.progressPercentage.toFixed(1)}%
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(comparison.progressPercentage, 100)} 
                              className="h-2"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {comparison.progressPercentage >= 100 ? (
                            <div className="flex items-center gap-1 text-secondary">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Complete</span>
                            </div>
                          ) : comparison.progressPercentage === 0 ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-primary">
                              <Activity className="h-4 w-4" />
                              <span className="text-xs">Active</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {comparison.progressPercentage < 100 && comparison.progressPercentage > 0 && (
                        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Remaining evaluations:</span>
                            <span className="font-medium">
                              {comparison.targetEvaluations - comparison.evaluationCount}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No comparisons found</h3>
              <p className="text-muted-foreground">
                Create comparisons to track evaluation progress
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Insights */}
      {comparisonProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground">Top Performing Scenarios</h4>
                {comparisonProgress
                  .filter(comp => comp.progressPercentage > 0)
                  .sort((a, b) => b.progressPercentage - a.progressPercentage)
                  .slice(0, 3)
                  .map((comp, index) => (
                    <div key={comp.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="truncate">{formatScenarioName(comp.scenarioId)}</span>
                      </div>
                      <span className="font-medium text-secondary">
                        {comp.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground">Needs Attention</h4>
                {comparisonProgress
                  .filter(comp => comp.progressPercentage < 50)
                  .sort((a, b) => a.progressPercentage - b.progressPercentage)
                  .slice(0, 3)
                  .map((comp, index) => (
                    <div key={comp.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="truncate">{formatScenarioName(comp.scenarioId)}</span>
                      </div>
                      <span className="font-medium text-orange-600">
                        {comp.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                {comparisonProgress.filter(comp => comp.progressPercentage < 50).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">All comparisons are on track! 🎉</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}