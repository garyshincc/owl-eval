import { ABTestingFramework, VideoComparison, EvaluationResult } from '../evaluation/ab-testing'

export interface ModelPerformance {
  model: string
  dimension: string
  win_rate: number
  num_evaluations: number
  std_error: number
}

export class EvaluationAnalyzer {
  constructor(private framework: ABTestingFramework) {}

  async calculateModelPerformance(): Promise<ModelPerformance[]> {
    const comparisons = await this.framework.getAllComparisons()
    const allResults: EvaluationResult[] = []
    
    // Collect all results
    for (const comparison of comparisons) {
      const results = await this.framework.getResultsForComparison(comparison.comparison_id)
      allResults.push(...results)
    }
    
    // Calculate scores
    const modelScores: Record<string, Record<string, number[]>> = {}
    
    for (const result of allResults) {
      const comparison = comparisons.find(c => c.comparison_id === result.comparison_id)
      if (!comparison) continue
      
      const modelA = comparison.randomized_labels['A']
      const modelB = comparison.randomized_labels['B']
      
      // Initialize if needed
      if (!modelScores[modelA]) modelScores[modelA] = {}
      if (!modelScores[modelB]) modelScores[modelB] = {}
      
      for (const [dimension, choice] of Object.entries(result.dimension_scores)) {
        if (!modelScores[modelA][dimension]) modelScores[modelA][dimension] = []
        if (!modelScores[modelB][dimension]) modelScores[modelB][dimension] = []
        
        if (choice === 'A') {
          modelScores[modelA][dimension].push(1)
          modelScores[modelB][dimension].push(0)
        } else if (choice === 'B') {
          modelScores[modelA][dimension].push(0)
          modelScores[modelB][dimension].push(1)
        } else {
          modelScores[modelA][dimension].push(0.5)
          modelScores[modelB][dimension].push(0.5)
        }
      }
    }
    
    // Calculate performance metrics
    const performanceData: ModelPerformance[] = []
    
    for (const [model, dimensions] of Object.entries(modelScores)) {
      for (const [dimension, scores] of Object.entries(dimensions)) {
        if (scores.length > 0) {
          const winRate = scores.reduce((a, b) => a + b, 0) / scores.length
          const variance = scores.reduce((sum, score) => sum + Math.pow(score - winRate, 2), 0) / scores.length
          const stdError = Math.sqrt(variance / scores.length)
          
          performanceData.push({
            model,
            dimension,
            win_rate: winRate,
            num_evaluations: scores.length,
            std_error: stdError
          })
        }
      }
    }
    
    return performanceData
  }

  async getEvaluationQuality(): Promise<any> {
    const comparisons = await this.framework.getAllComparisons()
    const allResults: EvaluationResult[] = []
    
    for (const comparison of comparisons) {
      const results = await this.framework.getResultsForComparison(comparison.comparison_id)
      allResults.push(...results)
    }
    
    const evaluatorStats: Record<string, any> = {}
    
    for (const result of allResults) {
      if (!evaluatorStats[result.evaluator_id]) {
        evaluatorStats[result.evaluator_id] = {
          num_evaluations: 0,
          total_time: 0,
          choices: []
        }
      }
      
      evaluatorStats[result.evaluator_id].num_evaluations++
      evaluatorStats[result.evaluator_id].total_time += result.completion_time_seconds
      
      for (const choice of Object.values(result.dimension_scores)) {
        evaluatorStats[result.evaluator_id].choices.push(choice)
      }
    }
    
    return {
      total_evaluations: allResults.length,
      unique_evaluators: Object.keys(evaluatorStats).length,
      avg_time_per_evaluation: allResults.reduce((sum, r) => sum + r.completion_time_seconds, 0) / allResults.length,
      evaluator_details: Object.entries(evaluatorStats).map(([id, stats]) => ({
        evaluator_id: id,
        num_evaluations: stats.num_evaluations,
        avg_time: stats.total_time / stats.num_evaluations,
        unique_responses: new Set(stats.choices).size
      }))
    }
  }
}