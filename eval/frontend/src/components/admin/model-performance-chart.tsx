'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  Award, 
  Target,
  BarChart3
} from 'lucide-react'

interface ModelPerformance {
  model: string
  dimension: string
  win_rate: number
  num_evaluations: number
}

interface ModelPerformanceChartProps {
  performance: ModelPerformance[]
  loading?: boolean
}

export function ModelPerformanceChart({ performance, loading }: ModelPerformanceChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (performance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Model Performance
          </CardTitle>
          <CardDescription>Win rates across evaluation dimensions</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data yet</h3>
            <p className="text-gray-500">
              Performance metrics will appear here once evaluations are completed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Process data for different chart types
  const modelData = performance.reduce((acc, item) => {
    const model = acc.find(m => m.model === item.model)
    if (model) {
      model[item.dimension] = item.win_rate * 100
    } else {
      acc.push({
        model: item.model,
        [item.dimension]: item.win_rate * 100,
        total_evaluations: item.num_evaluations
      })
    }
    return acc
  }, [] as any[])

  const radarData = ['overall_quality', 'controllability', 'visual_quality', 'temporal_consistency']
    .filter(dimension => performance.some(p => p.dimension === dimension))
    .map(dimension => {
      const dimensionData: any = { dimension }
      performance.filter(p => p.dimension === dimension).forEach(p => {
        dimensionData[p.model] = p.win_rate * 100
      })
      return dimensionData
    })

  const barChartData = performance.map(item => ({
    model_dimension: `${item.model} - ${item.dimension}`,
    model: item.model,
    dimension: item.dimension,
    win_rate: item.win_rate * 100,
    evaluations: item.num_evaluations
  }))

  // Get unique models for styling
  const models = Array.from(new Set(performance.map(p => p.model)))
  const modelColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ]

  // Calculate overall stats
  const totalEvaluations = performance.reduce((sum, p) => sum + p.num_evaluations, 0)
  const bestPerformingModel = modelData.reduce((best, current) => {
    const currentAvg = Object.keys(current)
      .filter(key => key !== 'model' && key !== 'total_evaluations')
      .reduce((sum, key) => sum + (current[key] || 0), 0) / 
      Object.keys(current).filter(key => key !== 'model' && key !== 'total_evaluations').length
    
    const bestAvg = Object.keys(best)
      .filter(key => key !== 'model' && key !== 'total_evaluations')
      .reduce((sum, key) => sum + (best[key] || 0), 0) / 
      Object.keys(best).filter(key => key !== 'model' && key !== 'total_evaluations').length
    
    return currentAvg > bestAvg ? current : best
  }, modelData[0])

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Models Evaluated</p>
                <p className="text-2xl font-bold text-purple-900">{models.length}</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Evaluations</p>
                <p className="text-2xl font-bold text-blue-900">{totalEvaluations}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Top Performer</p>
                <p className="text-lg font-bold text-green-900 truncate" title={bestPerformingModel?.model}>
                  {bestPerformingModel?.model || 'TBD'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Radar</CardTitle>
            <CardDescription>
              Multi-dimensional performance comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ fontSize: 12 }}
                    className="text-gray-600"
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  {models.map((model, index) => (
                    <Radar
                      key={model}
                      name={model}
                      dataKey={model}
                      stroke={modelColors[index % modelColors.length]}
                      fill={modelColors[index % modelColors.length]}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Win Rate']}
                    labelFormatter={(label) => `Dimension: ${label}`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
            <CardDescription>
              Win rates by model and dimension
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="model_dimension" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${Number(value).toFixed(1)}%`,
                      'Win Rate',
                      `(${props.payload.evaluations} evaluations)`
                    ]}
                    labelFormatter={(label) => {
                      const parts = String(label).split(' - ')
                      return `${parts[0]} - ${parts[1]}`
                    }}
                  />
                  <Bar 
                    dataKey="win_rate" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Summary</CardTitle>
          <CardDescription>
            Detailed performance metrics for each model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modelData.map((model) => (
              <div key={model.model} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{model.model}</h3>
                  <Badge variant="secondary">
                    {model.total_evaluations || 0} evaluations
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(model)
                    .filter(([key]) => key !== 'model' && key !== 'total_evaluations')
                    .map(([dimension, winRate]) => (
                      <div key={dimension} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{dimension.replace('_', ' ')}</span>
                          <span className="font-medium">{Number(winRate).toFixed(1)}%</span>
                        </div>
                        <Progress value={Number(winRate)} className="h-2" />
                      </div>
                    ))}
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average Performance</span>
                    <span className="font-medium">
                      {(Object.entries(model)
                        .filter(([key]) => key !== 'model' && key !== 'total_evaluations')
                        .reduce((sum, [, value]) => sum + Number(value), 0) / 
                        Object.entries(model).filter(([key]) => key !== 'model' && key !== 'total_evaluations').length
                      ).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}