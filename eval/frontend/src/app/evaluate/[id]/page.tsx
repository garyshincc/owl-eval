'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Maximize2,
  Minimize2,
  Link,
  Unlink,
  Settings,
  Save,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Comparison {
  comparison_id: string
  scenario_id: string
  scenario_metadata: {
    name: string
    description: string
  }
  model_a_video_path: string
  model_b_video_path: string
  randomized_labels: {
    A: string
    B: string
  }
}

interface DimensionInfo {
  name: string
  prompt: string
  description: string
  sub_questions?: string[]
}

const dimensions = [
  'overall_quality',
  'controllability', 
  'visual_quality',
  'temporal_consistency'
]

const dimensionInfo: Record<string, DimensionInfo> = {
  overall_quality: {
    name: 'Overall Quality',
    prompt: 'Which video has better overall quality?',
    description: 'Consider the overall impression of the generated videos, including: General realism and believability, Coherence of the game world, Completeness of actions and movements, How well it looks like actual Minecraft gameplay',
    sub_questions: [
      'Which video looks more like real Minecraft gameplay?',
      'Which video maintains a more coherent game world?',
      'Which video shows more complete and natural movements?'
    ]
  },
  controllability: {
    name: 'Controllability',
    prompt: 'Which video better follows the control inputs?',
    description: 'Evaluate how accurately the character responds to control inputs: Does the character move in the intended direction? Are jumps and attacks executed when commanded? Does the camera rotate smoothly according to mouse movements? Are the responses timely and accurate?',
    sub_questions: [
      'Which video shows more accurate character movement?',
      'Which video has better camera control?',
      'Which video responds more accurately to action commands?'
    ]
  },
  visual_quality: {
    name: 'Visual Quality',
    prompt: 'Which video has better visual quality?',
    description: 'Focus on the visual aspects of individual frames: Image clarity and sharpness, Texture quality and detail, Lighting and color consistency, Absence of visual artifacts or glitches',
    sub_questions: [
      'Which video has clearer and sharper visuals?',
      'Which video shows better texture quality?',
      'Which video has fewer visual artifacts?'
    ]
  },
  temporal_consistency: {
    name: 'Temporal Consistency',
    prompt: 'Which video has better temporal consistency?',
    description: 'Evaluate the consistency across time: Smooth transitions between frames, Stable object appearance over time, Consistent physics and motion, No flickering or sudden changes',
    sub_questions: [
      'Which video has smoother motion?',
      'Which video maintains more stable object appearance?',
      'Which video shows more consistent physics?'
    ]
  }
}

