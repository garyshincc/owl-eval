// Screening Configuration
// This file defines the screening tests for different evaluation modes
// Edit this file to update screening videos, correct answers, and instructions

export interface ScreeningVideoTask {
  id: string
  videoPath: string // Path in Tigris storage
  title: string
  instructions: string
  explanation: string // What participants should look for
  expectedRating: number[] // Valid ratings to pass (1-5 scale)
  failureMessage: string // Message shown on failure
}

export interface ScreeningComparisonTask {
  id: string
  videoAPath: string // Path in Tigris storage
  videoBPath: string // Path in Tigris storage
  title: string
  instructions: string
  explanation: string // What participants should look for
  expectedWinner: 'A' | 'B' | 'either' // Which video should be chosen to pass
  failureMessage: string // Message shown on failure
}

export interface ScreeningConfig {
  version: string // Track which version participant took
  passThreshold: number // How many tasks must be passed to qualify
  maxAttempts: number // Maximum screening attempts before permanent rejection
  
  singleVideo: {
    instructions: string
    tasks: ScreeningVideoTask[]
  }
  
  comparison: {
    instructions: string
    tasks: ScreeningComparisonTask[]
  }
}

// MAIN SCREENING CONFIGURATION
// Edit values below to update screening tests
export const SCREENING_CONFIG: ScreeningConfig = {
  version: "v1.0",
  passThreshold: 2, // Must pass all tasks to qualify
  maxAttempts: 2, // Allow 2 attempts before permanent rejection
  
  singleVideo: {
    instructions: "You will watch two example videos and rate their quality. This helps us ensure you understand our evaluation criteria.",
    
    tasks: [
      {
        id: "terrible-example",
        videoPath: "initial-screen-video-library/very-bad.mp4", // Path in Tigris storage
        title: "Example 1: Poor Quality Video",
        instructions: "Watch this video and rate its overall quality on a scale of 1-5.",
        explanation: "This video has obvious quality issues including: flickering, unrealistic movements, poor textures, and inconsistent physics. It should be rated as poor quality.",
        expectedRating: [1, 2], // Must rate 1 or 2 to pass
        failureMessage: "This video has clear quality issues that should result in a low rating. Please review the evaluation criteria and try again."
      },
      {
        id: "mediocre-example",
        videoPath: "initial-screen-video-library/good.mp4", // Path in Tigris storage
        title: "Example 2: Average Quality Video", 
        instructions: "Watch this video and rate its overall quality on a scale of 1-5.",
        explanation: "This video shows typical AI-generated content - not terrible but has some issues like minor inconsistencies and artifacts. It represents average quality.",
        expectedRating: [2, 3, 4], // Must rate exactly 3 to pass
        failureMessage: "This video represents average quality with some issues but is not extremely poor or excellent. Please review the evaluation criteria and try again."
      }
    ]
  },
  
  comparison: {
    instructions: "You will compare two pairs of videos to determine which has better quality. This helps us ensure you can distinguish between different quality levels.",
    
    tasks: [
      {
        id: "obvious-difference",
        videoAPath: "initial-screen-video-library/good.mp4", // Path in Tigris storage
        videoBPath: "initial-screen-video-library/very-bad.mp4", // Path in Tigris storage
        title: "Comparison 1: Clear Quality Difference",
        instructions: "Compare these two videos and select which has better overall quality.",
        explanation: "Video A shows good quality with smooth movements and realistic physics, while Video B has obvious problems like glitching and poor rendering.",
        expectedWinner: "A", // Video A must be chosen to pass
        failureMessage: "Video A clearly demonstrates better quality than Video B in terms of smoothness, realism, and technical execution. Please review the evaluation criteria and try again."
      },
      {
        id: "close-comparison", 
        videoAPath: "initial-screen-video-library/bad.mp4", // Path in Tigris storage
        videoBPath: "initial-screen-video-library/okay.mp4", // Path in Tigris storage
        title: "Comparison 2: Similar Quality Videos",
        instructions: "Compare these two videos and select which has better overall quality, or if they are roughly equal.",
        explanation: "Both videos show decent quality with minor differences. Either choice is acceptable as they represent similar quality levels.",
        expectedWinner: "either", // Either A, B, or Equal is acceptable
        failureMessage: "These videos are quite similar in quality. Any reasonable assessment is acceptable."
      }
    ]
  }
}

// Helper function to get screening config for a specific evaluation mode
export function getScreeningConfig(evaluationMode: 'single_video' | 'comparison') {
  return {
    version: SCREENING_CONFIG.version,
    passThreshold: SCREENING_CONFIG.passThreshold,
    maxAttempts: SCREENING_CONFIG.maxAttempts,
    mode: evaluationMode,
    tasks: evaluationMode === 'single_video' 
      ? SCREENING_CONFIG.singleVideo 
      : SCREENING_CONFIG.comparison
  }
}

// Helper function to validate screening answers
export function validateScreeningAnswers(
  evaluationMode: 'single_video' | 'comparison',
  answers: Record<string, number | string>
): {
  passed: boolean
  failedTasks: string[]
  passedTasks: string[]
  details: Record<string, { passed: boolean; expectedAnswer: any; actualAnswer: any }>
} {
  const config = evaluationMode === 'single_video' 
    ? SCREENING_CONFIG.singleVideo 
    : SCREENING_CONFIG.comparison
    
  const failedTasks: string[] = []
  const passedTasks: string[] = []
  const details: Record<string, any> = {}
  
  config.tasks.forEach(task => {
    const userAnswer = answers[task.id]
    let passed = false
    
    if (evaluationMode === 'single_video') {
      const videoTask = task as ScreeningVideoTask
      const rating = Number(userAnswer)
      passed = videoTask.expectedRating.includes(rating)
      details[task.id] = {
        passed,
        expectedAnswer: videoTask.expectedRating,
        actualAnswer: rating
      }
    } else {
      const compTask = task as ScreeningComparisonTask
      const choice = String(userAnswer)
      if (compTask.expectedWinner === 'either') {
        passed = ['A', 'B', 'Equal'].includes(choice)
      } else {
        passed = compTask.expectedWinner === choice
      }
      details[task.id] = {
        passed,
        expectedAnswer: compTask.expectedWinner,
        actualAnswer: choice
      }
    }
    
    if (passed) {
      passedTasks.push(task.id)
    } else {
      failedTasks.push(task.id)
    }
  })
  
  const totalPassed = passedTasks.length >= SCREENING_CONFIG.passThreshold
  
  return {
    passed: totalPassed,
    failedTasks,
    passedTasks,
    details
  }
}