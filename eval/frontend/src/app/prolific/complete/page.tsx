'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Copy } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ProlificCompletePage() {
  const [completionCode, setCompletionCode] = useState<string>('')
  const [redirecting, setRedirecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Get completion code from session storage
    const participantId = sessionStorage.getItem('participant_id')
    
    if (participantId) {
      // Fetch participant data to get completion code
      fetchCompletionCode(participantId)
    }
  }, [])

  const fetchCompletionCode = async (participantId: string) => {
    try {
      const response = await fetch(`/api/prolific/completion-code?participantId=${participantId}`)
      if (response.ok) {
        const data = await response.json()
        setCompletionCode(data.completionCode)
      }
    } catch (error) {
      console.error('Error fetching completion code:', error)
    }
  }

  const handleCopyCode = () => {
    if (completionCode) {
      navigator.clipboard.writeText(completionCode)
      toast({
        title: 'Copied!',
        description: 'Completion code copied to clipboard'
      })
    }
  }

  const handleRedirectToProlific = () => {
    if (completionCode) {
      setRedirecting(true)
      // Redirect to Prolific with the completion code
      window.location.href = `https://app.prolific.com/submissions/complete?cc=${completionCode}`
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-20">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Study Completed Successfully!
          </CardTitle>
          <CardDescription>
            Thank you for participating in our study
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-lg">
              Your responses have been recorded successfully.
            </p>
            
            {completionCode && (
              <>
                <div className="bg-secondary p-6 rounded-lg space-y-4">
                  <p className="font-semibold">Your Completion Code:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-2xl font-mono bg-background px-4 py-2 rounded border">
                      {completionCode}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCode}
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Click the button below to return to Prolific and submit your completion code:
                  </p>
                  
                  <Button
                    size="lg"
                    onClick={handleRedirectToProlific}
                    disabled={redirecting}
                    className="w-full sm:w-auto"
                  >
                    {redirecting ? 'Redirecting...' : 'Return to Prolific'}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground mt-6">
                  <p>If the button doesn&apos;t work, you can manually submit your code on Prolific.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}