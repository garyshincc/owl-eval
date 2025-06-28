'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Play, X } from 'lucide-react'
import { getScreeningConfig, validateScreeningAnswers, ScreeningVideoTask, ScreeningComparisonTask } from '@/lib/screening-config'

export default function ScreeningModePage() {
  const router = useRouter()
  const params = useParams()
  const urlMode = params.mode as string
  const mode = urlMode === 'single-video' ? 'single_video' : 'comparison'
  
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  
  const config = getScreeningConfig(mode)
  const currentTask = config.tasks.tasks[currentTaskIndex]
  const isLastTask = currentTaskIndex === config.tasks.tasks.length - 1

  useEffect(() => {
    // Get participant info from session storage
    const prolificId = sessionStorage.getItem('prolific_id')
    const sessionId = sessionStorage.getItem('session_id')
    const experimentId = sessionStorage.getItem('experiment_id')
    const isProlific = sessionStorage.getItem('is_prolific')
    
    if (isProlific && (!prolificId || !sessionId || !experimentId)) {
      // For Prolific users, we need all the session data
      console.warn('Missing Prolific participant info, redirecting to home')
      router.push('/')
      return
    }
    
    // For non-Prolific users, generate a session ID if needed
    let actualParticipantId = sessionId
    if (!actualParticipantId) {
      actualParticipantId = `screening-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      sessionStorage.setItem('session_id', actualParticipantId)
    }
    
    setParticipantId(actualParticipantId)
  }, [router])

  const handleAnswerChange = (taskId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [taskId]: mode === 'single_video' ? parseInt(value) : value
    }))
  }

  const handleNextTask = () => {
    if (isLastTask) {
      handleSubmitScreening()
    } else {
      setCurrentTaskIndex(prev => prev + 1)
    }
  }

  const handleSubmitScreening = async () => {
    setIsSubmitting(true)
    
    try {
      // Validate answers locally first
      const validation = validateScreeningAnswers(mode, answers)
      setValidationResult(validation)
      
      // Submit to backend
      const response = await fetch('/api/screening/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          evaluationMode: mode,
          answers,
          validation,
          configVersion: config.version
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit screening')
      }
      
      const result = await response.json()
      setIsComplete(true)
      
      // Handle post-screening logic
      if (validation.passed) {
        sessionStorage.setItem('screening_completed', 'true')
        
        // Get the next available task for this participant
        const experimentId = sessionStorage.getItem('experiment_id')
        const nextTaskResponse = await fetch(`/api/next-task?participantId=${participantId}&experimentId=${experimentId || ''}`)
        
        if (nextTaskResponse.ok) {
          const nextTaskData = await nextTaskResponse.json()
          
          if (nextTaskData.taskId) {
            // Redirect directly to the evaluation
            setTimeout(() => {
              router.push(`/evaluate/${nextTaskData.taskId}`)
            }, 2000)
          } else {
            // No tasks available - redirect to thank you page
            setTimeout(() => {
              router.push('/thank-you')
            }, 2000)
          }
        } else {
          // Fallback to home page if API fails
          setTimeout(() => {
            router.push('/')
          }, 2000)
        }
      } else {
        // Handle screening failure
        const isProlific = sessionStorage.getItem('is_prolific')
        const isAnon = participantId?.includes('anon') || participantId?.includes('screening-')
        
        if (isProlific && !isAnon) {
          // Reject Prolific participant
          const rejectResponse = await fetch('/api/prolific/reject', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participantId,
              reason: 'Failed screening requirements - did not meet minimum task threshold'
            })
          })
          
          if (!rejectResponse.ok) {
            console.error('Failed to reject Prolific participant')
          }
        }
        
        // For both anon and Prolific (after rejection), we'll show the failure message
        // The UI will handle showing appropriate buttons
      }
      
    } catch (error) {
      console.error('Error submitting screening:', error)
      alert('Failed to submit screening. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!participantId) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">Loading screening...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete && validationResult) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-slate-100 flex items-center gap-2">
              {validationResult.passed ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <X className="h-6 w-6 text-red-400" />
              )}
              Screening {validationResult.passed ? 'Completed' : 'Failed'}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {validationResult.passed 
                ? 'You have successfully completed the screening process'
                : 'Unfortunately, you did not meet the requirements for this study'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {validationResult.passed ? (
              <div className="bg-green-900/20 border border-green-500/30 p-6 rounded-lg">
                <h3 className="font-semibold mb-3 text-green-200">Screening Successful!</h3>
                <p className="text-green-100 mb-4">
                  You passed {validationResult.passedTasks.length} out of {config.tasks.tasks.length} screening tasks.
                  You will now be redirected to begin the main evaluation.
                </p>
                <p className="text-green-200 text-sm">
                  Redirecting to the study in a few seconds...
                </p>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-lg">
                <h3 className="font-semibold mb-3 text-red-200">Screening Requirements Not Met</h3>
                <p className="text-red-100 mb-4">
                  You passed {validationResult.passedTasks.length} out of {config.tasks.tasks.length} screening tasks, 
                  but {config.passThreshold} were required to qualify for this study.
                </p>
                {(() => {
                  const isProlific = sessionStorage.getItem('is_prolific')
                  const isAnon = participantId?.includes('anon') || participantId?.includes('screening-')
                  
                  if (isProlific && !isAnon) {
                    return (
                      <div className="space-y-2">
                        <p className="text-red-200 text-sm">
                          Your Prolific submission has been marked as rejected. You will not be able to participate in this study.
                        </p>
                        <p className="text-red-200 text-sm">
                          Thank you for your time.
                        </p>
                      </div>
                    )
                  } else {
                    return (
                      <div className="space-y-4">
                        <p className="text-red-200 text-sm">
                          Thank you for your time. You may try other available studies.
                        </p>
                        <Button 
                          onClick={() => router.push('/')}
                          className="bg-slate-600 hover:bg-slate-700 text-white"
                        >
                          Return to Home
                        </Button>
                      </div>
                    )
                  }
                })()}
              </div>
            )}
            
            <div className="bg-slate-800/50 border border-slate-600/50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-200 mb-2">Task Results:</h4>
              <div className="space-y-2">
                {config.tasks.tasks.map((task, index) => {
                  const taskResult = validationResult.details[task.id]
                  return (
                    <div key={task.id} className="flex items-center justify-between">
                      <span className="text-slate-300">Task {index + 1}: {task.title}</span>
                      <Badge variant={taskResult.passed ? 'default' : 'destructive'}>
                        {taskResult.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
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
            Screening Test - {mode === 'single_video' ? 'Single Video' : 'Comparison'} Mode
          </CardTitle>
          <CardDescription className="text-slate-300">
            Task {currentTaskIndex + 1} of {config.tasks.tasks.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-600/50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4 text-slate-200 text-lg">{currentTask.title}</h3>
            <p className="text-slate-300 mb-4">{currentTask.instructions}</p>
            
            {/* Video Display */}
            {mode === 'single_video' ? (
              <div className="mb-6">
                <video
                  key={currentTask.id}
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full max-w-2xl mx-auto rounded-lg"
                  style={{ aspectRatio: '16/9' }}
                >
                  <source src={`/api/video/${(currentTask as ScreeningVideoTask).videoPath}`} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-slate-200 mb-2">Video A</h4>
                  <video
                    key={`${currentTask.id}-a`}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full rounded-lg"
                    style={{ aspectRatio: '16/9' }}
                  >
                    <source src={`/api/video/${(currentTask as ScreeningComparisonTask).videoAPath}`} type="video/mp4" />
                    Your browser does not support video playback.
                  </video>
                </div>
                <div>
                  <h4 className="font-medium text-slate-200 mb-2">Video B</h4>
                  <video
                    key={`${currentTask.id}-b`}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full rounded-lg"
                    style={{ aspectRatio: '16/9' }}
                  >
                    <source src={`/api/video/${(currentTask as ScreeningComparisonTask).videoBPath}`} type="video/mp4" />
                    Your browser does not support video playback.
                  </video>
                </div>
              </div>
            )}
            
            {/* Answer Selection */}
            <div className="bg-slate-700/30 border border-slate-600/30 p-4 rounded-lg">
              <h4 className="font-medium text-slate-200 mb-4">Your Assessment:</h4>
              
              {mode === 'single_video' ? (
                <div>
                  <Label className="text-slate-300 mb-3 block">Rate the overall quality of this video (1-5 scale):</Label>
                  <RadioGroup
                    value={answers[currentTask.id]?.toString() || ''}
                    onValueChange={(value) => handleAnswerChange(currentTask.id, value)}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                        <Label htmlFor={`rating-${rating}`} className="text-slate-300">
                          {rating} - {rating === 1 ? 'Very Poor' : rating === 2 ? 'Poor' : rating === 3 ? 'Average' : rating === 4 ? 'Good' : 'Excellent'}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                <div>
                  <Label className="text-slate-300 mb-3 block">Which video has better overall quality?</Label>
                  <RadioGroup
                    value={answers[currentTask.id]?.toString() || ''}
                    onValueChange={(value) => handleAnswerChange(currentTask.id, value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="choice-a" />
                      <Label htmlFor="choice-a" className="text-slate-300">Video A is better</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="choice-b" />
                      <Label htmlFor="choice-b" className="text-slate-300">Video B is better</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Equal" id="choice-equal" />
                      <Label htmlFor="choice-equal" className="text-slate-300">They are roughly equal</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
            
            {/* Explanation */}
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
              <h4 className="font-medium text-blue-200 mb-2">What to look for:</h4>
              <p className="text-blue-100 text-sm">{currentTask.explanation}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-slate-400 text-sm">
              Progress: {currentTaskIndex + 1} / {config.tasks.tasks.length}
            </div>
            
            <Button
              onClick={handleNextTask}
              disabled={!answers[currentTask.id] || isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              size="lg"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : isLastTask ? (
                'Complete Screening'
              ) : (
                'Next Task'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}