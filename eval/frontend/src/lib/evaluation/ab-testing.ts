import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface VideoComparison {
  comparison_id: string
  scenario_id: string
  model_a_name: string
  model_b_name: string
  model_a_video_path: string
  model_b_video_path: string
  action_sequence: any[]
  scenario_metadata: any
  randomized_labels: { A: string; B: string }
  created_at: string
  
  toJSON(): any
}

export interface EvaluationResult {
  result_id: string
  comparison_id: string
  evaluator_id: string
  dimension_scores: Record<string, string>
  detailed_ratings: Record<string, any>
  completion_time_seconds: number
  submitted_at: string
}

export class ABTestingFramework {
  private outputDir: string
  private videosDir: string
  private comparisonsDir: string
  private resultsDir: string

  constructor(outputDir: string = './data/evaluations') {
    this.outputDir = outputDir
    this.videosDir = path.join(outputDir, 'videos')
    this.comparisonsDir = path.join(outputDir, 'comparisons')
    this.resultsDir = path.join(outputDir, 'results')
    
    // Ensure directories exist
    this.ensureDirectories()
  }

  private async ensureDirectories() {
    const dirs = [this.outputDir, this.videosDir, this.comparisonsDir, this.resultsDir]
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  async getAllComparisons(): Promise<VideoComparison[]> {
    try {
      const files = await fs.readdir(this.comparisonsDir)
      const comparisons: VideoComparison[] = []
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const comparisonId = file.replace('.json', '')
          const comparison = await this.getComparison(comparisonId)
          if (comparison) {
            comparisons.push(comparison)
          }
        }
      }
      
      return comparisons
    } catch (error) {
      console.error('Error reading comparisons:', error)
      return []
    }
  }

  async getComparison(comparisonId: string): Promise<VideoComparison | null> {
    try {
      const filePath = path.join(this.comparisonsDir, `${comparisonId}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      
      return {
        ...parsed,
        toJSON() {
          return { ...this }
        }
      }
    } catch (error) {
      return null
    }
  }

  async getResultsForComparison(comparisonId: string): Promise<EvaluationResult[]> {
    try {
      const files = await fs.readdir(this.resultsDir)
      const results: EvaluationResult[] = []
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.resultsDir, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const result = JSON.parse(data)
          
          if (result.comparison_id === comparisonId) {
            results.push(result)
          }
        }
      }
      
      return results
    } catch (error) {
      console.error('Error reading results:', error)
      return []
    }
  }

  async recordEvaluationResult(data: {
    comparison_id: string
    evaluator_id: string
    dimension_scores: Record<string, string>
    detailed_ratings: Record<string, any>
    completion_time_seconds: number
  }): Promise<EvaluationResult> {
    const result: EvaluationResult = {
      result_id: uuidv4(),
      comparison_id: data.comparison_id,
      evaluator_id: data.evaluator_id,
      dimension_scores: data.dimension_scores,
      detailed_ratings: data.detailed_ratings,
      completion_time_seconds: data.completion_time_seconds,
      submitted_at: new Date().toISOString()
    }
    
    const filePath = path.join(this.resultsDir, `${result.result_id}.json`)
    await fs.writeFile(filePath, JSON.stringify(result, null, 2))
    
    return result
  }

  async createComparison(data: {
    scenario_id: string
    model_a_name: string
    model_b_name: string
    model_a_video_path: string
    model_b_video_path: string
    action_sequence: any[]
    scenario_metadata: any
  }): Promise<VideoComparison> {
    const comparisonId = uuidv4()
    
    // Randomize labels
    const randomize = Math.random() < 0.5
    const randomizedLabels = randomize
      ? { A: data.model_b_name, B: data.model_a_name }
      : { A: data.model_a_name, B: data.model_b_name }
    
    const comparison: VideoComparison = {
      comparison_id: comparisonId,
      scenario_id: data.scenario_id,
      model_a_name: data.model_a_name,
      model_b_name: data.model_b_name,
      model_a_video_path: randomize ? data.model_b_video_path : data.model_a_video_path,
      model_b_video_path: randomize ? data.model_a_video_path : data.model_b_video_path,
      action_sequence: data.action_sequence,
      scenario_metadata: data.scenario_metadata,
      randomized_labels: randomizedLabels,
      created_at: new Date().toISOString(),
      toJSON() {
        return { ...this }
      }
    }
    
    const filePath = path.join(this.comparisonsDir, `${comparisonId}.json`)
    await fs.writeFile(filePath, JSON.stringify(comparison, null, 2))
    
    return comparison
  }
}