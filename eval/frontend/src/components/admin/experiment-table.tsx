'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ExternalLink, 
  Plus, 
  Search, 
  MoreHorizontal,
  Calendar,
  Users,
  BarChart3,
  Play,
  Pause,
  Archive,
  ArchiveRestore,
  Edit,
  Trash2,
  UserPlus,
  DollarSign,
  RefreshCw
} from 'lucide-react'

interface Experiment {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  archived: boolean
  archivedAt: string | null
  group: string | null
  prolificStudyId: string | null
  config: any
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  _count: {
    comparisons: number
    participants: number
    evaluations: number
  }
}

interface ExperimentTableProps {
  experiments: Experiment[]
  loading?: boolean
  onCreateNew: () => void
  onRefresh?: () => void
  onCreateProlificStudy?: (experimentId: string) => void
}

export function ExperimentTable({ 
  experiments, 
  loading, 
  onCreateNew,
  onRefresh,
  onCreateProlificStudy 
}: ExperimentTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filteredExperiments = experiments.filter(exp => {
    const matchesSearch = searchTerm === '' || 
      exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter
    const matchesGroup = groupFilter === 'all' || exp.group === groupFilter || (!exp.group && groupFilter === 'ungrouped')
    
    return matchesSearch && matchesStatus && matchesGroup
  })

  const uniqueGroups = Array.from(new Set(experiments.map(exp => exp.group).filter(Boolean)))

  const getStatusColor = (status: string, archived: boolean) => {
    if (archived) return 'bg-destructive/10 text-destructive border-destructive/20'
    switch (status) {
      case 'active': return 'bg-secondary/10 text-secondary border-secondary/20'
      case 'completed': return 'bg-primary/10 text-primary border-primary/20'
      case 'paused': return 'bg-accent/10 text-accent border-accent/20'
      case 'draft': return 'bg-muted text-muted-foreground border-border'
      default: return 'bg-destructive/10 text-destructive border-destructive/20'
    }
  }

  const getProgressPercentage = (exp: Experiment) => {
    if (exp._count.comparisons === 0) return 0
    // Use the actual experiment configuration or fallback to 5
    const evaluationsPerComparison = exp.config?.evaluationsPerComparison || 5
    const targetEvaluations = exp._count.comparisons * evaluationsPerComparison
    return Math.min((exp._count.evaluations / targetEvaluations) * 100, 100)
  }

  const getTargetEvaluations = (exp: Experiment) => {
    const evaluationsPerComparison = exp.config?.evaluationsPerComparison || 5
    return exp._count.comparisons * evaluationsPerComparison
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleUpdateStatus = async (experimentId: string, newStatus: string) => {
    setActionLoading(experimentId)
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update experiment status')
      }

      toast({
        title: 'Success',
        description: `Experiment ${newStatus === 'active' ? 'started' : newStatus === 'paused' ? 'paused' : 'updated'} successfully`,
      })

      // Refresh the experiments list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error updating experiment:', error)
      toast({
        title: 'Error',
        description: 'Failed to update experiment status',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteExperiment = async (experimentId: string, experimentName: string) => {
    if (!confirm(`Are you sure you want to delete "${experimentName}"? This action cannot be undone.`)) {
      return
    }

    setActionLoading(experimentId)
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete experiment')
      }

      toast({
        title: 'Success',
        description: 'Experiment deleted successfully',
      })

      // Refresh the experiments list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      console.error('Error deleting experiment:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete experiment',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchiveExperiment = async (experimentId: string) => {
    setActionLoading(experimentId)
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive experiment')
      }

      toast({
        title: 'Success',
        description: 'Experiment archived successfully',
      })

      // Refresh the experiments list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error archiving experiment:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive experiment',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnarchiveExperiment = async (experimentId: string) => {
    setActionLoading(experimentId)
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: false }),
      })

      if (!response.ok) {
        throw new Error('Failed to unarchive experiment')
      }

      toast({
        title: 'Success',
        description: 'Experiment unarchived successfully',
      })

      // Refresh the experiments list
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error unarchiving experiment:', error)
      toast({
        title: 'Error',
        description: 'Failed to unarchive experiment',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSyncProlificData = async (experiment: Experiment) => {
    if (!experiment.prolificStudyId) {
      toast({
        title: 'Error',
        description: 'This experiment is not linked to a Prolific study',
        variant: 'destructive'
      })
      return
    }

    setActionLoading(experiment.id)
    try {
      const response = await fetch('/api/prolific/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studyId: experiment.prolificStudyId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync Prolific data')
      }

      const result = await response.json()

      toast({
        title: 'Sync Complete',
        description: `Synced ${result.syncedParticipants} participants with demographic data`,
      })

      // Refresh the experiments list to show updated counts
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      console.error('Error syncing Prolific data:', error)
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync Prolific data',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Experiments
              <Badge variant="secondary" className="ml-2">
                {experiments.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage and monitor all evaluation experiments
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            )}
            <Button size="sm" onClick={onCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Experiment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search experiments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="sm:w-auto w-full">
                Group: {groupFilter === 'all' ? 'All' : groupFilter === 'ungrouped' ? 'Ungrouped' : groupFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGroupFilter('all')}>
                All Groups
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupFilter('ungrouped')}>
                Ungrouped
              </DropdownMenuItem>
              {uniqueGroups.map((group) => (
                <DropdownMenuItem key={group} onClick={() => setGroupFilter(group!)}>
                  {group}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="sm:w-auto w-full">
                Status: {statusFilter === 'all' ? 'All' : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('paused')}>
                Paused
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('archived')}>
                Archived
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        {filteredExperiments.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExperiments.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{exp.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <code className="bg-muted px-1 rounded text-xs">
                            {exp.slug}
                          </code>
                        </div>
                        {exp.description && (
                          <div className="text-xs text-muted-foreground max-w-md truncate">
                            {exp.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {exp.group ? (
                        <Badge variant="outline" className="text-xs">
                          {exp.group}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getStatusColor(exp.status, exp.archived)}>
                          {exp.archived ? 'archived' : exp.status}
                        </Badge>
                        {exp.prolificStudyId && (
                          <a
                            href={`https://app.prolific.co/researcher/studies/${exp.prolificStudyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            <UserPlus className="h-3 w-3" />
                            Prolific Study
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span>{exp._count.evaluations} evaluations</span>
                          <span>{Math.round(getProgressPercentage(exp))}%</span>
                        </div>
                        <Progress value={getProgressPercentage(exp)} className="h-2" />
                        <div className="text-xs text-gray-500">
                          {exp._count.evaluations}/{getTargetEvaluations(exp)} target
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-sm font-medium">
                          {exp._count.participants}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(exp.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={actionLoading === exp.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => window.open(`/evaluate/${exp.slug}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Evaluation
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          {!exp.prolificStudyId && !exp.archived && (
                            <DropdownMenuItem
                              onClick={() => onCreateProlificStudy?.(exp.id)}
                              disabled={!onCreateProlificStudy}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Launch on Prolific
                            </DropdownMenuItem>
                          )}
                          {exp.prolificStudyId && (
                            <DropdownMenuItem
                              onClick={() => handleSyncProlificData(exp)}
                              disabled={actionLoading === exp.id}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Prolific Data
                            </DropdownMenuItem>
                          )}
                          {exp.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(exp.id, 'paused')}
                              disabled={actionLoading === exp.id}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Experiment
                            </DropdownMenuItem>
                          ) : exp.status === 'draft' || exp.status === 'paused' ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(exp.id, 'active')}
                              disabled={actionLoading === exp.id}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Experiment
                            </DropdownMenuItem>
                          ) : null}
                          {exp.archived ? (
                            <DropdownMenuItem
                              onClick={() => handleUnarchiveExperiment(exp.id)}
                              disabled={actionLoading === exp.id}
                            >
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleArchiveExperiment(exp.id)}
                              disabled={actionLoading === exp.id}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteExperiment(exp.id, exp.name)}
                            disabled={actionLoading === exp.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching experiments' : 'No experiments yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first experiment to get started with evaluations'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Experiment
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}