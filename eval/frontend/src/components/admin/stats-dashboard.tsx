'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  FileVideo, 
  BarChart3, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface EvaluationStats {
  total_comparisons: number
  total_evaluations: number
  evaluations_by_scenario: Record<string, number>
  target_evaluations_per_comparison: number
}

interface StatsDashboardProps {
  stats: EvaluationStats | null
  experiments: any[]
  loading?: boolean
}

export function StatsDashboard({ stats, experiments, loading }: StatsDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const activeExperiments = experiments.filter(exp => exp.status === 'active').length
  const completedExperiments = experiments.filter(exp => exp.status === 'completed').length
  const totalParticipants = experiments.reduce((sum, exp) => sum + exp._count.participants, 0)
  
  const completionRate = stats?.total_comparisons 
    ? Math.round((stats.total_evaluations / (stats.total_comparisons * stats.target_evaluations_per_comparison)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700">Total Experiments</CardTitle>
              <FileVideo className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-blue-900">{experiments.length}</p>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs bg-blue-200 text-blue-800">
                  {activeExperiments} active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-700">Total Evaluations</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-900">{stats?.total_evaluations || 0}</p>
              <Badge variant="secondary" className="text-xs bg-green-200 text-green-800">
                {completionRate}% complete
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-700">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-purple-900">{totalParticipants}</p>
              <Badge variant="secondary" className="text-xs bg-purple-200 text-purple-800">
                Active users
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-700">Comparisons</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-orange-900">{stats?.total_comparisons || 0}</p>
              <Badge variant="secondary" className="text-xs bg-orange-200 text-orange-800">
                {stats?.target_evaluations_per_comparison || 5} target each
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Progress
            </CardTitle>
            <CardDescription>
              Evaluation completion across all experiments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Evaluations Completed</span>
                <span className="font-medium">{stats?.total_evaluations || 0} / {(stats?.total_comparisons || 0) * (stats?.target_evaluations_per_comparison || 5)}</span>
              </div>
              <Progress value={completionRate} className="h-3" />
              <p className="text-xs text-gray-500">
                {completionRate >= 100 
                  ? "🎉 All evaluations complete!" 
                  : `${100 - completionRate}% remaining to complete all experiments`
                }
              </p>
            </div>
            
            {stats && Object.keys(stats.evaluations_by_scenario).length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Evaluations by Scenario</h4>
                <div className="space-y-2">
                  {Object.entries(stats.evaluations_by_scenario)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([scenario, count]) => (
                      <div key={scenario} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{scenario}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(count / (stats.total_evaluations || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <span className="text-lg font-bold text-green-700">{completedExperiments}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <span className="text-lg font-bold text-blue-700">{activeExperiments}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Draft</span>
              </div>
              <span className="text-lg font-bold text-orange-700">
                {experiments.filter(exp => exp.status === 'draft').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}