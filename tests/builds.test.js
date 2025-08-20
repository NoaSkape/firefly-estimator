import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { reprice } from '../lib/builds.js'

// Mock environment variables
process.env.SALES_TAX_RATE = '0.0825'

describe('Builds - Pricing Function', () => {
  describe('reprice()', () => {
    it('should calculate basic pricing correctly', () => {
      const buildLike = {
        selections: {
          basePrice: 71475,
          options: []
        },
        pricing: {
          delivery: 1500,
          setup: 500
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result).toEqual({
        base: 71475,
        options: 0,
        subtotal: 73475, // 71475 + 1500 + 500
        tax: 6062, // 73475 * 0.0825 rounded
        delivery: 1500,
        setup: 500,
        total: 79537 // 73475 + 6062
      })
    })

    it('should handle options with quantities', () => {
      const buildLike = {
        selections: {
          basePrice: 71475,
          options: [
            { price: 3500, quantity: 1 },
            { price: 900, quantity: 2 }
          ]
        },
        pricing: {
          delivery: 1500,
          setup: 500
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result.base).toBe(71475)
      expect(result.options).toBe(5300) // 3500 + (900 * 2)
      expect(result.subtotal).toBe(77775) // 71475 + 5300 + 1500 + 500
      expect(result.tax).toBe(6416) // 77775 * 0.0825 rounded
      expect(result.total).toBe(84191) // 77775 + 6416
    })

    it('should handle missing base price', () => {
      const buildLike = {
        selections: {
          options: [{ price: 1000, quantity: 1 }]
        },
        pricing: {
          delivery: 1500,
          setup: 500
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result.base).toBe(0)
      expect(result.options).toBe(1000)
      expect(result.subtotal).toBe(3000) // 0 + 1000 + 1500 + 500
    })

    it('should handle missing options array', () => {
      const buildLike = {
        selections: {
          basePrice: 71475
        },
        pricing: {
          delivery: 1500,
          setup: 500
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result.options).toBe(0)
      expect(result.subtotal).toBe(73475)
    })

    it('should use default delivery and setup costs', () => {
      const buildLike = {
        selections: {
          basePrice: 71475,
          options: []
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result.delivery).toBe(1500)
      expect(result.setup).toBe(500)
    })

    it('should handle custom delivery and setup costs', () => {
      const buildLike = {
        selections: {
          basePrice: 71475,
          options: []
        },
        pricing: {
          delivery: 2000,
          setup: 750
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result.delivery).toBe(2000)
      expect(result.setup).toBe(750)
      expect(result.subtotal).toBe(74225) // 71475 + 2000 + 750
    })

    it('should handle zero values correctly', () => {
      const buildLike = {
        selections: {
          basePrice: 0,
          options: [{ price: 0, quantity: 1 }]
        },
        pricing: {
          delivery: 0,
          setup: 0
        }
      }
      
      const result = reprice(buildLike)
      
      expect(result.base).toBe(0)
      expect(result.options).toBe(0)
      expect(result.subtotal).toBe(0)
      expect(result.tax).toBe(0)
      expect(result.total).toBe(0)
    })

    it('should handle null/undefined values gracefully', () => {
      const buildLike = {
        selections: {
          basePrice: null,
          options: null
        },
        pricing: null
      }
      
      const result = reprice(buildLike)
      
      expect(result.base).toBe(0)
      expect(result.options).toBe(0)
      expect(result.delivery).toBe(1500) // defaults
      expect(result.setup).toBe(500) // defaults
    })
  })
})

describe('Builds - Edge Cases', () => {
  it('should handle very large numbers', () => {
    const buildLike = {
      selections: {
        basePrice: 999999,
        options: [{ price: 50000, quantity: 10 }]
      },
      pricing: {
        delivery: 5000,
        setup: 2500
      }
    }
    
    const result = reprice(buildLike)
    
    expect(result.base).toBe(999999)
    expect(result.options).toBe(500000) // 50000 * 10
    expect(result.subtotal).toBe(1507499) // 999999 + 500000 + 5000 + 2500
    expect(result.tax).toBe(124369) // 1507499 * 0.0825 rounded
    expect(result.total).toBe(1631868) // 1507499 + 124369
  })

  it('should handle decimal prices correctly', () => {
    const buildLike = {
      selections: {
        basePrice: 71475.50,
        options: [{ price: 3500.25, quantity: 1 }]
      },
      pricing: {
        delivery: 1500,
        setup: 500
      }
    }
    
    const result = reprice(buildLike)
    
    expect(result.base).toBe(71475.50)
    expect(result.options).toBe(3500.25)
    expect(result.subtotal).toBe(76975.75) // 71475.50 + 3500.25 + 1500 + 500
    expect(result.tax).toBe(6350) // 76975.75 * 0.0825 rounded
    expect(result.total).toBe(83325.75) // 76975.75 + 6350
  })
})

describe('Builds - Tax Rate Variations', () => {
  it('should use custom tax rate from environment', () => {
    // Temporarily set different tax rate
    const originalTaxRate = process.env.SALES_TAX_RATE
    process.env.SALES_TAX_RATE = '0.06'
    
    const buildLike = {
      selections: {
        basePrice: 71475,
        options: []
      },
      pricing: {
        delivery: 1500,
        setup: 500
      }
    }
    
    const result = reprice(buildLike)
    
    expect(result.tax).toBe(4409) // 73475 * 0.06 rounded
    
    // Restore original tax rate
    process.env.SALES_TAX_RATE = originalTaxRate
  })

  it('should default to 8.25% when no tax rate is set', () => {
    // Temporarily remove tax rate
    const originalTaxRate = process.env.SALES_TAX_RATE
    delete process.env.SALES_TAX_RATE
    
    const buildLike = {
      selections: {
        basePrice: 71475,
        options: []
      },
      pricing: {
        delivery: 1500,
        setup: 500
      }
    }
    
    const result = reprice(buildLike)
    
    expect(result.tax).toBe(6062) // 73475 * 0.0825 rounded
    
    // Restore original tax rate
    process.env.SALES_TAX_RATE = originalTaxRate
  })
})
