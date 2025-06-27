// Experiment Status Management
// Defines status hierarchy and utilities for status management

export enum ExperimentStatus {
  DRAFT = 'draft',
  READY = 'ready', 
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

export enum ProlificStatus {
  UNPUBLISHED = 'UNPUBLISHED',
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED'
}

// Status hierarchy (higher number = more advanced status)
const STATUS_HIERARCHY: Record<string, number> = {
  [ExperimentStatus.DRAFT]: 0,
  [ExperimentStatus.READY]: 1,
  [ExperimentStatus.ACTIVE]: 2,
  [ExperimentStatus.PAUSED]: 2, // Same level as active, just paused
  [ExperimentStatus.COMPLETED]: 3
}

// Prolific to Experiment status mapping
const PROLIFIC_TO_EXPERIMENT_MAP: Record<string, ExperimentStatus> = {
  [ProlificStatus.UNPUBLISHED]: ExperimentStatus.DRAFT,
  [ProlificStatus.DRAFT]: ExperimentStatus.DRAFT,
  [ProlificStatus.ACTIVE]: ExperimentStatus.ACTIVE,
  [ProlificStatus.RUNNING]: ExperimentStatus.ACTIVE,
  [ProlificStatus.PAUSED]: ExperimentStatus.PAUSED,
  [ProlificStatus.COMPLETED]: ExperimentStatus.COMPLETED,
  [ProlificStatus.STOPPED]: ExperimentStatus.PAUSED
}

/**
 * Gets the maximum (most advanced) status between local and Prolific status
 */
export function getMaxStatus(
  localStatus: string, 
  prolificStatus?: string
): ExperimentStatus {
  const localHierarchy = STATUS_HIERARCHY[localStatus] ?? 0
  
  if (!prolificStatus) {
    return localStatus as ExperimentStatus
  }
  
  const mappedProlificStatus = PROLIFIC_TO_EXPERIMENT_MAP[prolificStatus]
  const prolificHierarchy = STATUS_HIERARCHY[mappedProlificStatus] ?? 0
  
  // Return the status with higher hierarchy
  if (localHierarchy >= prolificHierarchy) {
    return localStatus as ExperimentStatus
  } else {
    return mappedProlificStatus
  }
}

/**
 * Determines if experiment status should be updated based on Prolific status
 */
export function shouldUpdateExperimentStatus(
  currentStatus: string,
  prolificStatus: string,
  hasStartedAt: boolean = false
): { 
  shouldUpdate: boolean
  newStatus: ExperimentStatus
  reason: string
} {
  const maxStatus = getMaxStatus(currentStatus, prolificStatus)
  const shouldUpdate = maxStatus !== currentStatus
  
  let reason = ''
  if (shouldUpdate) {
    reason = `Prolific status '${prolificStatus}' maps to '${maxStatus}', upgrading from '${currentStatus}'`
  } else {
    reason = `Local status '${currentStatus}' is already at or above Prolific level '${prolificStatus}'`
  }
  
  // Special case: Set startedAt timestamp when transitioning to active
  if (maxStatus === ExperimentStatus.ACTIVE && !hasStartedAt) {
    reason += ' (will set startedAt timestamp)'
  }
  
  return {
    shouldUpdate,
    newStatus: maxStatus,
    reason
  }
}

/**
 * Gets the display color for a status
 */
export function getStatusColor(status: string, archived: boolean = false): string {
  if (archived) return 'bg-destructive/10 text-destructive border-destructive/20'
  
  switch (status) {
    case ExperimentStatus.READY: 
      return 'bg-green-500/10 text-green-600 border-green-500/20'
    case ExperimentStatus.ACTIVE: 
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case ExperimentStatus.COMPLETED: 
      return 'bg-primary/10 text-primary border-primary/20'
    case ExperimentStatus.PAUSED: 
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    case ExperimentStatus.DRAFT: 
      return 'bg-muted text-muted-foreground border-border'
    default: 
      return 'bg-destructive/10 text-destructive border-destructive/20'
  }
}

/**
 * Checks if an experiment should be visible to non-admin users
 */
export function isVisibleToPublic(status: string): boolean {
  return status === ExperimentStatus.READY || status === ExperimentStatus.ACTIVE
}