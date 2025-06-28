'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface Comparison {
  comparison_id: string
  scenario_id: string
  created_at: string
  num_evaluations: number
  evaluation_url: string
  experiment_name: string
  experiment_created_at: string
}

interface VideoTask {
  id: string
  scenario_id: string
  model_name: string
  created_at: string
  evaluation_url: string
  experiment_name: string
  experiment_created_at: string
}

export default function Home() {
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [videoTasks, setVideoTasks] = useState<VideoTask[]>([])
  const [loading, setLoading] = useState(true)
  const [isProlific, setIsProlific] = useState(false)
  const [experimentMode, setExperimentMode] = useState<'comparison' | 'single_video'>('comparison')

  useEffect(() => {
    // Check if this is a Prolific session
    const prolificSession = sessionStorage.getItem('is_prolific')
    if (prolificSession) {
      setIsProlific(true)
    }
    
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      // Include experiment ID if this is a Prolific session
      const experimentId = sessionStorage.getItem('experiment_id')
      
      if (experimentId) {
        // For Prolific sessions, first determine the experiment mode
        const expResponse = await fetch(`/api/experiments`)
        if (!expResponse.ok) {
          console.error('Failed to fetch experiments:', expResponse.status)
          // Show error message instead of crashing
          throw new Error('Failed to load experiment data')
        }
        const experiments = await expResponse.json()
        const experiment = experiments.find((exp: any) => exp.id === experimentId)
        
        if (!experiment) {
          console.error('Experiment not found:', experimentId)
          throw new Error('Experiment not found or no longer active')
        }
        
        if (experiment && experiment.evaluationMode === 'single_video') {
          setExperimentMode('single_video')
          // Fetch video tasks for single video experiments
          const response = await fetch(`/api/single-video-evaluation-tasks?experimentId=${experimentId}`)
          const data = await response.json()
          setVideoTasks(data)
        } else {
          setExperimentMode('comparison')
          // Fetch comparisons for comparison experiments
          const response = await fetch(`/api/two-video-comparison-tasks?experimentId=${experimentId}`)
          const data = await response.json()
          setComparisons(data)
        }
      } else {
        // For non-Prolific sessions, fetch both comparisons and video tasks
        console.log('Fetching all available experiments for non-Prolific user')
        
        const [comparisonsResponse, videoTasksResponse] = await Promise.all([
          fetch('/api/two-video-comparison-tasks'),
          fetch('/api/single-video-evaluation-tasks')
        ])
        
        const comparisonsData = await comparisonsResponse.json()
        const videoTasksData = await videoTasksResponse.json()
        
        console.log('Comparisons found:', comparisonsData.length, comparisonsData)
        console.log('Video tasks found:', videoTasksData.length, videoTasksData)
        
        setComparisons(comparisonsData)
        setVideoTasks(videoTasksData)
        
        // Set experiment mode based on what's available
        if (videoTasksData.length > 0) {
          setExperimentMode('single_video')
        } else if (comparisonsData.length > 0) {
          setExperimentMode('comparison')
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-slate-100">Welcome to the World Model Evaluation Study</CardTitle>
          <CardDescription className="text-slate-300">
            Evaluate AI-generated world models - Available studies and experiments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-200 leading-relaxed">
            You will be evaluating AI-generated world models. Evaluations may involve either watching single videos and rating their quality, or comparing two videos side-by-side to determine which performs better across several quality dimensions.
          </p>
          
          <div className="bg-slate-800/50 border border-slate-600/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-slate-200">What You&apos;ll Be Doing:</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-slate-200 mb-2">Single Video Evaluations:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-sm">
                  <li>Watch a short video (approximately 4 seconds)</li>
                  <li>Rate it across four dimensions on a scale of 1-5</li>
                  <li>Provide your rating for each dimension</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-slate-200 mb-2">Comparison Evaluations:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-sm">
                  <li>Watch two short videos side by side</li>
                  <li>Compare them across four dimensions</li>
                  <li>Select which video performs better for each dimension</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-slate-200 mb-2">Evaluation Dimensions:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                  <li><strong className="text-slate-200">Overall Quality</strong> - General realism and believability</li>
                  <li><strong className="text-slate-200">Controllability</strong> - How well the character follows commands</li>
                  <li><strong className="text-slate-200">Visual Quality</strong> - Clarity and aesthetic appeal</li>
                  <li><strong className="text-slate-200">Temporal Consistency</strong> - Smoothness and stability over time</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-600/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-slate-200">Important Notes:</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>Each evaluation takes approximately 1-3 minutes depending on the type</li>
              <li>Please watch all videos completely before making your judgments</li>
              <li>There are no right or wrong answers - we want your honest opinion</li>
              <li>Use a modern browser (Chrome, Firefox, Safari) for best experience</li>
              {isProlific && (
                <li className="font-semibold text-cyan-400">
                  Complete all evaluations as instructed
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-100">Available Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : (videoTasks.length === 0 && comparisons.length === 0) ? (
            <p className="text-center text-slate-400 py-8">
              No evaluations available at the moment.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Show single video evaluations */}
              {videoTasks.map((videoTask) => (
                <Link
                  key={videoTask.id}
                  href={`/evaluate/${videoTask.id}`}
                >
                  <Card className="cursor-pointer hover:bg-slate-700/30 transition-colors border-slate-600/50">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-slate-200">{videoTask.experiment_name}</p>
                        <p className="text-sm text-slate-400">
                          Created: {new Date(videoTask.experiment_created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-purple-700 text-purple-200 border-purple-600">
                          Single Video
                        </Badge>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">Evaluate</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {/* Show comparison evaluations */}
              {comparisons.map((comparison) => (
                <Link
                  key={comparison.comparison_id}
                  href={`/evaluate/${comparison.comparison_id}`}
                >
                  <Card className="cursor-pointer hover:bg-slate-700/30 transition-colors border-slate-600/50">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-slate-200">{comparison.experiment_name}</p>
                        <p className="text-sm text-slate-400">
                          Created: {new Date(comparison.experiment_created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-blue-700 text-blue-200 border-blue-600">
                          Comparison
                        </Badge>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">Evaluate</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}