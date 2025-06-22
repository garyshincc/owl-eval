'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  RefreshCw, 
  Users, 
  Briefcase, 
  GraduationCap, 
  Filter, 
  X
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { ModelPerformanceChart } from './model-performance-chart'

interface ModelPerformance {
  model: string
  dimension: string
  scenario?: string
  win_rate: number
  num_evaluations: number
  detailed_scores?: {
    A_much_better: number
    A_slightly_better: number
    Equal: number
    B_slightly_better: number
    B_much_better: number
  }
}

interface ParticipantDemographics {
  id: string
  prolificId: string
  experimentId: string
  experimentName: string
  status: string
  completedAt: string | null
  demographics: {
    age?: number
    sex?: string
    nationality?: string
    language?: string
    country_of_birth?: string
    country_of_residence?: string
    fluent_languages?: string[]
    employment_status?: string
    student_status?: string
  } | null
  submission?: {
    reward?: number
    timeTaken?: number
    totalPayment?: number
  }
}

interface DemographicsSummary {
  totalParticipants: number
  participantsWithDemographics: number
  averageAge?: number
  averageDollarPerHour?: number
  averageDollarPerEvaluation?: number
  sexDistribution: Record<string, number>
  nationalityDistribution: Record<string, number>
  employmentDistribution: Record<string, number>
  countryDistribution: Record<string, number>
}

interface EnhancedAnalyticsProps {
  loading?: boolean
  selectedGroup?: string | null
  onGroupChange?: (group: string | null) => void
  experiments?: any[]
  onRefresh?: () => void
  selectedExperiment?: string | null
  onExperimentChange?: (experimentId: string | null) => void
}

