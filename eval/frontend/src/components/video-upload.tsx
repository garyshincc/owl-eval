'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/use-toast'

interface VideoUploadProps {
  experimentId: string
  comparisonId: string
  modelLabel: 'modelA' | 'modelB'
  onUploadComplete?: (videoUrl: string) => void
}

export function VideoUpload({ 
  experimentId, 
  comparisonId, 
  modelLabel,
  onUploadComplete 
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a video file',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('video', file)
      formData.append('experimentId', experimentId)
      formData.append('comparisonId', comparisonId)
      formData.append('modelLabel', modelLabel)

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setUploadProgress(Math.round(percentComplete))
        }
      })

      const response = await new Promise<Response>((resolve, reject) => {
        xhr.onload = () => {
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: {
              'Content-Type': 'application/json'
            }
          })
          resolve(response)
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        
        xhr.open('POST', '/api/upload-video')
        xhr.send(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      setUploadedUrl(data.videoUrl)
      onUploadComplete?.(data.videoUrl)
      
      toast({
        title: 'Upload successful',
        description: `Video uploaded for ${modelLabel}`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }, [experimentId, comparisonId, modelLabel, onUploadComplete])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  if (uploadedUrl) {
    return (
      <div className="border-2 border-green-500 border-dashed rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-green-600">Video uploaded successfully</p>
        <p className="text-xs text-gray-500 mt-1 break-all">{uploadedUrl}</p>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
    >
      <input
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`video-upload-${modelLabel}`}
        disabled={isUploading}
      />
      
      {isUploading ? (
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">Uploading video...</p>
          <Progress value={uploadProgress} className="max-w-xs mx-auto" />
          <p className="text-xs text-gray-500 mt-2">{uploadProgress}%</p>
        </div>
      ) : (
        <label
          htmlFor={`video-upload-${modelLabel}`}
          className="cursor-pointer block text-center"
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600">
            Drop video here or <span className="text-blue-600">browse</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Upload video for {modelLabel === 'modelA' ? 'Model A' : 'Model B'}
          </p>
        </label>
      )}
    </div>
  )
}