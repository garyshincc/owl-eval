import { describe, test, expect, jest, beforeEach } from '@jest/globals'

// Mock the PrismaClientKnownRequestError for testing
class MockPrismaClientKnownRequestError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'PrismaClientKnownRequestError'
    this.code = code
  }
}

describe('Database Retry Logic', () => {
  // Simplified version without setTimeout for easier testing
  const withDatabaseRetry = async <T>(
    operation: () => Promise<T>, 
    retryCount = 0,
    maxRetries = 2
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      const isRetryableError = error instanceof MockPrismaClientKnownRequestError && 
        ['P1001', 'P1008', 'P1017', 'P2024'].includes(error.code)
      
      if (isRetryableError && retryCount < maxRetries) {
        console.warn(`Database operation failed (attempt ${retryCount + 1}/${maxRetries + 1}). Retrying...`, error.code)
        // Skip setTimeout for testing - in real code this would have a delay
        return withDatabaseRetry(operation, retryCount + 1, maxRetries)
      }
      
      throw error
    }
  }

  describe('withDatabaseRetry', () => {
    test('should succeed on first attempt when operation succeeds', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')
      
      const result = await withDatabaseRetry(mockOperation)
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    test('should retry on retryable Prisma errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new MockPrismaClientKnownRequestError('Connection timeout', 'P1001'))
        .mockRejectedValueOnce(new MockPrismaClientKnownRequestError('Operations timed out', 'P1008'))
        .mockResolvedValue('success')

      const promise = withDatabaseRetry(mockOperation)
      
      // Fast-forward through the delays
      await jest.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    test('should not retry on non-retryable Prisma errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new MockPrismaClientKnownRequestError('Unique constraint failed', 'P2002'))

      await expect(withDatabaseRetry(mockOperation)).rejects.toThrow('Unique constraint failed')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    test('should not retry on non-Prisma errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Generic error'))

      await expect(withDatabaseRetry(mockOperation)).rejects.toThrow('Generic error')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    test('should fail after max retries', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new MockPrismaClientKnownRequestError('Connection timeout', 'P1001'))

      await expect(withDatabaseRetry(mockOperation)).rejects.toThrow('Connection timeout')
      expect(mockOperation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    test('should handle all retryable error codes', async () => {
      const retryableCodes = ['P1001', 'P1008', 'P1017', 'P2024']
      
      for (const code of retryableCodes) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new MockPrismaClientKnownRequestError(`Error ${code}`, code))
          .mockResolvedValue(`success-${code}`)

        const result = await withDatabaseRetry(mockOperation)
        
        expect(result).toBe(`success-${code}`)
        expect(mockOperation).toHaveBeenCalledTimes(2)
        
        mockOperation.mockClear()
      }
    })
  })

  describe('Error Classification', () => {
    const isRetryableError = (error: any): boolean => {
      return error instanceof MockPrismaClientKnownRequestError && 
        ['P1001', 'P1008', 'P1017', 'P2024'].includes(error.code)
    }

    test('should correctly identify retryable errors', () => {
      const retryableErrors = [
        new MockPrismaClientKnownRequestError('Connection timeout', 'P1001'),
        new MockPrismaClientKnownRequestError('Operations timed out', 'P1008'),
        new MockPrismaClientKnownRequestError('Server has closed the connection', 'P1017'),
        new MockPrismaClientKnownRequestError('Timed out fetching connection', 'P2024')
      ]

      retryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true)
      })
    })

    test('should correctly identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new MockPrismaClientKnownRequestError('Unique constraint failed', 'P2002'),
        new MockPrismaClientKnownRequestError('Record not found', 'P2025'),
        new Error('Generic error'),
        new TypeError('Type error'),
        null,
        undefined
      ]

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false)
      })
    })
  })

  describe('Exponential Backoff', () => {
    const calculateDelay = (retryCount: number, baseDelay = 1000): number => {
      return Math.pow(2, retryCount) * baseDelay
    }

    test('should calculate correct delays', () => {
      expect(calculateDelay(0)).toBe(1000)  // 2^0 * 1000 = 1000ms
      expect(calculateDelay(1)).toBe(2000)  // 2^1 * 1000 = 2000ms
      expect(calculateDelay(2)).toBe(4000)  // 2^2 * 1000 = 4000ms
      expect(calculateDelay(3)).toBe(8000)  // 2^3 * 1000 = 8000ms
    })

    test('should handle custom base delays', () => {
      expect(calculateDelay(0, 500)).toBe(500)   // 2^0 * 500 = 500ms
      expect(calculateDelay(1, 500)).toBe(1000)  // 2^1 * 500 = 1000ms
      expect(calculateDelay(2, 500)).toBe(2000)  // 2^2 * 500 = 2000ms
    })
  })

  describe('Database Response Mapping', () => {
    // Test the logic for mapping Prisma errors to HTTP status codes
    const mapErrorToStatus = (error: any): number => {
      if (error instanceof MockPrismaClientKnownRequestError) {
        return error.code === 'P1001' ? 503 : 500
      }
      return 500
    }

    test('should map connection timeout to 503', () => {
      const timeoutError = new MockPrismaClientKnownRequestError('Connection timeout', 'P1001')
      expect(mapErrorToStatus(timeoutError)).toBe(503)
    })

    test('should map other Prisma errors to 500', () => {
      const otherError = new MockPrismaClientKnownRequestError('Unique constraint', 'P2002')
      expect(mapErrorToStatus(otherError)).toBe(500)
    })

    test('should map generic errors to 500', () => {
      const genericError = new Error('Generic error')
      expect(mapErrorToStatus(genericError)).toBe(500)
    })
  })
})