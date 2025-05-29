'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  PREDEFINED_SCENARIOS, 
  SCENARIO_CATEGORIES, 
  COMMON_TAGS,
  getScenariosByCategory,
  isValidScenarioId,
  createCustomScenario,
  type ScenarioDefinition 
} from '@/lib/scenarios'
import { Search, Plus, Info } from 'lucide-react'

interface ScenarioSelectorProps {
  value: string
  onChange: (scenarioId: string) => void
  placeholder?: string
}

export function ScenarioSelector({ value, onChange, placeholder = "Select or create scenario" }: ScenarioSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition | null>(null)
  const [customScenario, setCustomScenario] = useState({
    id: '',
    name: '',
    description: '',
    tags: [] as string[]
  })

  // Filter scenarios based on search and category
  const filteredScenarios = PREDEFINED_SCENARIOS.filter(scenario => {
    const matchesSearch = searchTerm === '' || 
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || scenario.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleScenarioSelect = (scenarioId: string) => {
    onChange(scenarioId)
  }

  const handleCreateCustom = () => {
    if (customScenario.id && customScenario.name && isValidScenarioId(customScenario.id)) {
      onChange(customScenario.id)
      setShowCreateDialog(false)
      setCustomScenario({ id: '', name: '', description: '', tags: [] })
    }
  }

  const showScenarioInfo = (scenario: ScenarioDefinition) => {
    setSelectedScenario(scenario)
    setShowInfoDialog(true)
  }

  // Check if current value is a predefined scenario
  const currentScenario = PREDEFINED_SCENARIOS.find(s => s.id === value)
  const isCustomScenario = value && !currentScenario

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Current scenario info */}
      {currentScenario && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline">{currentScenario.category}</Badge>
          <span>{currentScenario.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => showScenarioInfo(currentScenario)}
          >
            <Info className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Custom scenario indicator */}
      {isCustomScenario && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline">custom</Badge>
          <span>Custom scenario: {value}</span>
        </div>
      )}

      {/* Scenario browser dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Scenario</DialogTitle>
            <DialogDescription>
              Select from predefined scenarios or create a custom one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Search and filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search scenarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {SCENARIO_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Predefined scenarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {filteredScenarios.map(scenario => (
                <div
                  key={scenario.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    handleScenarioSelect(scenario.id)
                    setShowCreateDialog(false)
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{scenario.name}</h4>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {scenario.category}
                      </Badge>
                      {scenario.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{scenario.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {scenario.evaluationFocus.map(focus => (
                      <Badge key={focus} variant="outline" className="text-xs">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom scenario creation */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Create Custom Scenario</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="custom-id">Scenario ID *</Label>
                    <Input
                      id="custom-id"
                      placeholder="e.g., my_custom_scenario"
                      value={customScenario.id}
                      onChange={(e) => setCustomScenario(prev => ({ ...prev, id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-name">Display Name *</Label>
                    <Input
                      id="custom-name"
                      placeholder="e.g., My Custom Test"
                      value={customScenario.name}
                      onChange={(e) => setCustomScenario(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="custom-description">Description</Label>
                  <Input
                    id="custom-description"
                    placeholder="What does this scenario test?"
                    value={customScenario.description}
                    onChange={(e) => setCustomScenario(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={handleCreateCustom}
                  disabled={!customScenario.id || !customScenario.name || !isValidScenarioId(customScenario.id)}
                  className="w-full"
                >
                  Create Custom Scenario
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scenario info dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedScenario?.name}</DialogTitle>
            <DialogDescription>
              Scenario details and evaluation focus
            </DialogDescription>
          </DialogHeader>
          {selectedScenario && (
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{selectedScenario.description}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Category</h4>
                  <Badge variant="outline">{selectedScenario.category}</Badge>
                </div>
                {selectedScenario.tags && selectedScenario.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedScenario.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedScenario.evaluationFocus.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Evaluation Focus</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedScenario.evaluationFocus.map(focus => (
                      <Badge key={focus} variant="outline" className="text-sm">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  handleScenarioSelect(selectedScenario.id)
                  setShowInfoDialog(false)
                  setShowCreateDialog(false)
                }}
                className="w-full"
              >
                Use This Scenario
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}