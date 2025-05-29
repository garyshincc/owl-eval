// Generic scenario system for model evaluation
// Users can create scenarios for any type of evaluation task

export interface ScenarioDefinition {
  id: string
  name: string
  description: string
  tags?: string[]
  category: 'basic' | 'complex' | 'edge_case' | 'performance' | 'custom'
  evaluationFocus: string[]
}

export const PREDEFINED_SCENARIOS: ScenarioDefinition[] = [
  // Basic scenarios for getting started
  {
    id: 'simple_task',
    name: 'Simple Task',
    description: 'Basic evaluation scenario for fundamental capabilities',
    tags: ['basic', 'foundation'],
    category: 'basic',
    evaluationFocus: ['accuracy', 'consistency']
  },
  {
    id: 'multi_step_task',
    name: 'Multi-Step Task',
    description: 'Scenario requiring multiple sequential steps',
    tags: ['sequential', 'planning'],
    category: 'basic',
    evaluationFocus: ['planning', 'execution', 'consistency']
  },
  
  // Complex scenarios
  {
    id: 'ambiguous_input',
    name: 'Ambiguous Input',
    description: 'Tests handling of unclear or ambiguous instructions',
    tags: ['ambiguity', 'reasoning'],
    category: 'complex',
    evaluationFocus: ['reasoning', 'interpretation', 'robustness']
  },
  {
    id: 'conflicting_constraints',
    name: 'Conflicting Constraints',
    description: 'Scenario with competing or contradictory requirements',
    tags: ['constraints', 'prioritization'],
    category: 'complex',
    evaluationFocus: ['reasoning', 'prioritization', 'trade_offs']
  },
  
  // Edge cases
  {
    id: 'minimal_context',
    name: 'Minimal Context',
    description: 'Very limited information provided',
    tags: ['context', 'inference'],
    category: 'edge_case',
    evaluationFocus: ['inference', 'assumptions', 'robustness']
  },
  {
    id: 'excessive_context',
    name: 'Information Overload',
    description: 'Large amount of potentially irrelevant information',
    tags: ['filtering', 'focus'],
    category: 'edge_case',
    evaluationFocus: ['filtering', 'relevance', 'efficiency']
  },
  
  // Performance scenarios
  {
    id: 'time_pressure',
    name: 'Time-Sensitive Task',
    description: 'Scenario requiring quick response or real-time processing',
    tags: ['speed', 'efficiency'],
    category: 'performance',
    evaluationFocus: ['speed', 'efficiency', 'quality_under_pressure']
  },
  {
    id: 'large_scale',
    name: 'Large-Scale Processing',
    description: 'Handling of large datasets or complex inputs',
    tags: ['scale', 'throughput'],
    category: 'performance',
    evaluationFocus: ['scalability', 'efficiency', 'accuracy']
  }
]

export const SCENARIO_CATEGORIES = [
  { id: 'basic', name: 'Basic Scenarios', description: 'Fundamental evaluation scenarios' },
  { id: 'complex', name: 'Complex Scenarios', description: 'Advanced evaluation scenarios' },
  { id: 'edge_case', name: 'Edge Cases', description: 'Boundary and stress testing scenarios' },
  { id: 'performance', name: 'Performance Tests', description: 'Speed and efficiency testing scenarios' },
  { id: 'custom', name: 'Custom', description: 'User-defined scenarios' }
]

export const COMMON_TAGS = [
  'basic', 'foundation', 'sequential', 'planning', 'ambiguity', 'reasoning',
  'constraints', 'prioritization', 'context', 'inference', 'filtering', 'focus',
  'speed', 'efficiency', 'scale', 'throughput', 'robustness', 'accuracy'
]

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return PREDEFINED_SCENARIOS.find(s => s.id === id)
}

export function getScenariosByCategory(category: string): ScenarioDefinition[] {
  return PREDEFINED_SCENARIOS.filter(s => s.category === category)
}

export function getScenariosByTag(tag: string): ScenarioDefinition[] {
  return PREDEFINED_SCENARIOS.filter(s => s.tags?.includes(tag))
}

export function isValidScenarioId(id: string): boolean {
  // Allow any non-empty string that's URL-safe
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0
}

export function createCustomScenario(
  id: string, 
  name: string, 
  description: string,
  tags?: string[]
): ScenarioDefinition {
  return {
    id,
    name,
    description,
    tags,
    category: 'custom',
    evaluationFocus: []
  }
}