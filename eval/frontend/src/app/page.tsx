'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface Experiment {
  id: string
  name: string
  description: string | null
  evaluationMode: 'comparison' | 'single_video'
  status: string
  archived: boolean
  createdAt: string
  _count: {
    twoVideoComparisonTasks: number
    singleVideoEvaluationTasks: number
  }
}

export default function Home() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [isProlific, setIsProlific] = useState(false)

  useEffect(() => {
    // Check if this is a Prolific session
    const prolificSession = sessionStorage.getItem('is_prolific')
    if (prolificSession) {
      setIsProlific(true)
    }
    
    fetchExperiments()
  }, [])

  const fetchExperiments = async () => {
    try {
      const experimentId = sessionStorage.getItem('experiment_id')
      const isProlific = sessionStorage.getItem('is_prolific')
      
      if (experimentId && isProlific) {
        // For Prolific sessions only, show the specific experiment
        const response = await fetch(`/api/experiments`)
        if (!response.ok) {
          throw new Error('Failed to load experiment data')
        }
        const allExperiments = await response.json()
        const experiment = allExperiments.find((exp: any) => exp.id === experimentId)
        
        if (!experiment) {
          throw new Error('Experiment not found or no longer active')
        }
        
        setExperiments([experiment])
      } else {
        // For non-Prolific sessions, show all active experiments
        const response = await fetch('/api/experiments')
        if (!response.ok) {
          throw new Error('Failed to load experiments')
        }
        const allExperiments = await response.json()
        
        // Filter to only show experiments that are ready/active and have tasks
        const availableExperiments = allExperiments.filter((exp: Experiment) => 
          (exp.status === 'active' || exp.status === 'ready') && 
          !exp.archived &&
          (exp._count.twoVideoComparisonTasks > 0 || exp._count.singleVideoEvaluationTasks > 0)
        )
        
        setExperiments(availableExperiments)
      }
    } catch (error) {
      console.error('Error fetching experiments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getExperimentStartUrl = (experiment: Experiment) => {
    // Include experiment ID in URL for proper routing
    if (experiment.evaluationMode === 'single_video') {
      return `/screening/single-video?experimentId=${experiment.id}`
    } else {
      return `/screening/comparison?experimentId=${experiment.id}`
    }
  }

  const getTotalTasks = (experiment: Experiment) => {
    return experiment._count.twoVideoComparisonTasks + experiment._count.singleVideoEvaluationTasks
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
          <CardTitle className="text-slate-100">Available Experiments</CardTitle>
          <CardDescription className="text-slate-300">
            Choose an experiment to participate in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : experiments.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              No experiments available at the moment.
            </p>
          ) : (
            <div className="space-y-2">
              {experiments.map((experiment) => (
                <Link
                  key={experiment.id}
                  href={getExperimentStartUrl(experiment)}
                >
                  <Card className="cursor-pointer hover:bg-slate-700/30 transition-colors border-slate-600/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-200">{experiment.name}</p>
                      <p className="text-sm text-slate-400 mb-2">
                        Created: {new Date(experiment.createdAt).toLocaleDateString()}
                      </p>
                      {experiment.description && (
                        <p className="text-sm text-slate-300 max-w-2xl">
                          {experiment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant="secondary" className={
                          experiment.evaluationMode === 'single_video' 
                            ? "bg-purple-700 text-purple-200 border-purple-600"
                            : "bg-blue-700 text-blue-200 border-blue-600"
                        }>
                          {experiment.evaluationMode === 'single_video' ? 'Single Video' : 'Comparison'}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">
                          {getTotalTasks(experiment)} tasks
                        </p>
                      </div>
                      <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">
                        Begin Study
                      </Button>
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