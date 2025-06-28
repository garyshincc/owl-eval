'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Play } from 'lucide-react'

export default function ScreeningPage() {
  const router = useRouter()
  const [canProceed, setCanProceed] = useState(false)
  const [evaluationMode, setEvaluationMode] = useState<'comparison' | 'single_video'>('comparison')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Determine evaluation mode from experiment
    const experimentId = sessionStorage.getItem('experiment_id')
    
    if (experimentId) {
      fetch('/api/experiments')
        .then(res => res.json())
        .then(experiments => {
          const experiment = experiments.find((exp: any) => exp.id === experimentId)
          if (experiment) {
            setEvaluationMode(experiment.evaluationMode || 'comparison')
          }
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching experiment mode:', error)
          setLoading(false)
        })
    } else {
      // For non-Prolific users, default to comparison mode
      setLoading(false)
    }
  }, [])

  const handleStartScreening = () => {
    // Redirect to mode-specific screening, converting underscores to hyphens for URL
    const urlMode = evaluationMode === 'single_video' ? 'single-video' : 'comparison'
    router.push(`/screening/${urlMode}`)
  }

  const handleUnderstand = () => {
    setCanProceed(true)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">Loading screening information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-slate-100 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-cyan-400" />
            Initial Screening
          </CardTitle>
          <CardDescription className="text-slate-300">
            Please read the instructions carefully before proceeding to evaluations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-600/50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4 text-slate-200 text-lg">Study Overview</h3>
            <p className="text-slate-300 leading-relaxed mb-4">
              You will be evaluating AI-generated videos that simulate world models. Your task is to carefully 
              watch short video clips and provide honest, thoughtful ratings based on the quality criteria provided.
            </p>
            
            <div className="space-y-4">
              <div className="bg-slate-700/30 border border-slate-600/30 p-4 rounded-lg">
                <h4 className="font-medium text-slate-200 mb-2">What makes a good evaluation:</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  <li>Watch each video completely and attentively</li>
                  <li>Consider all aspects of video quality as described</li>
                  <li>Provide honest ratings based on your genuine assessment</li>
                  <li>Take your time - quality is more important than speed</li>
                </ul>
              </div>

              <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                <h4 className="font-medium text-red-300 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Important Warning
                </h4>
                <p className="text-red-200 text-sm">
                  Participants who provide random, careless, or obviously inaccurate responses will be identified 
                  through quality control measures and may be rejected from the study. Please take this task seriously.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-600/50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4 text-slate-200 text-lg">Evaluation Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="border border-slate-600/50 p-3 rounded">
                  <h4 className="font-medium text-cyan-300">Overall Quality</h4>
                  <p className="text-sm text-slate-400">General realism and believability of the video</p>
                </div>
                <div className="border border-slate-600/50 p-3 rounded">
                  <h4 className="font-medium text-purple-300">Controllability</h4>
                  <p className="text-sm text-slate-400">How well actions respond to intended commands</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="border border-slate-600/50 p-3 rounded">
                  <h4 className="font-medium text-green-300">Visual Quality</h4>
                  <p className="text-sm text-slate-400">Clarity, sharpness, and visual appeal</p>
                </div>
                <div className="border border-slate-600/50 p-3 rounded">
                  <h4 className="font-medium text-orange-300">Temporal Consistency</h4>
                  <p className="text-sm text-slate-400">Smoothness and stability over time</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-600/50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4 text-slate-200 text-lg">Technical Requirements</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Use a desktop or laptop computer (mobile devices not recommended)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Use headphones or speakers to hear audio if present</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Ensure stable internet connection for video playback</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Use modern browser (Chrome, Firefox, Safari recommended)</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-lg">
            <h3 className="font-semibold mb-3 text-blue-200">Ready to Begin?</h3>
            <p className="text-blue-100 mb-4">
              By clicking &quot;I Understand&quot; below, you confirm that you have read and understood the instructions 
              and agree to provide thoughtful, honest evaluations.
            </p>
            
            {!canProceed ? (
              <Button 
                onClick={handleUnderstand}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                I Understand the Requirements
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">
                    Ready to proceed
                  </Badge>
                </div>
                
                <Button 
                  onClick={handleStartScreening}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  size="lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Begin Screening Test
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}