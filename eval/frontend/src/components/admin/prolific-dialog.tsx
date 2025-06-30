'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { Loader2, AlertCircle } from 'lucide-react'

interface ProlificDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experiment: {
    id: string
    name: string
    _count?: {
      twoVideoComparisonTasks: number
      singleVideoEvaluationTasks: number
      participants: number
      twoVideoComparisonSubmissions: number
      singleVideoEvaluationSubmissions: number
    }
  } | null
  onSuccess?: () => void
}

export function ProlificDialog({ 
  open, 
  onOpenChange, 
  experiment,
  onSuccess 
}: ProlificDialogProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward: 8.00,
    totalParticipants: 50
  })

  // Update form when experiment changes
  useEffect(() => {
    if (experiment) {
      setForm(prev => ({
        ...prev,
        title: `Evaluate ${experiment.name}`,
        description: `Help us evaluate AI model outputs for ${experiment.name}`
      }))
    }
  }, [experiment])

  const handleCreate = async () => {
    if (!experiment) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/prolific/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentId: experiment.id,
          ...form
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create study')
      }

      const result = await response.json()
      toast({
        title: 'Study Created',
        description: `Prolific study created successfully (ID: ${result.studyId})`,
      })

      onOpenChange(false)
      setForm({
        title: '',
        description: '',
        reward: 8.00,
        totalParticipants: 50
      })
      
      if (onSuccess) onSuccess()
      
    } catch (error: any) {
      console.error('Error creating Prolific study:', error)
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create Prolific study',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  if (!experiment) return null

  const twoVideoTasksCount = experiment._count?.twoVideoComparisonTasks || 0
  const singleVideoTasksCount = experiment._count?.singleVideoEvaluationTasks || 0
  const totalTasksCount = twoVideoTasksCount + singleVideoTasksCount
  const estimatedTime = Math.ceil(twoVideoTasksCount * 2 + singleVideoTasksCount * 1) // 2 min per comparison, 1 min per single video
  const totalCost = form.reward * form.totalParticipants

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Launch on Prolific</DialogTitle>
          <DialogDescription>
            Create a Prolific study for &quot;{experiment.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Study Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Evaluate AI Video Generation Models"
            />
            <p className="text-xs text-gray-500">
              This is what participants will see on Prolific
            </p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what participants will be doing..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reward (USD)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.reward}
                onChange={(e) => setForm(prev => ({ ...prev, reward: parseFloat(e.target.value) }))}
              />
              <p className="text-xs text-gray-500">Per participant</p>
            </div>
            <div className="space-y-2">
              <Label>Participants</Label>
              <Input
                type="number"
                min="1"
                value={form.totalParticipants}
                onChange={(e) => setForm(prev => ({ ...prev, totalParticipants: parseInt(e.target.value) }))}
              />
              <p className="text-xs text-gray-500">Total needed</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-900">Total Tasks:</span>
              <span className="font-medium">{totalTasksCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-900">Estimated time:</span>
              <span className="font-medium">~{estimatedTime} minutes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-900">Total cost:</span>
              <span className="font-medium">${totalCost.toFixed(2)}</span>
            </div>
            <p className="text-xs text-blue-700 flex items-start gap-1 mt-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Additional Prolific platform fees will apply
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !form.title}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Study'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}