'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { 
  ExternalLink, 
  RefreshCw, 
  Play, 
  Pause, 
  StopCircle,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface ProlificStudy {
  experimentId: string
  experimentName: string
  prolificStudyId: string
  status?: string
  totalParticipants?: number
  completedSubmissions?: number
  reward?: number
  createdAt?: string
  error?: string
}

interface ProlificManagerProps {
  experiments: Array<{
    id: string
    name: string
    slug: string
    prolificStudyId?: string | null
    comparisons: Array<any>
  }>
  onRefresh?: () => void
}

export function ProlificManager({ experiments, onRefresh }: ProlificManagerProps) {
  const [studies, setStudies] = useState<ProlificStudy[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState<string>('')
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    reward: 8.00,
    totalParticipants: 50
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchStudies()
  }, [])

  const fetchStudies = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/prolific/studies')
      if (!response.ok) throw new Error('Failed to fetch studies')
      
      const data = await response.json()
      setStudies(data.studies || [])
    } catch (error) {
      console.error('Error fetching Prolific studies:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch Prolific studies',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchStudies()
    if (onRefresh) onRefresh()
    setIsRefreshing(false)
  }

  const createStudy = async () => {
    if (!selectedExperiment || !createForm.title) {
      toast({
        title: 'Validation Error',
        description: 'Please select an experiment and provide a title',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/prolific/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentId: selectedExperiment,
          ...createForm
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

      setShowCreateDialog(false)
      setCreateForm({
        title: '',
        description: '',
        reward: 8.00,
        totalParticipants: 50
      })
      setSelectedExperiment('')
      
      await fetchStudies()
      if (onRefresh) onRefresh()
      
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

  const updateStudyStatus = async (studyId: string, action: 'publish' | 'pause' | 'stop') => {
    try {
      const response = await fetch(`/api/prolific/studies/${studyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action} study`)
      }

      toast({
        title: 'Study Updated',
        description: `Study ${action}ed successfully`,
      })

      await fetchStudies()
      
    } catch (error: any) {
      console.error(`Error ${action}ing study:`, error)
      toast({
        title: 'Update Failed',
        description: error.message || `Failed to ${action} study`,
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>
    
    const statusMap: Record<string, { variant: any; label: string }> = {
      UNPUBLISHED: { variant: 'secondary', label: 'Draft' },
      ACTIVE: { variant: 'default', label: 'Active' },
      PAUSED: { variant: 'outline', label: 'Paused' },
      COMPLETED: { variant: 'secondary', label: 'Completed' },
      AWAITING_REVIEW: { variant: 'default', label: 'In Review' }
    }
    
    const config = statusMap[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const availableExperiments = experiments.filter(exp => !exp.prolificStudyId)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prolific Studies</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            disabled={availableExperiments.length === 0}
          >
            Create Study
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : studies.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Prolific Studies</h3>
          <p className="text-gray-500 mb-4">
            Create a Prolific study to start collecting human evaluations
          </p>
          {availableExperiments.length > 0 && (
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Your First Study
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {studies.map((study) => (
            <div
              key={study.prolificStudyId}
              className="border rounded-lg p-4 space-y-3"
            >
              {study.error ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{study.error}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{study.experimentName}</h3>
                      <p className="text-sm text-gray-500">
                        Prolific ID: {study.prolificStudyId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(study.status)}
                      <a
                        href={`https://app.prolific.co/researcher/studies/${study.prolificStudyId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Participants</p>
                      <p className="font-medium">
                        {study.completedSubmissions || 0} / {study.totalParticipants || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Reward</p>
                      <p className="font-medium">
                        ${study.reward?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${((study.completedSubmissions || 0) / (study.totalParticipants || 1)) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-xs">
                          {Math.round(((study.completedSubmissions || 0) / (study.totalParticipants || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {study.status === 'UNPUBLISHED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStudyStatus(study.prolificStudyId, 'publish')}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Publish
                        </Button>
                      )}
                      {study.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStudyStatus(study.prolificStudyId, 'pause')}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      {study.status === 'PAUSED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStudyStatus(study.prolificStudyId, 'publish')}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Study Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Prolific Study</DialogTitle>
            <DialogDescription>
              Launch a new study on Prolific to collect human evaluations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Experiment</Label>
              <select
                value={selectedExperiment}
                onChange={(e) => {
                  setSelectedExperiment(e.target.value)
                  const exp = experiments.find(experiment => experiment.id === e.target.value)
                  if (exp) {
                    setCreateForm(prev => ({
                      ...prev,
                      title: `Evaluate ${exp.name}`,
                      description: `Help us evaluate AI model outputs for ${exp.name}`
                    }))
                  }
                }}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Select an experiment</option>
                {availableExperiments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} ({exp.comparisons.length} comparisons)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Study Title</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Evaluate AI Video Generation Models"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
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
                  value={createForm.reward}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, reward: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={createForm.totalParticipants}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, totalParticipants: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            {selectedExperiment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-900">
                  <strong>Estimated time:</strong> ~{Math.ceil(
                    (experiments.find(e => e.id === selectedExperiment)?.comparisons.length || 0) * 2
                  )} minutes
                </p>
                <p className="text-blue-700 mt-1">
                  <strong>Total cost:</strong> ${(createForm.reward * createForm.totalParticipants).toFixed(2)} 
                  (+ Prolific fees)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={createStudy}
              disabled={isCreating || !selectedExperiment || !createForm.title}
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
    </div>
  )
}