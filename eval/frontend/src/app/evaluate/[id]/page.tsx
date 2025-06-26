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
  CheckCircle,
  Star
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

interface VideoTask {
  video_task_id: string
  scenario_id: string
  scenario_metadata: {
    name: string
    description: string
  }
  model_name: string
  video_path: string
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
  const [videoTask, setVideoTask] = useState<VideoTask | null>(null)
  const [evaluationMode, setEvaluationMode] = useState<'comparison' | 'single_video'>('comparison')
  const [actualComparisonId, setActualComparisonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [responses, setResponses] = useState<Record<string, string | number>>({})
  const [startTime] = useState(Date.now())
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate or retrieve session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('anon_session_id')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
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
  const [videoLoadedA, setVideoLoadedA] = useState(false)
  const [videoLoadedB, setVideoLoadedB] = useState(false)

  const fetchComparison = useCallback(async () => {
    try {
      // First try to fetch as comparison ID
      let response = await fetch(`/api/comparisons/${params.id}`)

      if (!response.ok && response.status === 404) {
        // Not a comparison, try as video task ID
        const videoResponse = await fetch(`/api/video-tasks/${params.id}`)
        if (videoResponse.ok) {
          // It's a video task - handle as single video evaluation
          const videoData = await videoResponse.json()
          setVideoTask(videoData)
          setEvaluationMode('single_video')
          
          // Load any existing draft for single video
          const participantId = sessionStorage.getItem('participant_id') || 'anonymous'
          const sessionId = getSessionId()
          const draftResponse = await fetch(`/api/single-video-evaluations/draft?videoTaskId=${videoData.video_task_id}&participantId=${participantId}&sessionId=${sessionId}`)
          
          if (draftResponse.ok) {
            const draftData = await draftResponse.json()
            if (draftData.draft) {
              if (draftData.draft.status === 'completed') {
                toast({
                  title: 'Already Completed',
                  description: 'You have already submitted an evaluation for this video',
                  variant: 'destructive'
                })
                router.push('/thank-you')
                return
              }
              
              if (draftData.draft.status === 'draft') {
                const savedResponses = draftData.draft.dimensionScores || {}
                setResponses(savedResponses)
                setLastSaved(new Date(draftData.draft.lastSavedAt))
                
                toast({
                  title: 'Draft Loaded',
                  description: 'Your previous progress has been restored',
                })
              }
            }
          }
          setLoading(false)
          return
        }

        // If not found, try as experiment slug to get a random comparison
        const experimentsResponse = await fetch(`/api/experiments`)
        if (experimentsResponse.ok) {
          const experiments = await experimentsResponse.json()
          const experiment = experiments.find((exp: any) => exp.slug === params.id)

          if (experiment) {
            if (experiment.evaluationMode === 'single_video') {
              // Get first video task for this experiment
              const videoTasksResponse = await fetch(`/api/video-tasks?experimentId=${experiment.id}`)
              if (videoTasksResponse.ok) {
                const videoTasks = await videoTasksResponse.json()
                if (videoTasks.length > 0) {
                  // Redirect to unified URL with first video task ID
                  router.push(`/evaluate/${videoTasks[0].id}`)
                  return
                }
              }
            } else if (experiment._count.comparisons > 0) {
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
  }, [params.id, toast, getSessionId, actualComparisonId, router])

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    if ((!comparison && !videoTask) || Object.keys(responses).length === 0 || submitting) {
      console.log('Skipping save: no content, responses, or currently submitting', {
        comparison: !!comparison,
        videoTask: !!videoTask,
        responsesCount: Object.keys(responses).length,
        submitting
      })
      return
    }

    console.log('Starting draft save...', { responses, evaluationMode })
    setSaving(true)
    try {
      const participantId = sessionStorage.getItem('participant_id') || 'anonymous'
      const experimentId = sessionStorage.getItem('experiment_id')
      const prolificPid = sessionStorage.getItem('prolific_pid')
      const sessionId = getSessionId()

      if (evaluationMode === 'single_video') {
        // Save single video evaluation draft
        const response = await fetch('/api/single-video-evaluations/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoTaskId: videoTask?.video_task_id,
            participantId,
            experimentId,
            prolificPid,
            dimensionScores: responses,
            completionTimeSeconds: (Date.now() - startTime) / 1000,
            clientMetadata: {
              userAgent: navigator.userAgent,
              sessionId,
            },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setLastSaved(new Date(data.lastSavedAt))
          console.log('✓ Single video draft saved successfully')
        }
        return
      }

      // Handle comparison evaluation draft save
      const dimensionScores: Record<string, string> = {}
      Object.entries(responses).forEach(([dimension, value]) => {
        if (typeof value === 'string') {
          if (value.includes('A')) {
            dimensionScores[dimension] = 'A'
          } else if (value.includes('B')) {
            dimensionScores[dimension] = 'B'
          } else {
            dimensionScores[dimension] = 'Equal'
          }
        }
      })

      console.log('Saving comparison draft with data:', {
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
  }, [comparison, videoTask, evaluationMode, responses, actualComparisonId, params.id, startTime, getSessionId, toast, router, submitting])

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

  // Force loading state to false after videos should have loaded
  useEffect(() => {
    if (comparison || videoTask) {
      const timer = setTimeout(() => {
        console.log('Forcing video loaded states to true')
        setVideoLoadedA(true)
        if (comparison) setVideoLoadedB(true) // Only set B for comparison mode
      }, 3000) // 3 seconds should be enough for videos to load

      return () => clearTimeout(timer)
    }
  }, [comparison, videoTask])

  // Set up video event listeners for Video A
  useEffect(() => {
    const videoA = videoARef.current
    if (!videoA || (!comparison && !videoTask)) return

    const handlePlayA = () => {
      console.log('Video A started playing')
      setPlayingA(true)
    }

    const handlePauseA = () => {
      console.log('Video A paused')
      setPlayingA(false)
    }

    const handleTimeUpdateA = () => {
      console.log('Time update A:', videoA.currentTime)
      setCurrentTimeA(videoA.currentTime)
    }

    const handleLoadedMetadataA = () => {
      console.log('Video A metadata loaded, duration:', videoA.duration)
      setDurationA(videoA.duration)
      // Set initial playback speed
      videoA.playbackRate = playbackSpeed
      videoA.volume = volumeA
    }

    const handleLoadedDataA = () => {
      console.log('Video A data loaded')
      setVideoLoadedA(true)
      // Ensure playback settings are applied
      videoA.playbackRate = playbackSpeed
      videoA.volume = volumeA
    }

    const handleCanPlayA = () => {
      console.log('Video A can play')
      setVideoLoadedA(true)
    }

    const handleErrorA = (e: Event) => {
      console.error('Video A error:', e)
    }

    // Add all event listeners
    console.log('Adding event listeners to video A:', videoA.src)
    videoA.addEventListener('play', handlePlayA)
    videoA.addEventListener('pause', handlePauseA)
    videoA.addEventListener('timeupdate', handleTimeUpdateA)
    videoA.addEventListener('loadedmetadata', handleLoadedMetadataA)
    videoA.addEventListener('loadeddata', handleLoadedDataA)
    videoA.addEventListener('canplay', handleCanPlayA)
    videoA.addEventListener('error', handleErrorA)

    // Apply initial settings if video is already loaded
    if (videoA.readyState >= 1) {
      setDurationA(videoA.duration)
      setVideoLoadedA(true)
      videoA.playbackRate = playbackSpeed
      videoA.volume = volumeA
    }

    return () => {
      videoA.removeEventListener('play', handlePlayA)
      videoA.removeEventListener('pause', handlePauseA)
      videoA.removeEventListener('timeupdate', handleTimeUpdateA)
      videoA.removeEventListener('loadedmetadata', handleLoadedMetadataA)
      videoA.removeEventListener('loadeddata', handleLoadedDataA)
      videoA.removeEventListener('canplay', handleCanPlayA)
      videoA.removeEventListener('error', handleErrorA)
    }
  }, [comparison, videoTask, playbackSpeed, volumeA])


  // Set up video event listeners for Video B
  useEffect(() => {
    const videoB = videoBRef.current
    if (!videoB || !comparison) return

    const handlePlayB = () => {
      console.log('Video B started playing')
      setPlayingB(true)
    }

    const handlePauseB = () => {
      console.log('Video B paused')
      setPlayingB(false)
    }

    const handleTimeUpdateB = () => {
      setCurrentTimeB(videoB.currentTime)
    }

    const handleLoadedMetadataB = () => {
      console.log('Video B metadata loaded, duration:', videoB.duration)
      setDurationB(videoB.duration)
      // Set initial playback speed
      videoB.playbackRate = playbackSpeed
      videoB.volume = volumeB
    }

    const handleLoadedDataB = () => {
      console.log('Video B data loaded')
      setVideoLoadedB(true)
      // Ensure playback settings are applied
      videoB.playbackRate = playbackSpeed
      videoB.volume = volumeB
    }

    const handleCanPlayB = () => {
      console.log('Video B can play')
      setVideoLoadedB(true)
    }

    const handleErrorB = (e: Event) => {
      console.error('Video B error:', e)
    }

    // Add all event listeners
    videoB.addEventListener('play', handlePlayB)
    videoB.addEventListener('pause', handlePauseB)
    videoB.addEventListener('timeupdate', handleTimeUpdateB)
    videoB.addEventListener('loadedmetadata', handleLoadedMetadataB)
    videoB.addEventListener('loadeddata', handleLoadedDataB)
    videoB.addEventListener('canplay', handleCanPlayB)
    videoB.addEventListener('error', handleErrorB)

    // Apply initial settings if video is already loaded
    if (videoB.readyState >= 1) {
      setDurationB(videoB.duration)
      setVideoLoadedB(true)
      videoB.playbackRate = playbackSpeed
      videoB.volume = volumeB
    }

    return () => {
      videoB.removeEventListener('play', handlePlayB)
      videoB.removeEventListener('pause', handlePauseB)
      videoB.removeEventListener('timeupdate', handleTimeUpdateB)
      videoB.removeEventListener('loadedmetadata', handleLoadedMetadataB)
      videoB.removeEventListener('loadeddata', handleLoadedDataB)
      videoB.removeEventListener('canplay', handleCanPlayB)
      videoB.removeEventListener('error', handleErrorB)
    }
  }, [comparison, playbackSpeed, volumeB])

  // Video control functions
  const handlePlayA = async () => {
    if (videoARef.current) {
      if (playingA) {
        videoARef.current.pause()
      } else {
        try {
          await videoARef.current.play()
          if (syncMode && videoBRef.current && !playingB) {
            try {
              await videoBRef.current.play()
            } catch (e) {
              console.error('Error playing video B in sync:', e)
            }
          }
        } catch (error) {
          console.error('Error playing video A:', error)
        }
      }
    }
  }

  const handlePlayB = async () => {
    if (videoBRef.current) {
      if (playingB) {
        videoBRef.current.pause()
      } else {
        try {
          await videoBRef.current.play()
          if (syncMode && videoARef.current && !playingA) {
            try {
              await videoARef.current.play()
            } catch (e) {
              console.error('Error playing video A in sync:', e)
            }
          }
        } catch (error) {
          console.error('Error playing video B:', error)
        }
      }
    }
  }

  const handlePlayBoth = async () => {
    if (videoARef.current && videoBRef.current) {
      const bothPlaying = playingA && playingB;
      if (bothPlaying) {
        videoARef.current.pause();
        videoBRef.current.pause();
      } else {
        try {
          if (syncMode) {
            const avgTime = (currentTimeA + currentTimeB) / 2;
            videoARef.current.currentTime = avgTime;
            videoBRef.current.currentTime = avgTime;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          await Promise.all([videoARef.current.play(), videoBRef.current.play()]);
        } catch (error) {
          console.error('Error playing videos:', error);
          try {
            await videoARef.current.play();
          } catch (e) {
            console.error('Error playing video A:', e);
          }
          try {
            await videoBRef.current.play();
          } catch (e) {
            console.error('Error playing video B:', e);
          }
        }
      }
    }
  }

  const handleSeek = (video: 'A' | 'B', time: number) => {
    const videoRef = video === 'A' ? videoARef : videoBRef;
    if (videoRef.current) {
      const clampedTime = Math.max(0, Math.min(time, videoRef.current.duration || 0));
      videoRef.current.currentTime = clampedTime;
      
      // Immediately update the state to sync the progress bar
      if (video === 'A') {
        setCurrentTimeA(clampedTime);
      } else {
        setCurrentTimeB(clampedTime);
      }
      
      // Handle sync mode for comparison videos
      if (syncMode && comparison) {
        const otherRef = video === 'A' ? videoBRef : videoARef;
        if (otherRef.current) {
          otherRef.current.currentTime = clampedTime;
          if (video === 'A') {
            setCurrentTimeB(clampedTime);
          } else {
            setCurrentTimeA(clampedTime);
          }
        }
      }
    }
  };

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

    // Apply to both videos
    if (videoARef.current) {
      videoARef.current.playbackRate = speed
      console.log(`Set Video A playback rate to ${speed}`)
    }
    if (videoBRef.current) {
      videoBRef.current.playbackRate = speed
      console.log(`Set Video B playback rate to ${speed}`)
    }
  }

  const handleRestart = () => {
    if (videoARef.current) {
      videoARef.current.currentTime = 0
      setCurrentTimeA(0)
    }
    if (videoBRef.current) {
      videoBRef.current.currentTime = 0
      setCurrentTimeB(0)
    }
    console.log('Videos restarted')
  }

  const toggleSync = () => {
    setSyncMode(!syncMode)
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = (current: number, duration: number) => {
    if (!duration || duration === 0) return 0
    return Math.round((current / duration) * 100)
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

    // For single video mode, validate that all ratings are valid integers between 1-5
    if (evaluationMode === 'single_video') {
      const invalidRatings = dimensions.filter(dim => {
        const rating = responses[dim]
        return !rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)
      })
      if (invalidRatings.length > 0) {
        toast({
          title: 'Invalid Ratings',
          description: 'All ratings must be between 1 and 5',
          variant: 'destructive'
        })
        return
      }
    }

    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setSubmitting(true)

    try {
      // Get participant info if this is a Prolific session
      const participantId = sessionStorage.getItem('participant_id') || 'anonymous'
      const experimentId = sessionStorage.getItem('experiment_id')
      const prolificPid = sessionStorage.getItem('prolific_pid')
      const sessionId = getSessionId()

      let submitResponse, submitResult

      if (evaluationMode === 'single_video') {
        // Debug the payload before sending
        const payload = {
          video_task_id: videoTask?.video_task_id,
          dimension_scores: responses,
          completion_time_seconds: (Date.now() - startTime) / 1000,
          participant_id: participantId,
          experiment_id: experimentId,
          evaluator_id: prolificPid || 'anonymous',
          session_id: sessionId
        };
        
        console.log('Single video evaluation payload:', payload);
        console.log('VideoTask object:', videoTask);
        console.log('Responses object:', responses);
        
        // Handle single video evaluation submission
        submitResponse = await fetch('/api/submit-single-video-evaluation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        submitResult = await submitResponse.json()
        
        if (!submitResponse.ok) {
          console.error('Single video submission failed:', submitResult);
          toast({
            title: 'Submission Failed',
            description: submitResult.error || 'Failed to submit evaluation',
            variant: 'destructive'
          });
          return;
        }

        toast({
          title: 'Success',
          description: 'Your evaluation has been submitted'
        })

        // Check if there's a next video task to evaluate
        if (submitResult.next_video_task_id) {
          toast({
            title: 'Next Video',
            description: 'Loading the next video for evaluation...'
          })
          router.push(`/evaluate/${submitResult.next_video_task_id}`)
        } else {
          // Check if this is a Prolific session
          const isProlific = sessionStorage.getItem('is_prolific')
          if (isProlific) {
            router.push('/prolific/complete')
          } else {
            router.push('/thank-you')
          }
        }
      } else {
        // Handle comparison evaluation submission
        const dimensionScores: Record<string, string> = {}
        const detailedRatings: Record<string, string> = {}

        Object.entries(responses).forEach(([dimension, value]) => {
          if (typeof value === 'string') {
            if (value.includes('A')) {
              dimensionScores[dimension] = 'A'
            } else if (value.includes('B')) {
              dimensionScores[dimension] = 'B'
            } else {
              dimensionScores[dimension] = 'Equal'
            }
            detailedRatings[dimension] = value
          }
        })

        submitResponse = await fetch('/api/submit-evaluation', {
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

        submitResult = await submitResponse.json()

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

  if (!comparison && !videoTask) {
    return (
      <div className="text-center">
        <p>{evaluationMode === 'single_video' ? 'Video task not found' : 'Comparison not found'}</p>
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
            <CardTitle className="text-2xl text-slate-100">
              {evaluationMode === 'single_video' ? 'Single Video Evaluation' : 'Video Comparison Evaluation'}
            </CardTitle>
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
                {evaluationMode === 'single_video' 
                  ? (videoTask?.scenario_metadata.name || videoTask?.scenario_id)
                  : (comparison?.scenario_metadata.name || comparison?.scenario_id)
                }
              </Badge>
              {evaluationMode === 'single_video' && (
                <>
                  <Badge variant="outline" className="text-sm">
                    {videoTask?.model_name}
                  </Badge>
                  <span className="text-sm text-slate-400">Model</span>
                </>
              )}
              {evaluationMode === 'comparison' && (
                <span className="text-sm text-slate-400">Scenario</span>
              )}
            </div>
            {evaluationMode === 'single_video' && videoTask?.scenario_metadata.description && (
              <p className="text-sm text-slate-300 mt-2">
                {videoTask.scenario_metadata.description}
              </p>
            )}
            {evaluationMode === 'comparison' && comparison?.scenario_metadata.description && (
              <p className="text-sm text-slate-300 mt-2">
                {comparison?.scenario_metadata.description}
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
                {evaluationMode === 'single_video' ? (
                  // Single video controls
                  <>
                    <Button
                      onClick={async () => {
                        const video = videoARef.current;
                        if (video) {
                          try {
                            if (video.paused) {
                              await video.play();
                              setPlayingA(true);
                            } else {
                              video.pause();
                              setPlayingA(false);
                            }
                          } catch (error) {
                            console.error('Error controlling video:', error);
                          }
                        }
                      }}
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {playingA ? (
                        <>
                          <Pause className="mr-2 h-5 w-5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Play
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleSeek('A', 0)}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart
                    </Button>
                  </>
                ) : (
                  // Comparison mode controls
                  <>
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
                  </>
                )}
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
          {evaluationMode === 'comparison' ? (
            // Comparison mode: Two videos side by side
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
                    src={comparison?.model_a_video_path}
                    className="absolute inset-0 w-full h-full object-contain"
                    loop
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                  />

                  {/* Loading indicator */}
                  {!videoLoadedA && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="flex items-center gap-2 text-white">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-sm">Loading Video A...</span>
                      </div>
                    </div>
                  )}

                  {/* Video overlay with time */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                    {formatTime(currentTimeA)} / {formatTime(durationA)}
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
                      <span>{getProgress(currentTimeA, durationA)}%</span>
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
                    src={comparison?.model_b_video_path}
                    className="absolute inset-0 w-full h-full object-contain"
                    loop
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                  />

                  {/* Loading indicator */}
                  {!videoLoadedB && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="flex items-center gap-2 text-white">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-sm">Loading Video B...</span>
                      </div>
                    </div>
                  )}

                  {/* Video overlay with time */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                    {formatTime(currentTimeB)} / {formatTime(durationB)}
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
                      <span>{getProgress(currentTimeB, durationB)}%</span>
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
          ) : (
            // Single video mode: One centered video
            <div className="flex justify-center mb-6">
              <div className={`relative bg-black rounded-lg overflow-hidden ${videoSize === 'large' ? 'w-full max-w-6xl' : videoSize === 'medium' ? 'w-full max-w-4xl' : 'w-full max-w-2xl'}`}>
                <div className="relative pt-[56.25%]">
                  <video
                    ref={videoARef}
                    src={videoTask?.video_path}
                    className="absolute inset-0 w-full h-full object-contain"
                    loop
                    playsInline
                    preload="metadata"
                  />
                
                  {/* Video overlay with time */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {Math.floor(currentTimeA)}s / {Math.floor(durationA)}s
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Single Video Controls (only for single video mode) */}
          {evaluationMode === 'single_video' && (
            <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 mb-6">
              {/* Progress bar */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Progress</span>
                    <span>{Math.round((currentTimeA / durationA) * 100) || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={durationA || 100}
                    value={currentTimeA}
                    onChange={(e) => handleSeek('A', Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer 
                              focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg"
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
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400"
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
          )}
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

            {evaluationMode === 'single_video' ? (
              // Star Rating Interface for single video
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200">Rating:</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setResponses({ ...responses, [dimension]: rating })}
                        className={`p-1 rounded-full transition-colors ${
                          responses[dimension] && typeof responses[dimension] === 'number' && responses[dimension] >= rating
                            ? 'text-yellow-400 hover:text-yellow-300'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        <Star 
                          className={`h-8 w-8 ${
                            responses[dimension] && typeof responses[dimension] === 'number' && responses[dimension] >= rating 
                              ? 'fill-current' 
                              : ''
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Rating Labels */}
                <div className="flex justify-between text-xs text-slate-400 px-1">
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Good</span>
                  <span>Very Good</span>
                  <span>Excellent</span>
                </div>
                
                {/* Current Rating Display */}
                {responses[dimension] && (
                  <div className="text-center">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
                      {responses[dimension]} - {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][responses[dimension] as number]}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              // Radio buttons for comparison
              <RadioGroup
                value={responses[dimension] as string || ''}
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
            )}
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
