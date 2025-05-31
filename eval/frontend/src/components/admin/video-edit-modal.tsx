'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScenarioSelector } from '@/components/scenario-selector'
import { toast } from '@/components/ui/use-toast'
import { 
  X, 
  Plus,
  Tag,
  Save,
  Loader2
} from 'lucide-react'

interface Video {
  id: string
  key: string
  name: string
  url: string
  size: number
  duration?: number
  tags: string[]
  groups: string[]
  modelName?: string
  scenarioId?: string
  uploadedAt: Date
  metadata?: any
}

interface VideoEditModalProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (videoId: string, updates: Partial<Video>) => Promise<void>
  allTags: string[]
  allGroups: string[]
}

export function VideoEditModal({ 
  video, 
  open, 
  onOpenChange, 
  onSave, 
  allTags, 
  allGroups 
}: VideoEditModalProps) {
  const [formData, setFormData] = useState<Partial<Video>>({})
  const [newTag, setNewTag] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (video) {
      setFormData({
        tags: video.tags || [],
        groups: video.groups || [],
        modelName: video.modelName || '',
        scenarioId: video.scenarioId || ''
      })
    }
  }, [video])

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), trimmedTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const addGroup = (group: string) => {
    const trimmedGroup = group.trim()
    if (trimmedGroup && !formData.groups?.includes(trimmedGroup)) {
      setFormData(prev => ({
        ...prev,
        groups: [...(prev.groups || []), trimmedGroup]
      }))
      setNewGroup('')
    }
  }

  const removeGroup = (groupToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups?.filter(group => group !== groupToRemove) || []
    }))
  }

  const handleSave = async () => {
    if (!video) return
    
    setSaving(true)
    try {
      await onSave(video.id, formData)
      toast({
        title: 'Video updated',
        description: 'Video metadata has been saved successfully',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Save failed',
        description: 'Failed to update video metadata',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!video) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video Metadata</DialogTitle>
          <DialogDescription>
            Update tags, groups, and other metadata for {video.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="model-name">Model Name</Label>
            <Input
              id="model-name"
              placeholder="e.g., diamond-1b, genie-2b"
              value={formData.modelName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Specify which model generated this video
            </p>
          </div>

          {/* Scenario */}
          <div className="space-y-2">
            <Label>Associated Scenario</Label>
            <ScenarioSelector
              value={formData.scenarioId || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, scenarioId: value }))}
              placeholder="Select scenario (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Link this video to a specific evaluation scenario
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            
            {/* Current Tags */}
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="pr-1">
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>

            {/* Add New Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(newTag)
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTag(newTag)}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggested Tags */}
            {allTags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Existing tags:</p>
                <div className="flex flex-wrap gap-1">
                  {allTags
                    .filter(tag => !formData.tags?.includes(tag))
                    .slice(0, 10)
                    .map(tag => (
                    <Button
                      key={tag}
                      variant="ghost"
                      size="sm"
                      onClick={() => addTag(tag)}
                      className="text-xs h-6 px-2"
                    >
                      + {tag}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Groups */}
          <div className="space-y-3">
            <Label>Groups</Label>
            
            {/* Current Groups */}
            <div className="flex flex-wrap gap-2">
              {formData.groups?.map(group => (
                <Badge key={group} variant="outline" className="pr-1">
                  {group}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => removeGroup(group)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>

            {/* Add New Group */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new group..."
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addGroup(newGroup)
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addGroup(newGroup)}
                disabled={!newGroup.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggested Groups */}
            {allGroups.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Existing groups:</p>
                <div className="flex flex-wrap gap-1">
                  {allGroups
                    .filter(group => !formData.groups?.includes(group))
                    .slice(0, 10)
                    .map(group => (
                    <Button
                      key={group}
                      variant="ghost"
                      size="sm"
                      onClick={() => addGroup(group)}
                      className="text-xs h-6 px-2"
                    >
                      + {group}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}