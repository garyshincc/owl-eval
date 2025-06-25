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
}

interface VideoTask {
  id: string
  scenario_id: string
  model_name: string
  created_at: string
  evaluation_url: string
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
          const response = await fetch(`/api/video-tasks?experimentId=${experimentId}`)
          const data = await response.json()
          setVideoTasks(data)
        } else {
          setExperimentMode('comparison')
          // Fetch comparisons for comparison experiments
          const response = await fetch(`/api/comparisons?experimentId=${experimentId}`)
          const data = await response.json()
          setComparisons(data)
        }
      } else {
        // For non-Prolific sessions, default to comparisons
        const response = await fetch('/api/comparisons')
        const data = await response.json()
        setComparisons(data)
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
            Evaluate AI-generated world models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-200 leading-relaxed">
            {experimentMode === 'single_video' 
              ? 'You will be evaluating AI-generated world models. Each evaluation involves watching a single video and rating its quality across several dimensions.'
              : 'You will be evaluating AI-generated world models. Each evaluation involves comparing two videos side-by-side and determining which one performs better across several quality dimensions.'
            }
          </p>
          
          <div className="bg-slate-800/50 border border-slate-600/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-slate-200">What You&apos;ll Be Doing:</h3>
            {experimentMode === 'single_video' ? (
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Watch a short video (approximately 4 seconds)</li>
                <li>Rate it across four dimensions on a scale of 1-5:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><strong className="text-slate-200">Overall Quality</strong> - General realism and believability</li>
                    <li><strong className="text-slate-200">Controllability</strong> - How well the character follows commands</li>
                    <li><strong className="text-slate-200">Visual Quality</strong> - Clarity and aesthetic appeal</li>
                    <li><strong className="text-slate-200">Temporal Consistency</strong> - Smoothness and stability over time</li>
                  </ul>
                </li>
                <li>Provide your rating for each dimension</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Watch two short videos (approximately 4 seconds each) side by side</li>
                <li>Compare them across four dimensions:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><strong className="text-slate-200">Overall Quality</strong> - General realism and believability</li>
                    <li><strong className="text-slate-200">Controllability</strong> - How well the character follows commands</li>
                    <li><strong className="text-slate-200">Visual Quality</strong> - Clarity and aesthetic appeal</li>
                    <li><strong className="text-slate-200">Temporal Consistency</strong> - Smoothness and stability over time</li>
                  </ul>
                </li>
                <li>Select which video performs better for each dimension</li>
              </ol>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-600/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-slate-200">Important Notes:</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>Each evaluation takes approximately {experimentMode === 'single_video' ? '1-2' : '2-3'} minutes</li>
              <li>Please watch {experimentMode === 'single_video' ? 'each video' : 'both videos'} completely before making your judgments</li>
              <li>There are no right or wrong answers - we want your honest opinion</li>
              <li>Use a modern browser (Chrome, Firefox, Safari) for best experience</li>
              {isProlific && (
                <li className="font-semibold text-cyan-400">
                  Complete all evaluations to receive your completion code
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
          ) : (experimentMode === 'single_video' ? videoTasks.length === 0 : comparisons.length === 0) ? (
            <p className="text-center text-slate-400 py-8">
              No evaluations available at the moment.
            </p>
          ) : (
            <div className="space-y-2">
              {experimentMode === 'single_video' 
                ? videoTasks.map((videoTask) => (
                    <Link
                      key={videoTask.id}
                      href={`/evaluate-video/${videoTask.id}`}
                    >
                      <Card className="cursor-pointer hover:bg-slate-700/30 transition-colors border-slate-600/50">
                        <CardContent className="flex items-center justify-between py-4">
                          <div>
                            <p className="font-medium text-slate-200">Model: {videoTask.model_name}</p>
                            <p className="text-sm text-slate-400">Scenario: {videoTask.scenario_id}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600">
                              Single Video
                            </Badge>
                            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">Evaluate</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                : comparisons.map((comparison) => (
                    <Link
                      key={comparison.comparison_id}
                      href={`/evaluate/${comparison.comparison_id}`}
                    >
                      <Card className="cursor-pointer hover:bg-slate-700/30 transition-colors border-slate-600/50">
                        <CardContent className="flex items-center justify-between py-4">
                          <div>
                            <p className="font-medium text-slate-200">Scenario: {comparison.scenario_id}</p>
                            <p className="text-sm text-slate-400">
                              Created: {new Date(comparison.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600">
                              {comparison.num_evaluations} evaluations
                            </Badge>
                            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">Evaluate</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}