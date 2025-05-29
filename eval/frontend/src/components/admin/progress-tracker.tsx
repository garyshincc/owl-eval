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
  total_comparisons: number
  total_evaluations: number
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

interface ProgressTrackerProps {
  stats: EvaluationStats | null
  comparisonProgress: ComparisonProgress[]
  loading?: boolean
}

export function ProgressTracker({ stats, comparisonProgress, loading }: ProgressTrackerProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getProgressStatus = (percentage: number) => {
    if (percentage >= 100) return { status: 'complete', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' }
    if (percentage >= 75) return { status: 'on-track', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' }
    if (percentage >= 50) return { status: 'in-progress', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' }
    return { status: 'behind', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' }
  }

  const formatScenarioName = (scenarioId: string) => {
    return scenarioId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const completedComparisons = comparisonProgress.filter(comp => comp.progressPercentage >= 100).length
  const inProgressComparisons = comparisonProgress.filter(comp => comp.progressPercentage > 0 && comp.progressPercentage < 100).length
  const notStartedComparisons = comparisonProgress.filter(comp => comp.progressPercentage === 0).length

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
                  const percentage = stats.total_evaluations ? (count / stats.total_evaluations) * 100 : 0
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
                        <div className="flex justify-between text-xs text-gray-500">
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

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-900">{completedComparisons}</p>
                <p className="text-xs text-green-600">comparisons done</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">In Progress</p>
                <p className="text-2xl font-bold text-blue-900">{inProgressComparisons}</p>
                <p className="text-xs text-blue-600">actively evaluating</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Not Started</p>
                <p className="text-2xl font-bold text-gray-900">{notStartedComparisons}</p>
                <p className="text-xs text-gray-600">awaiting evaluations</p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
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
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Complete</span>
                            </div>
                          ) : comparison.progressPercentage === 0 ? (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Activity className="h-4 w-4" />
                              <span className="text-xs">Active</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {comparison.progressPercentage < 100 && comparison.progressPercentage > 0 && (
                        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                          <div className="flex justify-between text-xs text-gray-600">
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
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No comparisons found</h3>
              <p className="text-gray-500">
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
                <h4 className="font-medium text-sm text-gray-700">Top Performing Scenarios</h4>
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
                      <span className="font-medium text-green-600">
                        {comp.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Needs Attention</h4>
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
                  <p className="text-sm text-gray-500 italic">All comparisons are on track! 🎉</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}