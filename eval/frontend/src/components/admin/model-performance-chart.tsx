'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  BarChart3,
  Filter
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
  selectedGroup?: string | null
  onGroupChange?: (group: string | null) => void
  experiments?: any[]
}

export function ModelPerformanceChart({ performance, loading, selectedGroup, onGroupChange, experiments = [] }: ModelPerformanceChartProps) {
  const [localSelectedGroup, setLocalSelectedGroup] = useState<string | null>(selectedGroup || null)
  
  const handleGroupChange = (group: string | null) => {
    setLocalSelectedGroup(group)
    onGroupChange?.(group)
  }
  
  // Get unique groups from experiments
  const uniqueGroups = Array.from(new Set(experiments.map(exp => exp.group).filter(Boolean)))
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted/50 rounded animate-pulse"></div>
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
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No performance data yet</h3>
            <p className="text-muted-foreground">
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
    'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-4))', 
    'hsl(var(--chart-5))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))', 'hsl(var(--chart-2))'
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
      {/* Group Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter by Group:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {localSelectedGroup || 'All Groups'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleGroupChange(null)}>
                All Groups
              </DropdownMenuItem>
              {uniqueGroups.map((group) => (
                <DropdownMenuItem key={group} onClick={() => handleGroupChange(group)}>
                  {group}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {localSelectedGroup && (
          <Badge variant="secondary" className="text-xs">
            Showing performance for &quot;{localSelectedGroup}&quot; group
          </Badge>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-accent/10 to-accent/20 border-accent/20 glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Models Evaluated</p>
                <p className="text-2xl font-bold text-foreground">{models.length}</p>
              </div>
              <Award className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-primary/20 glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Total Evaluations</p>
                <p className="text-2xl font-bold text-foreground">{totalEvaluations}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/20 border-secondary/20 glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Top Performer</p>
                <p className="text-lg font-bold text-foreground truncate" title={bestPerformingModel?.model}>
                  {bestPerformingModel?.model || 'TBD'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-secondary" />
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
                <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => value.replace(/_/g, ' ')}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value}%`}
                    stroke="hsl(var(--border))"
                  />
                  {models.map((model, index) => (
                    <Radar
                      key={model}
                      name={model}
                      dataKey={model}
                      stroke={modelColors[index % modelColors.length]}
                      fill={modelColors[index % modelColors.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Win Rate']}
                    labelFormatter={(label) => `Dimension: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: '500'
                    }}
                    animationDuration={0}
                    isAnimationActive={false}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="model_dimension" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
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
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: '500'
                    }}
                    animationDuration={0}
                    isAnimationActive={false}
                  />
                  <Bar 
                    dataKey="win_rate" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
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