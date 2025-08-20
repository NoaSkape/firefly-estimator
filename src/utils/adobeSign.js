// Adobe Acrobat Sign Integration
import analytics from './analytics'

class AdobeSignIntegration {
  constructor() {
    this.baseUrl = process.env.REACT_APP_ADOBE_SIGN_URL || 'https://api.na1.echosign.com'
    this.clientId = process.env.REACT_APP_ADOBE_SIGN_CLIENT_ID
    this.clientSecret = process.env.REACT_APP_ADOBE_SIGN_CLIENT_SECRET
    this.accessToken = null
    this.tokenExpiry = null
  }

  // Get access token for Adobe Sign API
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'user_login:self user_write:self agreement_write:self agreement_read:self'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in * 1000)

      return this.accessToken
    } catch (error) {
      console.error('Adobe Sign token error:', error)
      throw error
    }
  }

  // Generate contract document from build data
  async generateContract(buildData, buyerInfo) {
    try {
      const token = await this.getAccessToken()
      
      // Create document from template
      const documentData = this.createDocumentData(buildData, buyerInfo)
      
      const response = await fetch(`${this.baseUrl}/api/rest/v6/transientDocuments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData)
      })

      if (!response.ok) {
        throw new Error(`Failed to generate contract: ${response.status}`)
      }

      const result = await response.json()
      analytics.trackEvent('contract_generated', {
        buildId: buildData._id,
        documentId: result.transientDocumentId
      })

      return result.transientDocumentId
    } catch (error) {
      console.error('Contract generation error:', error)
      analytics.trackError('contract_generation_failed', error.message, buildData._id)
      throw error
    }
  }

  // Create signing agreement
  async createSigningAgreement(buildData, buyerInfo, documentId) {
    try {
      const token = await this.getAccessToken()
      
      const agreementData = {
        documentCreationInfo: {
          fileInfos: [{
            transientDocumentId: documentId
          }],
          name: `Firefly Tiny Homes - ${buildData.modelName}`,
          signatureType: 'ESIGN',
          signatureFlow: 'SENDER_SIGNATURE_NOT_REQUIRED',
          message: 'Please review and sign your Firefly Tiny Homes purchase agreement.',
          externalId: buildData._id,
          daysUntilSigningDeadline: 7
        },
        participantSetsInfo: [{
          memberInfos: [{
            email: buyerInfo.email,
            name: `${buyerInfo.firstName} ${buyerInfo.lastName}`,
            role: 'SIGNER'
          }],
          order: 1,
          role: 'SIGNER'
        }]
      }

      const response = await fetch(`${this.baseUrl}/api/rest/v6/agreements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agreementData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create agreement: ${response.status}`)
      }

      const result = await response.json()
      analytics.trackEvent('agreement_created', {
        buildId: buildData._id,
        agreementId: result.agreementId
      })

      return result.agreementId
    } catch (error) {
      console.error('Agreement creation error:', error)
      analytics.trackError('agreement_creation_failed', error.message, buildData._id)
      throw error
    }
  }

  // Get signing URL for the agreement
  async getSigningUrl(agreementId) {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/api/rest/v6/agreements/${agreementId}/signingUrls`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get signing URL: ${response.status}`)
      }

      const result = await response.json()
      return result.signingUrls[0].esignUrl
    } catch (error) {
      console.error('Signing URL error:', error)
      throw error
    }
  }

  // Check agreement status
  async getAgreementStatus(agreementId) {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/api/rest/v6/agreements/${agreementId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get agreement status: ${response.status}`)
      }

      const result = await response.json()
      return {
        status: result.status,
        signed: result.status === 'SIGNED',
        completed: result.status === 'COMPLETED',
        cancelled: result.status === 'CANCELLED',
        expired: result.status === 'EXPIRED'
      }
    } catch (error) {
      console.error('Agreement status error:', error)
      throw error
    }
  }

  // Create document data from build information
  createDocumentData(buildData, buyerInfo) {
    const contractText = this.generateContractText(buildData, buyerInfo)
    
    return {
      File: this.textToBase64(contractText),
      MimeType: 'application/pdf',
      Name: `Firefly_Contract_${buildData._id}.pdf`
    }
  }

  // Generate contract text from build data
  generateContractText(buildData, buyerInfo) {
    const totalPrice = buildData.pricing?.total || 0
    const basePrice = buildData.pricing?.base || 0
    const optionsPrice = buildData.pricing?.options || 0
    const deliveryPrice = buildData.pricing?.delivery || 0
    const setupPrice = buildData.pricing?.setup || 0
    const taxAmount = buildData.pricing?.tax || 0

    return `
FIREFLY TINY HOMES - PURCHASE AGREEMENT

Date: ${new Date().toLocaleDateString()}
Agreement ID: ${buildData._id}

BUYER INFORMATION:
Name: ${buyerInfo.firstName} ${buyerInfo.lastName}
Email: ${buyerInfo.email}
Phone: ${buyerInfo.phone || 'Not provided'}
Address: ${buyerInfo.address || 'Not provided'}

PROPERTY DETAILS:
Model: ${buildData.modelName}
Base Price: $${basePrice.toLocaleString()}
Options: $${optionsPrice.toLocaleString()}
Delivery: $${deliveryPrice.toLocaleString()}
Setup: $${setupPrice.toLocaleString()}
Tax: $${taxAmount.toLocaleString()}
TOTAL: $${totalPrice.toLocaleString()}

PAYMENT METHOD: ${buildData.financing?.method === 'cash' ? 'Cash/ACH' : 'Financing'}

TERMS AND CONDITIONS:
1. This agreement constitutes a binding contract for the purchase of the specified Firefly Tiny Home.
2. Payment is due according to the selected payment method.
3. Delivery and setup will be scheduled upon receipt of payment.
4. All sales are final once this agreement is signed.
5. Firefly Tiny Homes reserves the right to modify delivery dates due to manufacturing or logistical constraints.

BUYER ACKNOWLEDGMENT:
I, ${buyerInfo.firstName} ${buyerInfo.lastName}, acknowledge that I have read and agree to the terms and conditions of this purchase agreement.

Signature: _________________________
Date: _____________________________

FIREFLY TINY HOMES
Authorized Signature: _________________________
Date: _____________________________
    `.trim()
  }

  // Convert text to base64 for document creation
  textToBase64(text) {
    return btoa(unescape(encodeURIComponent(text)))
  }

  // Download signed document
  async downloadSignedDocument(agreementId) {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/api/rest/v6/agreements/${agreementId}/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`)
      }

      const result = await response.json()
      return result.documents[0].documentId
    } catch (error) {
      console.error('Document download error:', error)
      throw error
    }
  }

  // Send reminder for unsigned agreements
  async sendReminder(agreementId) {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.baseUrl}/api/rest/v6/agreements/${agreementId}/reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: 'Reminder: Your Firefly Tiny Homes purchase agreement is waiting for your signature.'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send reminder: ${response.status}`)
      }

      analytics.trackEvent('reminder_sent', { agreementId })
      return true
    } catch (error) {
      console.error('Reminder error:', error)
      throw error
    }
  }
}

// Create singleton instance
const adobeSign = new AdobeSignIntegration()

export default adobeSign
