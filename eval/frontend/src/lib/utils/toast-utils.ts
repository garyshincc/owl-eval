import { toast } from '@/components/ui/use-toast'

// Generic error toast functions
export function showApiError(message: string = 'Failed to fetch data. Please try refreshing.') {
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive'
  })
}

export function showFetchError(resource: string) {
  toast({
    title: 'Error',
    description: `Failed to fetch ${resource} data. Please try refreshing.`,
    variant: 'destructive'
  })
}

export function showOperationError(operation: string, resource?: string) {
  const resourceText = resource ? ` ${resource}` : ''
  toast({
    title: `${operation} failed`,
    description: `Failed to ${operation.toLowerCase()}${resourceText}`,
    variant: 'destructive'
  })
}

export function showValidationError(message: string) {
  toast({
    title: 'Validation Error',
    description: message,
    variant: 'destructive'
  })
}

export function showNoSelectionError(action: string, itemType: string) {
  toast({
    title: `No ${itemType} selected`,
    description: `Please select ${itemType} to ${action}`,
    variant: 'destructive'
  })
}

// Generic success toast functions
export function showUploadSuccess(fileName: string) {
  toast({
    title: 'Upload successful',
    description: `${fileName} uploaded to library`,
  })
}

export function showCreateSuccess(resourceType: string, resourceName: string) {
  toast({
    title: `${resourceType} created`,
    description: `${resourceType} "${resourceName}" created successfully`,
  })
}

export function showUpdateSuccess(resourceType: string) {
  toast({
    title: `${resourceType} updated`,
    description: `${resourceType} has been updated successfully`,
  })
}

export function showDeleteSuccess(count: number, resourceType: string) {
  const plural = count > 1 ? 's' : ''
  toast({
    title: `${resourceType}${plural} deleted`,
    description: `${count} ${resourceType.toLowerCase()}${plural} deleted successfully`,
  })
}

export function showCopySuccess(count: number, itemType: string) {
  toast({
    title: 'Copied',
    description: `${count} ${itemType} copied to clipboard`,
  })
}