import { describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock the StatsDashboard component logic for testing
interface MockExperiment {
  id: string
  status: string
  group?: string | null
  _count: {
    participants: number
  }
}

interface MockStats {
  evaluations_by_scenario: Record<string, number>
}

interface MockEvaluationStatus {
  completed: number
  active: number
  draft: number
}

// Component that uses defensive programming patterns
const MockStatsDashboard: React.FC<{
  experiments?: MockExperiment[] | null
  stats?: MockStats | null
  evaluationStatus?: MockEvaluationStatus | null
}> = ({ experiments, stats, evaluationStatus }) => {
  // Defensive checks for props (same pattern as our real component)
  const safeExperiments = experiments || []
  const safeStats = stats || null
  const safeEvaluationStatus = evaluationStatus || null
  
  // Get unique groups from experiments
  const uniqueGroups = Array.from(new Set(safeExperiments.map(exp => exp.group).filter(Boolean)))
  
  // Filter and count experiments
  const activeExperiments = safeExperiments.filter(exp => exp.status === 'active').length
  const totalParticipants = safeExperiments.reduce((sum, exp) => sum + (exp._count?.participants || 0), 0)
  
  return (
    <div data-testid="stats-dashboard">
      <div data-testid="active-experiments">{activeExperiments}</div>
      <div data-testid="total-participants">{totalParticipants}</div>
      <div data-testid="unique-groups">{uniqueGroups.join(',')}</div>
      <div data-testid="completed-status">{safeEvaluationStatus?.completed || 0}</div>
      <div data-testid="scenario-count">
        {safeStats ? Object.keys(safeStats.evaluations_by_scenario).length : 0}
      </div>
    </div>
  )
}

describe('Defensive Props Handling', () => {
  describe('MockStatsDashboard', () => {
    test('should render with valid props', () => {
      const experiments: MockExperiment[] = [
        { id: '1', status: 'active', group: 'group1', _count: { participants: 5 } },
        { id: '2', status: 'inactive', group: 'group2', _count: { participants: 3 } }
      ]
      
      const stats: MockStats = {
        evaluations_by_scenario: { scenario1: 10, scenario2: 15 }
      }
      
      const evaluationStatus: MockEvaluationStatus = {
        completed: 20,
        active: 5,
        draft: 2
      }
      
      render(
        <MockStatsDashboard 
          experiments={experiments}
          stats={stats}
          evaluationStatus={evaluationStatus}
        />
      )
      
      expect(screen.getByTestId('active-experiments')).toHaveTextContent('1')
      expect(screen.getByTestId('total-participants')).toHaveTextContent('8')
      expect(screen.getByTestId('unique-groups')).toHaveTextContent('group1,group2')
      expect(screen.getByTestId('completed-status')).toHaveTextContent('20')
      expect(screen.getByTestId('scenario-count')).toHaveTextContent('2')
    })

    test('should handle undefined experiments gracefully', () => {
      render(<MockStatsDashboard experiments={undefined} />)
      
      expect(screen.getByTestId('active-experiments')).toHaveTextContent('0')
      expect(screen.getByTestId('total-participants')).toHaveTextContent('0')
      expect(screen.getByTestId('unique-groups')).toHaveTextContent('')
      expect(screen.getByTestId('completed-status')).toHaveTextContent('0')
      expect(screen.getByTestId('scenario-count')).toHaveTextContent('0')
    })

    test('should handle null experiments gracefully', () => {
      render(<MockStatsDashboard experiments={null} />)
      
      expect(screen.getByTestId('active-experiments')).toHaveTextContent('0')
      expect(screen.getByTestId('total-participants')).toHaveTextContent('0')
      expect(screen.getByTestId('unique-groups')).toHaveTextContent('')
    })

    test('should handle empty experiments array', () => {
      render(<MockStatsDashboard experiments={[]} />)
      
      expect(screen.getByTestId('active-experiments')).toHaveTextContent('0')
      expect(screen.getByTestId('total-participants')).toHaveTextContent('0')
      expect(screen.getByTestId('unique-groups')).toHaveTextContent('')
    })

    test('should handle experiments with missing _count', () => {
      const experiments = [
        { id: '1', status: 'active', _count: { participants: 5 } },
        { id: '2', status: 'active' } as any, // missing _count
        { id: '3', status: 'active', _count: {} } as any // missing participants
      ]
      
      render(<MockStatsDashboard experiments={experiments} />)
      
      expect(screen.getByTestId('active-experiments')).toHaveTextContent('3')
      expect(screen.getByTestId('total-participants')).toHaveTextContent('5') // Only first experiment counted
    })

    test('should handle null stats gracefully', () => {
      render(<MockStatsDashboard stats={null} />)
      
      expect(screen.getByTestId('scenario-count')).toHaveTextContent('0')
    })

    test('should handle undefined evaluationStatus gracefully', () => {
      render(<MockStatsDashboard evaluationStatus={undefined} />)
      
      expect(screen.getByTestId('completed-status')).toHaveTextContent('0')
    })

    test('should filter out null and undefined groups', () => {
      const experiments: MockExperiment[] = [
        { id: '1', status: 'active', group: 'group1', _count: { participants: 5 } },
        { id: '2', status: 'active', group: null, _count: { participants: 3 } },
        { id: '3', status: 'active', _count: { participants: 2 } }, // no group
        { id: '4', status: 'active', group: 'group1', _count: { participants: 1 } } // duplicate group
      ]
      
      render(<MockStatsDashboard experiments={experiments} />)
      
      expect(screen.getByTestId('unique-groups')).toHaveTextContent('group1')
    })

    test('should handle all props being undefined', () => {
      render(<MockStatsDashboard />)
      
      expect(screen.getByTestId('stats-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('active-experiments')).toHaveTextContent('0')
      expect(screen.getByTestId('total-participants')).toHaveTextContent('0')
      expect(screen.getByTestId('unique-groups')).toHaveTextContent('')
      expect(screen.getByTestId('completed-status')).toHaveTextContent('0')
      expect(screen.getByTestId('scenario-count')).toHaveTextContent('0')
    })
  })
})

describe('Array Safety Utilities', () => {
  // Test utility functions for safe array operations
  const safeMap = <T, U>(array: T[] | null | undefined, mapper: (item: T) => U): U[] => {
    return (array || []).map(mapper)
  }

  const safeFilter = <T>(array: T[] | null | undefined, predicate: (item: T) => boolean): T[] => {
    return (array || []).filter(predicate)
  }

  const safeReduce = <T, U>(array: T[] | null | undefined, reducer: (acc: U, item: T) => U, initial: U): U => {
    return (array || []).reduce(reducer, initial)
  }

  describe('safeMap', () => {
    test('should map over valid arrays', () => {
      const array = [1, 2, 3]
      const result = safeMap(array, x => x * 2)
      expect(result).toEqual([2, 4, 6])
    })

    test('should return empty array for null/undefined', () => {
      expect(safeMap(null, x => x)).toEqual([])
      expect(safeMap(undefined, x => x)).toEqual([])
    })
  })

  describe('safeFilter', () => {
    test('should filter valid arrays', () => {
      const array = [1, 2, 3, 4]
      const result = safeFilter(array, x => x > 2)
      expect(result).toEqual([3, 4])
    })

    test('should return empty array for null/undefined', () => {
      expect(safeFilter(null, x => true)).toEqual([])
      expect(safeFilter(undefined, x => true)).toEqual([])
    })
  })

  describe('safeReduce', () => {
    test('should reduce valid arrays', () => {
      const array = [1, 2, 3]
      const result = safeReduce(array, (acc, x) => acc + x, 0)
      expect(result).toBe(6)
    })

    test('should return initial value for null/undefined', () => {
      expect(safeReduce(null, (acc, x) => acc + x, 10)).toBe(10)
      expect(safeReduce(undefined, (acc, x) => acc + x, 10)).toBe(10)
    })
  })
})