interface EvaluationConfig {
  outputDir: string
  targetEvaluationsPerComparison: number
  scenarios: string[]
  dimensions: {
    name: string
    description: string
    weight: number
  }[]
  videoSettings: {
    fps: number
    duration: number
    resolution: [number, number]
  }
}

export function getConfig(): EvaluationConfig {
  return {
    outputDir: process.env.DATA_DIR || './data/evaluations',
    targetEvaluationsPerComparison: 5,
    scenarios: ['beach', 'desert', 'forest', 'hills', 'icy', 'mushroom', 'plains', 'river'],
    dimensions: [
      {
        name: 'overall_quality',
        description: 'Overall impression of generated videos',
        weight: 1.0
      },
      {
        name: 'controllability',
        description: 'Ability to accurately translate inputs',
        weight: 1.0
      },
      {
        name: 'visual_quality',
        description: 'Perceptual fidelity and aesthetics',
        weight: 1.0
      },
      {
        name: 'temporal_consistency',
        description: 'Motion stability across frames',
        weight: 1.0
      }
    ],
    videoSettings: {
      fps: 16,
      duration: 65,
      resolution: [1280, 720]
    }
  }
}