'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  CartesianGrid
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
  scenario?: string
  win_rate: number
  num_evaluations?: number // Legacy field name
  num_twoVideoComparisonSubmissions?: number // New field name for comparison tasks
  num_singleVideoEvaluationSubmissions?: number // New field name for single video tasks
  experimentId: string
  evaluationType: 'comparison' | 'single_video'
  quality_score?: number // For single video evaluations (1-5 scale)
  detailed_scores?: {
    A_much_better: number
    A_slightly_better: number
    Equal: number
    B_slightly_better: number
    B_much_better: number
  }
  score_distribution?: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

interface ModelPerformanceChartProps {
  performance: ModelPerformance[]
  loading?: boolean
}

export function ModelPerformanceChart({ performance, loading }: ModelPerformanceChartProps) {
  // Use performance data directly since parent component already handles experiment filtering
  const filteredPerformance = performance
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

  // Helper function to get display value based on evaluation type
  const getDisplayValue = (item: ModelPerformance): number => {
    if (item.evaluationType === 'single_video') {
      // For single video, use quality_score converted to 0-100 scale
      return item.quality_score ? (item.quality_score / 5) * 100 : item.win_rate * 100
    } else {
      // For comparison, use win_rate
      return item.win_rate * 100
    }
  }

  // Determine if we have mixed evaluation types
  const evaluationTypes = Array.from(new Set(filteredPerformance.map(p => p.evaluationType)))

  // Process data for different chart types using filtered performance
  const modelData = filteredPerformance.reduce((acc, item) => {
    const model = acc.find(m => m.model === item.model)
    const displayValue = getDisplayValue(item)
    const evaluationCount = item.num_twoVideoComparisonSubmissions || item.num_singleVideoEvaluationSubmissions || item.num_evaluations || 0
    
    if (model) {
      model[item.dimension] = displayValue
      model.total_evaluations += evaluationCount
    } else {
      acc.push({
        model: item.model,
        [item.dimension]: displayValue,
        total_evaluations: evaluationCount,
        evaluationType: item.evaluationType
      })
    }
    return acc
  }, [] as any[])

  // Get all available dimensions from the data
  const availableDimensions = Array.from(new Set(filteredPerformance.map(p => p.dimension)))
  
  const radarData = availableDimensions
    .map(dimension => {
      const dimensionData: any = { dimension }
      filteredPerformance.filter(p => p.dimension === dimension).forEach(p => {
        dimensionData[p.model] = getDisplayValue(p)
      })
      return dimensionData
    })

  const barChartData = filteredPerformance.map(item => ({
    model_dimension: `${item.model} - ${item.dimension}`,
    model: item.model,
    dimension: item.dimension,
    win_rate: getDisplayValue(item),
    quality_score: item.quality_score,
    evaluations: item.num_twoVideoComparisonSubmissions || item.num_singleVideoEvaluationSubmissions || item.num_evaluations || 0,
    evaluationType: item.evaluationType
  }))

  // Get unique models for styling
  const models = Array.from(new Set(filteredPerformance.map(p => p.model)))
  
  const modelColors = [
    'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-4))', 
    'hsl(var(--chart-5))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))', 'hsl(var(--chart-2))'
  ]

  // Calculate overall stats
  const totalEvaluations = filteredPerformance.reduce((sum, p) => {
    // Handle different field names based on evaluation type
    const count = p.num_twoVideoComparisonSubmissions || p.num_singleVideoEvaluationSubmissions || p.num_evaluations || 0
    return sum + count
  }, 0)
  const bestPerformingModel = modelData.length > 0 ? modelData.reduce((best, current) => {
    const currentKeys = Object.keys(current).filter(key => key !== 'model' && key !== 'total_evaluations')
    const bestKeys = Object.keys(best).filter(key => key !== 'model' && key !== 'total_evaluations')
    
    if (currentKeys.length === 0) return best
    if (bestKeys.length === 0) return current
    
    const currentAvg = currentKeys.reduce((sum, key) => sum + (current[key] || 0), 0) / currentKeys.length
    const bestAvg = bestKeys.reduce((sum, key) => sum + (best[key] || 0), 0) / bestKeys.length
    
    return currentAvg > bestAvg ? current : best
  }, modelData[0]) : null

  return (
    <div className="space-y-6">
      
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
                <p className="text-2xl font-bold text-foreground">{totalEvaluations || 0}</p>
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
              {evaluationTypes.includes('single_video') 
                ? evaluationTypes.includes('comparison')
                  ? 'Multi-dimensional performance (mixed evaluation types)'
                  : 'Multi-dimensional quality scores (0-100 scale)'
                : 'Multi-dimensional win rates (comparison)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Color Legend */}
            {models.length > 0 && (
              <div className="flex justify-center gap-4 mb-4">
                {models.map((model, index) => (
                  <div key={model} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: modelColors[index % modelColors.length] }}
                    ></div>
                    <span className="text-sm font-medium">{model}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="h-[300px] relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <RadarChart 
                  data={radarData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
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
              {evaluationTypes.includes('single_video') 
                ? evaluationTypes.includes('comparison')
                  ? 'Performance scores by model and dimension (mixed types)'
                  : 'Quality scores by model and dimension (0-100 scale)'
                : 'Win rates by model and dimension'
              }
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
                    formatter={(value: any, _name: any, props: any) => {
                      const evaluationType = props.payload.evaluationType
                      const label = evaluationType === 'single_video' ? 'Quality Score' : 'Win Rate'
                      const extraInfo = evaluationType === 'single_video' && props.payload.quality_score 
                        ? `(${props.payload.quality_score.toFixed(1)}/5 avg, ${props.payload.evaluations} evaluations)`
                        : `(${props.payload.evaluations} evaluations)`
                      
                      return [
                        `${Number(value).toFixed(1)}%`,
                        label,
                        extraInfo
                      ]
                    }}
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

      {/* Performance Table with Detailed Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Summary</CardTitle>
          <CardDescription>
            {evaluationTypes.includes('single_video') 
              ? evaluationTypes.includes('comparison')
                ? 'Detailed evaluation scores (mixed evaluation types)'
                : 'Quality score distributions and averages'
              : 'Detailed comparison scores with tug-of-war visualization'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredPerformance.length > 0 ? (
              (() => {
                // Group by dimension for display
                const dimensionGroups = filteredPerformance.reduce((acc, item) => {
                  if (!acc[item.dimension]) {
                    acc[item.dimension] = []
                  }
                  acc[item.dimension].push(item)
                  return acc
                }, {} as Record<string, ModelPerformance[]>)

                return Object.entries(dimensionGroups).map(([dimension, items]) => {
                  // Check if this dimension has comparison data
                  const comparisonItems = items.filter(item => item.evaluationType === 'comparison')
                  const singleVideoItems = items.filter(item => item.evaluationType === 'single_video')
                  
                  if (comparisonItems.length >= 2) {
                    // Render comparison view (tug-of-war) - take first two models
                    const modelA = comparisonItems[0]
                    const modelB = comparisonItems[1]
                    
                    if (!modelA || !modelB || !modelA.detailed_scores || !modelB.detailed_scores) return null

                    // Calculate the balance score (-2 to +2, where -2 = A much better, +2 = B much better)
                    const scores = modelA.detailed_scores
                    const totalVotes = scores.A_much_better + scores.A_slightly_better + scores.Equal + scores.B_slightly_better + scores.B_much_better
                  
                  const weightedScore = (
                    scores.A_much_better * (-2) +
                    scores.A_slightly_better * (-1) +
                    scores.Equal * (0) +
                    scores.B_slightly_better * (1) +
                    scores.B_much_better * (2)
                  ) / totalVotes

                  // Convert to 0-100 scale for positioning (0 = A wins, 50 = tie, 100 = B wins)
                  const balancePosition = ((weightedScore + 2) / 4) * 100

                  return (
                    <div key={dimension} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg capitalize">
                          {dimension.replace(/_/g, ' ')}
                        </h3>
                        <Badge variant="secondary">
                          {totalVotes} evaluations
                        </Badge>
                      </div>

                      {/* Model names header */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {modelA.model}
                        </span>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          {modelB.model}
                        </span>
                      </div>

                      {/* Tug-of-war visualization */}
                      <div className="relative mb-4">
                        {/* Background line */}
                        <div className="h-2 bg-gradient-to-r from-green-200 via-gray-200 to-red-200 dark:from-green-900/50 dark:via-gray-700 dark:to-red-900/50 rounded-full"></div>
                        
                        {/* Center line */}
                        <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-gray-400 dark:bg-gray-500"></div>
                        
                        {/* Balance indicator dot */}
                        <div 
                          className="absolute top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 -mt-1 transform -translate-x-1/2 shadow-lg"
                          style={{ 
                            left: `${Math.max(8, Math.min(92, balancePosition))}%`,
                            backgroundColor: balancePosition < 40 ? '#10b981' : balancePosition > 60 ? '#ef4444' : '#6b7280'
                          }}
                        ></div>
                      </div>

                      {/* Score breakdown */}
                      <div className="grid grid-cols-5 gap-2 text-xs mb-4">
                        <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                          <div className="font-semibold text-green-700 dark:text-green-300">A Much Better</div>
                          <div className="text-green-800 dark:text-green-200">{scores.A_much_better}</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <div className="font-semibold text-green-600 dark:text-green-400">A Slightly Better</div>
                          <div className="text-green-700 dark:text-green-300">{scores.A_slightly_better}</div>
                        </div>
                        <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                          <div className="font-semibold text-gray-600 dark:text-gray-400">Equal</div>
                          <div className="text-gray-700 dark:text-gray-300">{scores.Equal}</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                          <div className="font-semibold text-red-600 dark:text-red-400">B Slightly Better</div>
                          <div className="text-red-700 dark:text-red-300">{scores.B_slightly_better}</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                          <div className="font-semibold text-red-700 dark:text-red-300">B Much Better</div>
                          <div className="text-red-800 dark:text-red-200">{scores.B_much_better}</div>
                        </div>
                      </div>

                      {/* Summary text */}
                      <div className="text-center text-sm text-muted-foreground">
                        {Math.abs(weightedScore) < 0.2 ? (
                          <span>Models are roughly equal</span>
                        ) : weightedScore < 0 ? (
                          <span><strong>{modelA.model}</strong> is preferred by {Math.abs(weightedScore).toFixed(1)} points</span>
                        ) : (
                          <span><strong>{modelB.model}</strong> is preferred by {Math.abs(weightedScore).toFixed(1)} points</span>
                        )}
                      </div>
                    </div>
                    )
                  } else if (singleVideoItems.length > 0) {
                    // Render single video view (quality scores)
                    return (
                      <div key={dimension} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg capitalize">
                            {dimension.replace(/_/g, ' ')}
                          </h3>
                          <Badge variant="secondary">
                            Single Video Evaluation
                          </Badge>
                        </div>

                        {/* Model scores */}
                        <div className="space-y-4">
                          {singleVideoItems.map((item) => (
                            <div key={item.model} className="border rounded p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{item.model}</span>
                                <span className="text-sm text-muted-foreground">
                                  {item.num_evaluations} evaluations
                                </span>
                              </div>
                              
                              {/* Quality score display */}
                              <div className="flex items-center gap-4 mb-3">
                                <div className="text-2xl font-bold">
                                  {item.quality_score ? item.quality_score.toFixed(1) : 'N/A'}
                                  <span className="text-sm text-muted-foreground font-normal">/5</span>
                                </div>
                                <div className="text-lg text-muted-foreground">
                                  ({(getDisplayValue(item)).toFixed(1)}% quality)
                                </div>
                              </div>

                              {/* Score distribution */}
                              {item.score_distribution && (
                                <div className="grid grid-cols-5 gap-1 mb-2">
                                  {[1, 2, 3, 4, 5].map(score => (
                                    <div key={score} className={`text-center p-2 rounded text-xs ${
                                      score <= 2 ? 'bg-red-100 dark:bg-red-900/30' :
                                      score === 3 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                      'bg-green-100 dark:bg-green-900/30'
                                    }`}>
                                      <div className="font-semibold">{score}⭐</div>
                                      <div>{item.score_distribution?.[score as keyof typeof item.score_distribution] || 0}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  
                  return null
                }).filter(Boolean)
              })()
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">No detailed performance data available yet</div>
                <div className="text-sm text-muted-foreground mt-1">Complete evaluations with dimensionScores to see detailed breakdown</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}