export function EnhancedAnalyticsDashboard({ 
  loading: externalLoading = false,
  selectedGroup,
  onGroupChange,
  experiments = [],
  onRefresh,
  selectedExperiment,
  onExperimentChange
}: EnhancedAnalyticsProps) {
  const [participants, setParticipants] = useState<ParticipantDemographics[]>([])
  const [allParticipants, setAllParticipants] = useState<ParticipantDemographics[]>([])
  const [filteredPerformance, setFilteredPerformance] = useState<ModelPerformance[]>([])
  const [demographicsSummary, setDemographicsSummary] = useState<DemographicsSummary | null>(null)
  const [demographicsLoading, setDemographicsLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState({
    ageMin: 18,
    ageMax: 80,
    sex: 'all',
    country: 'all',
    experimentGroup: selectedGroup || 'all'
  })
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [availableSexes, setAvailableSexes] = useState<string[]>([])
  const [availableGroups, setAvailableGroups] = useState<string[]>([])

  const fetchDemographicsData = useCallback(async () => {
    try {
      setDemographicsLoading(true)
      const demographicsResponse = await fetch('/api/demographics')
      if (!demographicsResponse.ok) {
        throw new Error('Failed to fetch demographics data')
      }
      const demographicsData = await demographicsResponse.json()
      const allParticipantData = demographicsData.participants || []
      
      setAllParticipants(allParticipantData)
      setDemographicsSummary(demographicsData.summary || null)
      
      // Extract available filter options
      const countryValues: string[] = []
      const sexValues: string[] = []
      
      allParticipantData.forEach((p: ParticipantDemographics) => {
        if (p.demographics?.country_of_residence) {
          countryValues.push(p.demographics.country_of_residence)
        }
        if (p.demographics?.sex) {
          sexValues.push(p.demographics.sex)
        }
      })
      
      const countries = Array.from(new Set(countryValues))
      const sexes = Array.from(new Set(sexValues))
      const groups = Array.from(new Set(experiments.map(exp => exp.group).filter(Boolean)))
      
      setAvailableCountries(countries)
      setAvailableSexes(sexes)
      setAvailableGroups(groups)
      
      // Set initial age range based on actual data (only if not already set)
      if (filters.ageMin === 18 && filters.ageMax === 80) {
        const ages = allParticipantData
          .map((p: ParticipantDemographics) => p.demographics?.age)
          .filter((age: number | undefined): age is number => age !== undefined && age !== null)
        
        if (ages.length > 0) {
          const minAge = Math.min(...ages)
          const maxAge = Math.max(...ages)
          setFilters(prev => ({
            ...prev,
            ageMin: minAge,
            ageMax: maxAge,
            experimentGroup: selectedGroup || 'all'
          }))
        }
      }
      
    } catch (error) {
      console.error('Error fetching demographics data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch demographics data. Please try refreshing.',
        variant: 'destructive'
      })
    } finally {
      setDemographicsLoading(false)
    }
  }, [experiments, selectedGroup, filters.ageMin, filters.ageMax])

  // Filter participants and performance data based on current filters
  const applyFilters = useCallback(async () => {
    let filtered = allParticipants.filter(participant => {
      const demographics = participant.demographics
      if (!demographics) return false

      // Age filter
      if (demographics.age) {
        if (demographics.age < filters.ageMin || demographics.age > filters.ageMax) {
          return false
        }
      }

      // Sex filter
      if (filters.sex !== 'all' && demographics.sex !== filters.sex) {
        return false
      }

      // Country filter
      if (filters.country !== 'all' && demographics.country_of_residence !== filters.country) {
        return false
      }

      return true
    })

    setParticipants(filtered)

    // Get filtered performance data based on demographic filters
    try {
      const performanceResponse = await fetch('/api/filtered-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      })
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json()
        setFilteredPerformance(performanceData || [])
      }
    } catch (error) {
      console.error('Error fetching filtered performance data:', error)
      // Fallback to empty data
      setFilteredPerformance([])
    }

    // Update group selection if changed
    if (filters.experimentGroup !== selectedGroup && onGroupChange) {
      onGroupChange(filters.experimentGroup === 'all' ? null : filters.experimentGroup)
    }
  }, [allParticipants, filters, selectedGroup, onGroupChange])

  // Apply filters when filter state or participants change
  useEffect(() => {
    if (allParticipants.length > 0) {
      applyFilters()
    }
  }, [filters, allParticipants, applyFilters])

  // Initial performance data load when component mounts
  useEffect(() => {
    const loadInitialPerformance = async () => {
      try {
        const performanceResponse = await fetch('/api/filtered-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filters: {
              ageMin: 18,
              ageMax: 80,
              sex: 'all',
              country: 'all',
              experimentGroup: selectedGroup || 'all'
            }
          })
        })
        if (performanceResponse.ok) {
          const performanceData = await performanceResponse.json()
          setFilteredPerformance(performanceData || [])
        }
      } catch (error) {
        console.error('Error fetching initial performance data:', error)
      }
    }

    loadInitialPerformance()
  }, [selectedGroup])

  // Update group filter when external selectedGroup changes
  useEffect(() => {
    if (selectedGroup !== filters.experimentGroup) {
      setFilters(prev => ({ ...prev, experimentGroup: selectedGroup || 'all' }))
    }
  }, [selectedGroup, filters.experimentGroup])

  const clearFilters = () => {
    setFilters({
      ageMin: 18,
      ageMax: 80,
      sex: 'all',
      country: 'all',
      experimentGroup: 'all'
    })
  }

  const handleRefresh = async () => {
    await fetchDemographicsData()
    onRefresh?.()
  }

  // Fetch demographics data on mount
  useEffect(() => {
    fetchDemographicsData()
  }, [fetchDemographicsData])

  // Calculate filtered summary
  const getFilteredSummary = () => {
    if (participants.length === 0) return null

    const participantsWithDemographics = participants.filter(p => p.demographics)
    
    // Age statistics
    const ages = participantsWithDemographics
      .map(p => p.demographics?.age)
      .filter(age => age !== undefined && age !== null) as number[]
    const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : undefined

    // Payment and time statistics
    const participantsWithPaymentData = participants.filter(p => 
      p.submission?.totalPayment && p.submission?.timeTaken
    )
    
    let averageDollarPerHour = undefined
    if (participantsWithPaymentData.length > 0) {
      const dollarsPerHour = participantsWithPaymentData.map(p => {
        const totalPaymentCents = p.submission!.totalPayment!
        const timeTakenMinutes = p.submission!.timeTaken!
        const dollarPerHour = (totalPaymentCents / 100) / (timeTakenMinutes / 60)
        return dollarPerHour
      })
      averageDollarPerHour = dollarsPerHour.reduce((sum, rate) => sum + rate, 0) / dollarsPerHour.length
    }

    const averageDollarPerEvaluation = demographicsSummary?.averageDollarPerEvaluation

    return {
      totalParticipants: participants.length,
      participantsWithDemographics: participantsWithDemographics.length,
      averageAge,
      averageDollarPerHour,
      averageDollarPerEvaluation,
    }
  }

  const filteredSummary = getFilteredSummary()

  if (demographicsLoading && allParticipants.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Enhanced Analytics</h2>
            <p className="text-muted-foreground">Model performance with demographic filtering</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Analytics</h2>
          <p className="text-muted-foreground">Model performance with demographic filtering</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={demographicsLoading || externalLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${demographicsLoading || externalLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Analytics Filters
          </CardTitle>
          <CardDescription>
            Filter all analytics by participant demographics and experiment groups. 
            Showing data for {participants.length} of {allParticipants.length} participants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Age Range Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Age Range</Label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="range"
                    min="18"
                    max="80"
                    value={filters.ageMin}
                    onChange={(e) => {
                      const newMin = Number(e.target.value)
                      setFilters(prev => ({ 
                        ...prev, 
                        ageMin: Math.min(newMin, prev.ageMax - 1)
                      }))
                    }}
                    className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{ zIndex: 1 }}
                  />
                  <input
                    type="range"
                    min="18"
                    max="80"
                    value={filters.ageMax}
                    onChange={(e) => {
                      const newMax = Number(e.target.value)
                      setFilters(prev => ({ 
                        ...prev, 
                        ageMax: Math.max(newMax, prev.ageMin + 1)
                      }))
                    }}
                    className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{ zIndex: 2 }}
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm bg-background border rounded px-2 py-1">{filters.ageMin}</span>
                  <span className="text-xs text-muted-foreground">
                    {filters.ageMin} - {filters.ageMax} years
                  </span>
                  <span className="text-sm bg-background border rounded px-2 py-1">{filters.ageMax}</span>
                </div>
              </div>
            </div>

            {/* Sex Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sex</Label>
              <Select value={filters.sex} onValueChange={(value) => setFilters(prev => ({ ...prev, sex: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableSexes.map(sex => (
                    <SelectItem key={sex} value={sex}>{sex}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Country</Label>
              <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {availableCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Experiment Group Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Experiment Group</Label>
              <Select value={filters.experimentGroup} onValueChange={(value) => setFilters(prev => ({ ...prev, experimentGroup: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {availableGroups.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Experiment Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Specific Experiment</Label>
              <Select value={selectedExperiment || 'all'} onValueChange={(value) => onExperimentChange?.(value === 'all' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experiments</SelectItem>
                  {experiments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(experiment => (
                      <SelectItem key={experiment.id} value={experiment.id}>
                        {experiment.name} {experiment.prolificStudyId && '(Prolific)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Actions</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {filteredSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtered Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSummary.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((filteredSummary.totalParticipants / allParticipants.length) * 100)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Age</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredSummary.averageAge ? Math.round(filteredSummary.averageAge) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Years old
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg $/Hour</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredSummary.averageDollarPerHour ? `$${filteredSummary.averageDollarPerHour.toFixed(2)}` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Per hour worked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">$/Evaluation</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredSummary.averageDollarPerEvaluation ? `$${filteredSummary.averageDollarPerEvaluation.toFixed(2)}` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Per evaluation
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Existing Model Performance Chart Component with Filtered Data */}
      <ModelPerformanceChart 
        performance={filteredPerformance}
        loading={externalLoading}
        experiments={experiments}
      />
    </div>
  )
}