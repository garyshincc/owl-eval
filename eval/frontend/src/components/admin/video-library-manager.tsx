'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { 
  Upload, 
  Search, 
  Grid3X3, 
  List, 
  Eye,
  Copy,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface VideoLibraryManagerProps {
  uploadedVideos: Array<{
    url: string
    name: string
    uploadedAt: Date
    key: string
    size: number
  }>
  selectedVideos: Set<string>
  onVideoSelect: (videoKey: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCopyUrls: () => void
  onDeleteSelected: () => void
  onRefresh: () => void
  loading?: boolean
}

export function VideoLibraryManager({
  uploadedVideos,
  selectedVideos,
  onVideoSelect,
  onSelectAll,
  onClearSelection,
  onUpload,
  onCopyUrls,
  onDeleteSelected,
  onRefresh,
  loading
}: VideoLibraryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')

  const filteredVideos = uploadedVideos
    .filter(video => 
      searchTerm === '' || 
      video.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      }
    })

  const copyVideoUrl = async (url: string, name: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: 'Copied',
        description: `URL for ${name} copied to clipboard`,
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        title: 'Copy failed',
        description: 'Failed to copy URL to clipboard',
        variant: 'destructive'
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video bg-gray-200 rounded animate-pulse"></div>
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
              <Upload className="h-5 w-5" />
              Video Library
              <Badge variant="secondary" className="ml-2">
                {uploadedVideos.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Upload and manage videos for experiments
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 hover:bg-gray-100 transition-colors">
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={onUpload}
            className="hidden"
            id="video-library-upload"
          />
          <label
            htmlFor="video-library-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">Upload Videos</p>
            <p className="text-sm text-gray-500 mt-1">
              Click or drag videos here to upload to the library
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports MP4, WebM, MOV and other video formats
            </p>
          </label>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Actions */}
        {uploadedVideos.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectedVideos.size === uploadedVideos.length ? onClearSelection : onSelectAll}
              >
                {selectedVideos.size === uploadedVideos.length ? 'Clear All' : 'Select All'}
              </Button>
              {selectedVideos.size > 0 && (
                <Badge variant="secondary" className="px-2 py-1">
                  {selectedVideos.size} selected
                </Badge>
              )}
            </div>
            {selectedVideos.size > 0 && (
              <div className="flex gap-2">
                <Button size="sm" onClick={onCopyUrls}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URLs ({selectedVideos.size})
                </Button>
                <Button size="sm" variant="destructive" onClick={onDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedVideos.size})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Video Grid/List */}
        {filteredVideos.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <div
                  key={video.key}
                  className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    selectedVideos.has(video.key) 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onVideoSelect(video.key)}
                >
                  <div className="relative aspect-video bg-gray-100">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedVideos.has(video.key)}
                        onChange={() => onVideoSelect(video.key)}
                        className="w-4 h-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {formatFileSize(video.size)}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium truncate" title={video.name}>
                      {video.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(video.uploadedAt)}
                    </p>
                    <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyVideoUrl(video.url, video.name)}
                        className="flex-1 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(video.url, '_blank')}
                        className="flex-1 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVideos.map((video) => (
                <div
                  key={video.key}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedVideos.has(video.key) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => onVideoSelect(video.key)}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(video.key)}
                      onChange={() => onVideoSelect(video.key)}
                      className="w-4 h-4"
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="relative flex-shrink-0">
                      <video
                        src={video.url}
                        className="w-24 h-16 object-cover rounded"
                        preload="metadata"
                        crossOrigin="anonymous"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={video.name}>
                        {video.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{formatDate(video.uploadedAt)}</span>
                        <span>{formatFileSize(video.size)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyVideoUrl(video.url, video.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching videos' : 'No videos uploaded yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search term'
                : 'Upload videos to build your library for experiments'
              }
            </p>
            {!searchTerm && (
              <label
                htmlFor="video-library-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Videos
              </label>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}