export default function EvaluatePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [actualComparisonId, setActualComparisonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [startTime] = useState(Date.now())
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Generate or retrieve session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('anon_session_id')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('anon_session_id', sessionId)
    }
    return sessionId
  }, [])
  
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const [playingA, setPlayingA] = useState(false)
  const [playingB, setPlayingB] = useState(false)
  const [currentTimeA, setCurrentTimeA] = useState(0)
  const [currentTimeB, setCurrentTimeB] = useState(0)
  const [durationA, setDurationA] = useState(0)
  const [durationB, setDurationB] = useState(0)
  const [volumeA, setVolumeA] = useState(1)
  const [volumeB, setVolumeB] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [videoSize, setVideoSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [syncMode, setSyncMode] = useState(true)

  const fetchComparison = useCallback(async () => {
    try {
      // First try to fetch as comparison ID
      let response = await fetch(`/api/comparisons/${params.id}`)
      
      if (!response.ok && response.status === 404) {
        // If not found, try as experiment slug to get a random comparison
        const experimentsResponse = await fetch(`/api/experiments`)
        if (experimentsResponse.ok) {
          const experiments = await experimentsResponse.json()
          const experiment = experiments.find((exp: any) => exp.slug === params.id)
          
          if (experiment && experiment._count.comparisons > 0) {
            // Get comparisons for this experiment
            const comparisonsResponse = await fetch(`/api/comparisons?experimentId=${experiment.id}`)
            if (comparisonsResponse.ok) {
              const comparisons = await comparisonsResponse.json()
              if (comparisons.length > 0) {
                // Get the first comparison
                const comparisonId = comparisons[0].comparison_id
                setActualComparisonId(comparisonId)
                response = await fetch(`/api/comparisons/${comparisonId}`)
                // Update the URL to reflect the actual comparison ID
                window.history.replaceState({}, '', `/evaluate/${comparisonId}`)
              }
            }
          }
        }
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch comparison')
      }
      
      const data = await response.json()
      setComparison(data)
      
      // Set the actual comparison ID if not already set
      const comparisonId = actualComparisonId || data.comparison_id
      if (!actualComparisonId) {
        setActualComparisonId(comparisonId)
      }
      
      // Load any existing draft
      const participantId = sessionStorage.getItem('participant_id') || 'anonymous'
      const sessionId = getSessionId()
      const draftResponse = await fetch(`/api/evaluations/draft?comparisonId=${comparisonId}&participantId=${participantId}&sessionId=${sessionId}`)
      
      if (draftResponse.ok) {
        const draftData = await draftResponse.json()
        if (draftData.draft) {
          // Check if evaluation is already completed
          if (draftData.draft.status === 'completed') {
            toast({
              title: 'Already Completed',
              description: 'You have already submitted an evaluation for this comparison',
              variant: 'destructive'
            })
            router.push('/thank-you')
            return
          }
          
          if (draftData.draft.status === 'draft') {
            // Check if we have the full responses saved in clientMetadata
            const savedResponses = draftData.draft.clientMetadata?.responses
            if (savedResponses) {
              setResponses(savedResponses)
            } else {
              // Fallback to dimension scores if no full responses available
              const dimensionScores = draftData.draft.dimensionScores || {}
              const uiResponses: Record<string, string> = {}
              Object.entries(dimensionScores).forEach(([dimension, score]) => {
                if (score === 'A') {
                  uiResponses[dimension] = 'A_slightly_better'
                } else if (score === 'B') {
                  uiResponses[dimension] = 'B_slightly_better'
                } else {
                  uiResponses[dimension] = 'Equal'
                }
              })
              setResponses(uiResponses)
            }
            setLastSaved(new Date(draftData.draft.lastSavedAt))
            
            toast({
              title: 'Draft Loaded',
              description: 'Your previous progress has been restored',
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching comparison:', error)
      toast({
        title: 'Error',
        description: 'Failed to load comparison',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [params.id, toast, getSessionId])

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    if (!comparison || Object.keys(responses).length === 0 || submitting) {
      console.log('Skipping save: no comparison, responses, or currently submitting', { 
        comparison: !!comparison, 
        responsesCount: Object.keys(responses).length,
        submitting
      })
      return
    }
    
    console.log('Starting draft save...', { responses })
    setSaving(true)
    try {
      const participantId = sessionStorage.getItem('participant_id') || 'anonymous'
      const experimentId = sessionStorage.getItem('experiment_id')
      const prolificPid = sessionStorage.getItem('prolific_pid')
      const sessionId = getSessionId()
      
      const dimensionScores: Record<string, string> = {}
      Object.entries(responses).forEach(([dimension, value]) => {
        if (value.includes('A')) {
          dimensionScores[dimension] = 'A'
        } else if (value.includes('B')) {
          dimensionScores[dimension] = 'B'
        } else {
          dimensionScores[dimension] = 'Equal'
        }
      })

      console.log('Saving draft with data:', {
        comparisonId: params.id,
        participantId,
        sessionId,
        dimensionScores
      })

      const response = await fetch('/api/evaluations/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comparisonId: actualComparisonId || params.id,
          participantId,
          experimentId,
          prolificPid,
          dimensionScores,
          completionTimeSeconds: (Date.now() - startTime) / 1000,
          clientMetadata: {
            responses,
            userAgent: navigator.userAgent,
            sessionId,
          },
        }),
      })

      console.log('Draft save response:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('Draft saved successfully:', data)
        setLastSaved(new Date(data.lastSavedAt))
        toast({
          title: 'Progress Saved',
          description: 'Your evaluation progress has been saved',
        })
      } else if (response.status === 409) {
        // Evaluation already completed
        toast({
          title: 'Already Completed',
          description: 'You have already submitted this evaluation',
          variant: 'destructive'
        })
        router.push('/thank-you')
        return
      } else {
        const errorData = await response.text()
        console.error('Draft save failed:', response.status, errorData)
        toast({
          title: 'Save Failed',
          description: 'Failed to save progress',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      toast({
        title: 'Save Error',
        description: 'Network error while saving',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }, [comparison, responses, actualComparisonId, params.id, startTime, getSessionId, toast, router, submitting])

  // Debounced auto-save when responses change
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 2000) // Save after 2 seconds of inactivity
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [responses, saveDraft])

  useEffect(() => {
    fetchComparison()
  }, [fetchComparison])

  // Set up video event listeners
  useEffect(() => {
    const videoA = videoARef.current
    const videoB = videoBRef.current

    if (videoA) {
      const handlePlayA = () => setPlayingA(true)
      const handlePauseA = () => setPlayingA(false)
      const handleTimeUpdateA = () => setCurrentTimeA(videoA.currentTime)
      const handleLoadedMetadataA = () => setDurationA(videoA.duration)

      videoA.addEventListener('play', handlePlayA)
      videoA.addEventListener('pause', handlePauseA)
      videoA.addEventListener('timeupdate', handleTimeUpdateA)
      videoA.addEventListener('loadedmetadata', handleLoadedMetadataA)

      return () => {
        videoA.removeEventListener('play', handlePlayA)
        videoA.removeEventListener('pause', handlePauseA)
        videoA.removeEventListener('timeupdate', handleTimeUpdateA)
        videoA.removeEventListener('loadedmetadata', handleLoadedMetadataA)
      }
    }
  }, [comparison])

  useEffect(() => {
    const videoB = videoBRef.current

    if (videoB) {
      const handlePlayB = () => setPlayingB(true)
      const handlePauseB = () => setPlayingB(false)
      const handleTimeUpdateB = () => setCurrentTimeB(videoB.currentTime)
      const handleLoadedMetadataB = () => setDurationB(videoB.duration)

      videoB.addEventListener('play', handlePlayB)
      videoB.addEventListener('pause', handlePauseB)
      videoB.addEventListener('timeupdate', handleTimeUpdateB)
      videoB.addEventListener('loadedmetadata', handleLoadedMetadataB)

      return () => {
        videoB.removeEventListener('play', handlePlayB)
        videoB.removeEventListener('pause', handlePauseB)
        videoB.removeEventListener('timeupdate', handleTimeUpdateB)
        videoB.removeEventListener('loadedmetadata', handleLoadedMetadataB)
      }
    }
  }, [comparison])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in form fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          e.preventDefault()
          handlePlayBoth()
          break
        case 'arrowleft':
          e.preventDefault()
          if (syncMode) {
            const avgTime = (currentTimeA + currentTimeB) / 2
            handleSeek('A', Math.max(0, avgTime - 5))
            handleSeek('B', Math.max(0, avgTime - 5))
          }
          break
        case 'arrowright':
          e.preventDefault()
          if (syncMode) {
            const avgTime = (currentTimeA + currentTimeB) / 2
            handleSeek('A', Math.min(durationA, avgTime + 5))
            handleSeek('B', Math.min(durationB, avgTime + 5))
          }
          break
        case 'r':
          e.preventDefault()
          handleRestart()
          break
        case 's':
          e.preventDefault()
          toggleSync()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentTimeA, currentTimeB, durationA, durationB, syncMode])

  // Video control functions
  const handlePlayA = () => {
    if (videoARef.current) {
      if (playingA) {
        videoARef.current.pause()
      } else {
        videoARef.current.play()
        if (syncMode && videoBRef.current && !playingB) {
          videoBRef.current.play()
        }
      }
    }
  }

  const handlePlayB = () => {
    if (videoBRef.current) {
      if (playingB) {
        videoBRef.current.pause()
      } else {
        videoBRef.current.play()
        if (syncMode && videoARef.current && !playingA) {
          videoARef.current.play()
        }
      }
    }
  }

  const handlePlayBoth = () => {
    if (videoARef.current && videoBRef.current) {
      const bothPlaying = playingA && playingB
      if (bothPlaying) {
        videoARef.current.pause()
        videoBRef.current.pause()
      } else {
        // Sync times before playing
        const avgTime = (currentTimeA + currentTimeB) / 2
        videoARef.current.currentTime = avgTime
        videoBRef.current.currentTime = avgTime
        videoARef.current.play()
        videoBRef.current.play()
      }
    }
  }

  const handleSeek = (video: 'A' | 'B', time: number) => {
    const videoRef = video === 'A' ? videoARef : videoBRef
    if (videoRef.current) {
      videoRef.current.currentTime = time
      if (syncMode) {
        const otherRef = video === 'A' ? videoBRef : videoARef
        if (otherRef.current) {
          otherRef.current.currentTime = time
        }
      }
    }
  }

  const handleVolumeChange = (video: 'A' | 'B', volume: number) => {
    const videoRef = video === 'A' ? videoARef : videoBRef
    const setVolume = video === 'A' ? setVolumeA : setVolumeB
    if (videoRef.current) {
      videoRef.current.volume = volume
      setVolume(volume)
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (videoARef.current) videoARef.current.playbackRate = speed
    if (videoBRef.current) videoBRef.current.playbackRate = speed
  }

  const handleRestart = () => {
    if (videoARef.current) videoARef.current.currentTime = 0
    if (videoBRef.current) videoBRef.current.currentTime = 0
  }

  const toggleSync = () => {
    setSyncMode(!syncMode)
  }

  const getVideoSizeClass = () => {
    switch (videoSize) {
      case 'small': return 'w-full max-w-sm'
      case 'large': return 'w-full max-w-3xl'
      default: return 'w-full max-w-xl'
    }
  }

  const handleSubmit = async () => {
    // Check if all dimensions are rated
    const missingDimensions = dimensions.filter(dim => !responses[dim])
    if (missingDimensions.length > 0) {
      toast({
        title: 'Incomplete Evaluation',
        description: 'Please rate all dimensions before submitting',
        variant: 'destructive'
      })
      return
    }

    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setSubmitting(true)
    
    try {
      const dimensionScores: Record<string, string> = {}
      const detailedRatings: Record<string, string> = {}
      
      Object.entries(responses).forEach(([dimension, value]) => {
        if (value.includes('A')) {
          dimensionScores[dimension] = 'A'
        } else if (value.includes('B')) {
          dimensionScores[dimension] = 'B'
        } else {
          dimensionScores[dimension] = 'Equal'
        }
        detailedRatings[dimension] = value
      })

      // Get participant info if this is a Prolific session
      const participantId = sessionStorage.getItem('participant_id')
      const experimentId = sessionStorage.getItem('experiment_id')
      const prolificPid = sessionStorage.getItem('prolific_pid')
      const sessionId = getSessionId()
      
      const submitResponse = await fetch('/api/submit-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comparison_id: actualComparisonId || params.id,
          dimension_scores: dimensionScores,
          detailed_ratings: detailedRatings,
          completion_time_seconds: (Date.now() - startTime) / 1000,
          participant_id: participantId,
          experiment_id: experimentId,
          evaluator_id: prolificPid || 'anonymous',
          session_id: sessionId
        })
      })

      const submitResult = await submitResponse.json()

      toast({
        title: 'Success',
        description: 'Your evaluation has been submitted'
      })

      // Check if there's a next comparison to evaluate
      if (submitResult.next_comparison_id) {
        toast({
          title: 'Next Comparison',
          description: 'Loading the next comparison for evaluation...'
        })
        // Navigate to the next comparison
        router.push(`/evaluate/${submitResult.next_comparison_id}`)
      } else {
        // Check if this is a Prolific session
        const isProlific = sessionStorage.getItem('is_prolific')
        if (isProlific) {
          router.push('/prolific/complete')
        } else {
          router.push('/thank-you')
        }
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit evaluation',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!comparison) {
    return (
      <div className="text-center">
        <p>Comparison not found</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-slate-100">Video Comparison Evaluation</CardTitle>
            {lastSaved && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                {saving ? (
                  <>
                    <Save className="h-4 w-4 animate-pulse text-cyan-400" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                {comparison.scenario_metadata.name || comparison.scenario_id}
              </Badge>
              <span className="text-sm text-slate-400">Scenario</span>
            </div>
            {comparison.scenario_metadata.description && (
              <p className="text-sm text-slate-300 mt-2">
                {comparison.scenario_metadata.description}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          
          {/* Keyboard Shortcuts */}
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 mb-4">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Settings className="h-4 w-4 text-cyan-400" />
                Keyboard Shortcuts & Tips
              </summary>
              <div className="mt-2 text-xs text-slate-300 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><kbd className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-600">Space</kbd> Play/Pause Both</div>
                <div><kbd className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-600">←/→</kbd> Seek ±5s</div>
                <div><kbd className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-600">R</kbd> Restart Videos</div>
                <div><kbd className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-600">S</kbd> Toggle Sync</div>
              </div>
            </details>
          </div>

          {/* Video Controls Header */}
          <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 border border-slate-600/50 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePlayBoth}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {playingA && playingB ? (
                    <>
                      <Pause className="mr-2 h-5 w-5" />
                      Pause Both
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Play Both
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={toggleSync}
                  variant={syncMode ? "default" : "outline"}
                  size="sm"
                >
                  {syncMode ? (
                    <>
                      <Link className="mr-2 h-4 w-4" />
                      Synced
                    </>
                  ) : (
                    <>
                      <Unlink className="mr-2 h-4 w-4" />
                      Independent
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleRestart}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restart
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-slate-200">Speed:</Label>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-slate-200">Size:</Label>
                  <select
                    value={videoSize}
                    onChange={(e) => setVideoSize(e.target.value as 'small' | 'medium' | 'large')}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Video Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Model A */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-600">Model A</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePlayA}
                    size="sm"
                    variant={playingA ? "default" : "outline"}
                  >
                    {playingA ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className={`relative bg-black rounded-lg overflow-hidden mx-auto ${getVideoSizeClass()}`}>
                <div className="relative pt-[56.25%]">
                  <video
                    ref={videoARef}
                    src={comparison.model_a_video_path}
                    className="absolute inset-0 w-full h-full object-contain"
                    loop
                    playsInline
                  />
                
                  {/* Video overlay with time */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {Math.floor(currentTimeA)}s / {Math.floor(durationA)}s
                  </div>
                </div>
              </div>

              {/* Model A Controls */}
              <div className="space-y-3 bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Progress</span>
                    <span className="flex items-center gap-2">
                      {syncMode && (
                        <span className="text-cyan-400 font-medium">🔗 SYNC</span>
                      )}
                      <span>{Math.round((currentTimeA / durationA) * 100) || 0}%</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={durationA || 100}
                    value={currentTimeA}
                    onChange={(e) => handleSeek('A', Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer 
                              focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>

                {/* Volume control */}
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volumeA}
                    onChange={(e) => handleVolumeChange('A', Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
                  />
                  <span className="text-xs text-slate-300 w-8">{Math.round(volumeA * 100)}%</span>
                </div>

                {/* Quick seek buttons */}
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => handleSeek('A', Math.max(0, currentTimeA - 5))}
                    size="sm"
                    variant="outline"
                  >
                    <SkipBack className="h-3 w-3 mr-1" />
                    -5s
                  </Button>
                  <Button
                    onClick={() => handleSeek('A', Math.min(durationA, currentTimeA + 5))}
                    size="sm"
                    variant="outline"
                  >
                    +5s
                    <SkipForward className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Model B */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-purple-600">Model B</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePlayB}
                    size="sm"
                    variant={playingB ? "default" : "outline"}
                  >
                    {playingB ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className={`relative bg-black rounded-lg overflow-hidden mx-auto ${getVideoSizeClass()}`}>
                <div className="relative pt-[56.25%]">
                  <video
                    ref={videoBRef}
                    src={comparison.model_b_video_path}
                    className="absolute inset-0 w-full h-full object-contain"
                    loop
                    playsInline
                  />
                
                  {/* Video overlay with time */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {Math.floor(currentTimeB)}s / {Math.floor(durationB)}s
                  </div>
                </div>
              </div>

              {/* Model B Controls */}
              <div className="space-y-3 bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Progress</span>
                    <span className="flex items-center gap-2">
                      {syncMode && (
                        <span className="text-green-400 font-medium">🔗 SYNC</span>
                      )}
                      <span>{Math.round((currentTimeB / durationB) * 100) || 0}%</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={durationB || 100}
                    value={currentTimeB}
                    onChange={(e) => handleSeek('B', Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer 
                              focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>

                {/* Volume control */}
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volumeB}
                    onChange={(e) => handleVolumeChange('B', Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-400"
                  />
                  <span className="text-xs text-slate-300 w-8">{Math.round(volumeB * 100)}%</span>
                </div>

                {/* Quick seek buttons */}
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => handleSeek('B', Math.max(0, currentTimeB - 5))}
                    size="sm"
                    variant="outline"
                  >
                    <SkipBack className="h-3 w-3 mr-1" />
                    -5s
                  </Button>
                  <Button
                    onClick={() => handleSeek('B', Math.min(durationB, currentTimeB + 5))}
                    size="sm"
                    variant="outline"
                  >
                    +5s
                    <SkipForward className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Form */}
      {dimensions.map((dimension) => (
        <Card key={dimension}>
          <CardHeader>
            <CardTitle>{dimensionInfo[dimension].name}</CardTitle>
            <CardDescription>
              {dimensionInfo[dimension].prompt}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              {dimensionInfo[dimension].description}
            </p>
            
            {dimensionInfo[dimension].sub_questions && (
              <div className="bg-slate-800/50 border border-slate-600/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2 text-slate-200">Consider these aspects:</p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                  {dimensionInfo[dimension].sub_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            <RadioGroup
              value={responses[dimension] || ''}
              onValueChange={(value) => setResponses({ ...responses, [dimension]: value })}
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                  <RadioGroupItem 
                    value="A_much_better" 
                    id={`${dimension}_A_much`}
                    className="border-2 border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                  />
                  <Label htmlFor={`${dimension}_A_much`} className="text-slate-200 font-medium cursor-pointer">Model A is much better</Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                  <RadioGroupItem 
                    value="A_slightly_better" 
                    id={`${dimension}_A_slight`}
                    className="border-2 border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                  />
                  <Label htmlFor={`${dimension}_A_slight`} className="text-slate-200 font-medium cursor-pointer">Model A is slightly better</Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                  <RadioGroupItem 
                    value="Equal" 
                    id={`${dimension}_equal`}
                    className="border-2 border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                  />
                  <Label htmlFor={`${dimension}_equal`} className="text-slate-200 font-medium cursor-pointer">Both are equally good</Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                  <RadioGroupItem 
                    value="B_slightly_better" 
                    id={`${dimension}_B_slight`}
                    className="border-2 border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                  />
                  <Label htmlFor={`${dimension}_B_slight`} className="text-slate-200 font-medium cursor-pointer">Model B is slightly better</Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                  <RadioGroupItem 
                    value="B_much_better" 
                    id={`${dimension}_B_much`}
                    className="border-2 border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                  />
                  <Label htmlFor={`${dimension}_B_much`} className="text-slate-200 font-medium cursor-pointer">Model B is much better</Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      {/* Submit Button */}
      <div className="flex justify-center py-8">
        <Button
          onClick={handleSubmit}
          size="lg"
          disabled={submitting || Object.keys(responses).length < dimensions.length}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Evaluation'
          )}
        </Button>
      </div>
    </div>
  )
}