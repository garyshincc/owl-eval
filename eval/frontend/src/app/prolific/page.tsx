'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ProlificEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const initializeProlificSession = async () => {
      // Get Prolific parameters from URL
      const prolificPid = searchParams.get('PROLIFIC_PID')
      const studyId = searchParams.get('STUDY_ID')
      const sessionId = searchParams.get('SESSION_ID')
      const isDryRun = searchParams.get('dry_run') === 'true'

      if (!prolificPid || !studyId || !sessionId) {
        toast({
          title: 'Invalid Access',
          description: 'Missing required Prolific parameters. Please access this study through Prolific.',
          variant: 'destructive'
        })
        return
      }

      try {
        // Create or validate participant session
        const response = await fetch('/api/prolific/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prolificPid,
            studyId,
            sessionId,
            isDryRun
          })
        })

        if (!response.ok) {
          throw new Error('Failed to initialize session')
        }

        const data = await response.json()

        // Store session information
        sessionStorage.setItem('is_prolific', 'true')
        sessionStorage.setItem('prolific_pid', prolificPid)
        sessionStorage.setItem('study_id', studyId)
        sessionStorage.setItem('session_id', sessionId)
        sessionStorage.setItem('participant_id', data.participantId)
        sessionStorage.setItem('experiment_id', data.experimentId)

        // Redirect to screening page first
        router.push('/screening')
      } catch (error) {
        console.error('Error initializing Prolific session:', error)
        toast({
          title: 'Session Error',
          description: 'Failed to initialize your session. Please try again or contact support.',
          variant: 'destructive'
        })
      }
    }

    initializeProlificSession()
  }, [searchParams, router, toast])

  return (
    <div className="max-w-2xl mx-auto mt-20">
      <Card>
        <CardHeader>
          <CardTitle>Initializing Your Session</CardTitle>
          <CardDescription>
            Please wait while we set up your study session...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-center text-muted-foreground">
            You will be redirected automatically once your session is ready.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}