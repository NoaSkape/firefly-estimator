/**
 * DocuSeal API Client for Firefly Tiny Homes Contract Management
 * Handles template-based contract generation, signing workflows, and status tracking
 */

import { getDb } from './db.js'

class DocuSealClient {
  constructor() {
    this.baseUrl = process.env.DOCUSEAL_BASE_URL || 'https://api.docuseal.co'
    this.apiKey = process.env.DOCUSEAL_API_KEY
    
    if (!this.apiKey) {
      throw new Error('DOCUSEAL_API_KEY environment variable is required')
    }
  }

  /**
   * Create HTTP headers for DocuSeal API requests
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Auth-Token': this.apiKey
    }
  }

  /**
   * Create or retrieve existing DocuSeal envelope for a specific pack
   * @param {string} orderId - The order ID
   * @param {string} pack - Pack type: 'agreement', 'delivery', 'final'
   * @param {Object} order - Order data for prefilling
   * @returns {Promise<Object>} Envelope data with signing URLs
   */
  async createPackEnvelope(orderId, pack, order) {
    console.log('[DOCUSEAL_CLIENT] Creating envelope for:', { orderId, pack, buyerEmail: order.buyer?.email })
    
    const db = await getDb()
    
    // Check if envelope already exists
    const existingContract = await db.collection('contracts').findOne(
      { orderId },
      { sort: { version: -1 } }
    )
    
    console.log('[DOCUSEAL_CLIENT] Existing contract found:', !!existingContract)

    if (existingContract?.envelopeIds?.[pack]) {
      // Check if existing envelope is still active
      const envelopeStatus = await this.getEnvelopeStatus(existingContract.envelopeIds[pack])
      if (envelopeStatus && !['voided', 'declined'].includes(envelopeStatus.status)) {
        return {
          envelopeId: existingContract.envelopeIds[pack],
          signingUrl: this.getSigningUrl(existingContract.envelopeIds[pack], order.buyer.email),
          status: envelopeStatus.status
        }
      }
    }

    // Create new envelope
    console.log('[DOCUSEAL_CLIENT] Creating new envelope for pack:', pack)
    
    const templateId = this.getTemplateId(pack)
    console.log('[DOCUSEAL_CLIENT] Using template ID:', templateId)
    
    const submitters = this.buildSubmitters(order)
    console.log('[DOCUSEAL_CLIENT] Submitters:', submitters.length)
    
    const prefillData = this.buildPrefillData(pack, order)
    console.log('[DOCUSEAL_CLIENT] Prefill data fields:', Object.keys(prefillData).length)

    const payload = {
      template_id: templateId,
      submitters,
      send_email: false, // We'll handle notifications ourselves
      completed_redirect_url: `${process.env.APP_URL || 'http://localhost:5173'}/checkout/${orderId}/contract?pack=${pack}&completed=true`,
      message: {
        subject: `Firefly Tiny Homes - ${this.getPackTitle(pack)}`,
        body: `Please review and sign your ${this.getPackTitle(pack).toLowerCase()}.`
      },
      fields: prefillData
    }
    
    console.log('[DOCUSEAL_CLIENT] Payload prepared for DocuSeal API')

    console.log('[DOCUSEAL_CLIENT] Making request to DocuSeal API:', `${this.baseUrl}/submissions`)
    
    const response = await fetch(`${this.baseUrl}/submissions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[DOCUSEAL_CLIENT] DocuSeal API error:', response.status, error)
      throw new Error(`DocuSeal API error: ${response.status} - ${error}`)
    }

    const envelope = await response.json()
    console.log('[DOCUSEAL_CLIENT] Envelope created successfully:', envelope.id)
    
    // Store envelope ID in database
    await this.updateContractEnvelope(orderId, pack, envelope.id)

    return {
      envelopeId: envelope.id,
      signingUrl: this.getSigningUrl(envelope.id, order.buyer.email),
      status: envelope.status || 'created'
    }
  }

  /**
   * Get template ID for a specific pack
   */
  getTemplateId(pack) {
    const templateMap = {
      agreement: process.env.DOCUSEAL_TEMPLATE_ID_AGREEMENT,
      delivery: process.env.DOCUSEAL_TEMPLATE_ID_DELIVERY,
      final: process.env.DOCUSEAL_TEMPLATE_ID_FINAL
    }

    const templateId = templateMap[pack]
    if (!templateId) {
      throw new Error(`Template ID not configured for pack: ${pack}`)
    }

    return templateId
  }

  /**
   * Get user-friendly pack title
   */
  getPackTitle(pack) {
    const titles = {
      agreement: 'Purchase Agreement',
      delivery: 'Site, Delivery & Risk',
      final: 'Final Acknowledgments & Variations'
    }
    return titles[pack] || pack
  }

  /**
   * Build submitters array for DocuSeal
   */
  buildSubmitters(order) {
    const submitters = [
      {
        name: `${order.buyer.firstName} ${order.buyer.lastName}`,
        email: order.buyer.email,
        role: 'buyer'
      }
    ]

    // Add co-buyer if present
    if (order.coBuyer) {
      submitters.push({
        name: `${order.coBuyer.firstName} ${order.coBuyer.lastName}`,
        email: order.coBuyer.email,
        role: 'cobuyer'
      })
    }

    // Add Firefly counter-signer
    submitters.push({
      name: process.env.FIREFLY_SIGNER_NAME || 'Firefly Tiny Homes',
      email: process.env.FIREFLY_SIGNER_EMAIL || 'office@fireflytinyhomes.com',
      role: 'firefly_signer'
    })

    return submitters
  }

  /**
   * Build prefill data for specific pack
   */
  buildPrefillData(pack, order) {
    const commonFields = {
      // Dealer information
      dealer_name: 'Firefly Tiny Homes LLC',
      dealer_address: '6150 TX-16, Pipe Creek, TX 78063',
      dealer_phone: '830-328-6109',
      
      // Model information
      model_brand: order.model.brand,
      model_name: order.model.model,
      model_year: order.model.year.toString(),
      model_dimensions: order.model.dimensions,
      
      // Buyer information
      buyer_name: `${order.buyer.firstName} ${order.buyer.lastName}`,
      buyer_email: order.buyer.email,
      buyer_phone: order.buyer.phone || '',
      buyer_address: this.formatAddress(order.buyer.mailing),
      
      // Delivery information
      delivery_address: this.formatAddress(order.deliveryAddress),
      
      // Pricing
      base_price: this.formatCurrency(order.pricing.base),
      options_price: this.formatCurrency(order.pricing.options),
      tax_amount: this.formatCurrency(order.pricing.tax),
      delivery_price: this.formatCurrency(order.pricing.delivery),
      setup_price: this.formatCurrency(order.pricing.setup),
      total_price: this.formatCurrency(order.pricing.total)
    }

    // Add co-buyer fields if present
    if (order.coBuyer) {
      commonFields.cobuyer_name = `${order.coBuyer.firstName} ${order.coBuyer.lastName}`
      commonFields.cobuyer_email = order.coBuyer.email
      commonFields.cobuyer_phone = order.coBuyer.phone || ''
      commonFields.cobuyer_address = this.formatAddress(order.coBuyer.mailing)
    }

    // Pack-specific fields
    switch (pack) {
      case 'agreement':
        return {
          ...commonFields,
          payment_method: order.paymentMethod,
          deposit_required: order.depositRequired ? 'Yes' : 'No',
          deposit_amount: order.pricing.depositDue ? this.formatCurrency(order.pricing.depositDue) : 'N/A',
          
          // Payment method specific fields
          ...(order.paymentMethod === 'credit_card' && {
            credit_card_fee_disclosure: 'Processing fees apply to credit card payments'
          }),
          ...(order.paymentMethod === 'financing' && {
            financing_disclaimer: 'Subject to lender approval'
          })
        }

      case 'delivery':
        return {
          ...commonFields,
          estimated_completion: order.estimatedFactoryCompletion || 'TBD',
          delivery_state: order.jurisdiction.state
        }

      case 'final':
        return {
          ...commonFields,
          deposit_addendum: order.depositRequired ? 'Included' : 'Not applicable'
        }

      default:
        return commonFields
    }
  }

  /**
   * Format address for display
   */
  formatAddress(address) {
    if (!address) return ''
    
    let formatted = address.line1
    if (address.line2) formatted += `, ${address.line2}`
    formatted += `, ${address.city}, ${address.state} ${address.zip}`
    
    return formatted
  }

  /**
   * Format currency amount
   */
  formatCurrency(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  /**
   * Get signing URL for a specific submitter
   */
  getSigningUrl(envelopeId, submitterEmail) {
    return `${this.baseUrl}/s/${envelopeId}?email=${encodeURIComponent(submitterEmail)}`
  }

  /**
   * Get envelope status from DocuSeal
   */
  async getEnvelopeStatus(envelopeId) {
    const response = await fetch(`${this.baseUrl}/submissions/${envelopeId}`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to get envelope status: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Update contract with envelope ID
   */
  async updateContractEnvelope(orderId, pack, envelopeId) {
    const db = await getDb()
    
    await db.collection('contracts').updateOne(
      { orderId },
      {
        $set: {
          [`envelopeIds.${pack}`]: envelopeId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          orderId,
          createdAt: new Date(),
          version: 1
        }
      },
      { upsert: true }
    )
  }

  /**
   * Check if all required packs are completed
   */
  async checkAllPacksCompleted(orderId) {
    const requiredPacks = ['agreement', 'delivery', 'final']
    const statuses = await Promise.all(
      requiredPacks.map(pack => this.getPackStatus(orderId, pack))
    )

    return statuses.every(status => status === 'completed')
  }

  /**
   * Get status for a specific pack
   */
  async getPackStatus(orderId, pack) {
    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ orderId })
    
    if (!contract?.envelopeIds?.[pack]) {
      return 'not_started'
    }

    try {
      const envelope = await this.getEnvelopeStatus(contract.envelopeIds[pack])
      return envelope.status
    } catch (error) {
      console.error(`Failed to get ${pack} status:`, error)
      return 'error'
    }
  }

  /**
   * Assemble final contract PDF when all packs are completed
   */
  async assembleContract(orderId) {
    const db = await getDb()
    const contract = await db.collection('contracts').findOne({ orderId })
    
    if (!contract?.envelopeIds) {
      throw new Error('No envelopes found for contract assembly')
    }

    // Get completed PDFs from DocuSeal
    const pdfUrls = []
    for (const [pack, envelopeId] of Object.entries(contract.envelopeIds)) {
      try {
        const pdfResponse = await fetch(`${this.baseUrl}/submissions/${envelopeId}/download`, {
          headers: this.getHeaders()
        })
        
        if (pdfResponse.ok) {
          pdfUrls.push({
            pack,
            url: pdfResponse.url,
            title: this.getPackTitle(pack)
          })
        }
      } catch (error) {
        console.error(`Failed to get PDF for ${pack}:`, error)
      }
    }

    // Store assembled contract URLs
    await db.collection('contracts').updateOne(
      { orderId },
      {
        $set: {
          'status.combinedPdfUrl': pdfUrls,
          'status.assembledAt': new Date(),
          updatedAt: new Date()
        }
      }
    )

    return pdfUrls
  }
}

export default DocuSealClient
