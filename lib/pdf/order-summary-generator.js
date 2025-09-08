/**
 * Order Summary PDF Generator
 * Uses Puppeteer to convert HTML to PDF
 */

import { buildOrderSummaryHtml } from '../contracts/html/order-summary.js'

export async function generateOrderSummaryPDF(order) {
  console.log('[PDF_GENERATOR] Starting Order Summary PDF generation for order:', order.id)
  
  try {
    // Generate HTML
    const html = buildOrderSummaryHtml(order)
    
    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    
    if (isServerless) {
      console.log('[PDF_GENERATOR] Serverless environment detected, using @sparticuz/chromium')
      
      // Use @sparticuz/chromium for Vercel/serverless environments
      const chromium = await import('@sparticuz/chromium')
      const puppeteer = await import('puppeteer-core')
      
      const browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '1in',
          right: '1in', 
          bottom: '1in',
          left: '1in'
        },
        printBackground: true
      })
      
      await browser.close()
      
      console.log('[PDF_GENERATOR] Serverless PDF generated successfully, size:', Math.round(pdfBuffer.length / 1024), 'KB')
      return Buffer.from(pdfBuffer)
      
    } else {
      console.log('[PDF_GENERATOR] Local environment detected, using regular puppeteer')
      
      // Use regular puppeteer for local development
      const puppeteer = await import('puppeteer')
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      })
      
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in', 
          left: '1in'
        },
        printBackground: true
      })
      
      await browser.close()
      
      console.log('[PDF_GENERATOR] Local PDF generated successfully, size:', Math.round(pdfBuffer.length / 1024), 'KB')
      return Buffer.from(pdfBuffer)
    }
    
  } catch (error) {
    console.error('[PDF_GENERATOR] Order Summary PDF generation failed:', error)
    
    // Fallback: Return the text content (API will detect this isn't a PDF buffer)
    console.warn('[PDF_GENERATOR] Falling back to text content')
    return generateFallbackContent(order)
  }
}

// Fallback content generator for when Puppeteer fails
function generateFallbackContent(order) {
  const content = `
ORDER SUMMARY
=============

Firefly Tiny Homes
6150 TX-16, Pipe Creek, TX 78063
830-328-6109

Order ID: ${order.id}

BUYER INFORMATION
-----------------
Name: ${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}
Email: ${order.buyer?.email || ''}
Phone: ${order.buyer?.phone || 'Not provided'}

${order.coBuyer ? `
CO-BUYER INFORMATION
-------------------
Name: ${order.coBuyer.firstName} ${order.coBuyer.lastName}
Email: ${order.coBuyer.email}
` : ''}

DELIVERY ADDRESS
----------------
${order.deliveryAddress?.line1 || ''}
${order.deliveryAddress?.line2 ? order.deliveryAddress.line2 + '\n' : ''}${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} ${order.deliveryAddress?.zip || ''}

SELECTED MODEL
--------------
Brand: ${order.model?.brand || ''}
Model: ${order.model?.model || ''}
Year: ${order.model?.year || ''}
Dimensions: ${order.model?.dimensions || ''}

PRICING SUMMARY
---------------
Base Price: $${((order.pricing?.base || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Options: $${((order.pricing?.options || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Tax: $${((order.pricing?.tax || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Title Fee: $${((order.pricing?.titleFee || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Delivery: $${((order.pricing?.delivery || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Setup: $${((order.pricing?.setup || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
${order.pricing?.discounts ? `Discounts: -$${(Math.abs(order.pricing.discounts) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` : ''}
TOTAL: $${((order.pricing?.total || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}

PAYMENT METHOD
--------------
Type: ${order.paymentMethod === 'cash_ach' ? 'Bank Transfer (ACH/Wire)' : 
       order.paymentMethod === 'credit_card' ? 'Credit Card' : 
       order.paymentMethod === 'financing' ? 'Financing' : 'Cash'}
${order.depositRequired && order.pricing?.depositDue ? `Deposit Due: $${(order.pricing.depositDue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}

Generated: ${new Date().toLocaleString('en-US')}

Note: This is a simplified order summary. The full PDF with formatting is temporarily unavailable.
Contact us at office@fireflytinyhomes.com or 830-328-6109 for questions.
  `.trim()
  
  return content.trim()
}
