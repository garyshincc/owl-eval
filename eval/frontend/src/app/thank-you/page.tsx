'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function ThankYouPage() {
  const [isProlific, setIsProlific] = useState(false)
  const [completionCode, setCompletionCode] = useState<string | null>(null)

  useEffect(() => {
    // Check if this is a Prolific session by checking if we don't have an anon session ID
    const anonSessionId = sessionStorage.getItem('anon_session_id')
    const code = sessionStorage.getItem('completion_code')
    
    setIsProlific(!anonSessionId) // If no anon session ID, it's Prolific
    setCompletionCode(code)
  }, [])

  const handleProlificComplete = () => {
    // Redirect to Prolific with completion code
    if (completionCode) {
      window.location.href = `https://app.prolific.co/submissions/complete?cc=${completionCode}`
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4 text-slate-100">Thank You!</h1>
          <p className="text-lg text-slate-300 mb-6">
            Your evaluation has been successfully submitted.
          </p>
          <p className="mb-8 text-slate-200 leading-relaxed">
            Thank you for participating in the World Model Evaluation study. 
            Your feedback is invaluable in helping us improve AI-generated world models.
          </p>
          
          {isProlific ? (
            <div className="space-y-4">
              {completionCode && (
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-300 mb-2">Your completion code:</p>
                  <code className="bg-slate-700 border border-slate-600 px-3 py-2 rounded text-cyan-300 font-mono text-lg">
                    {completionCode}
                  </code>
                </div>
              )}
              <Button size="lg" onClick={handleProlificComplete} className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">
                Return to Prolific
              </Button>
            </div>
          ) : (
            <Link href="/">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">
                Do another evaluation
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}