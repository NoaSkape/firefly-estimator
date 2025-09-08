/**
 * Order Summary PDF Generator
 * Uses Puppeteer to convert HTML to PDF
 */

import puppeteer from 'puppeteer'
import { buildOrderSummaryHtml } from '../contracts/html/order-summary.js'

export async function generateOrderSummaryPDF(order) {
  console.log('[PDF_GENERATOR] Starting Order Summary PDF generation for order:', order.id)
  
  let browser = null
  
  try {
    // Generate HTML
    const html = buildOrderSummaryHtml(order)
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
    
    const page = await browser.newPage()
    
    // Set content and generate PDF
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
    
    console.log('[PDF_GENERATOR] Order Summary PDF generated successfully, size:', Math.round(pdfBuffer.length / 1024), 'KB')
    
    return pdfBuffer
    
  } catch (error) {
    console.error('[PDF_GENERATOR] Order Summary PDF generation failed:', error)
    throw new Error(`Failed to generate Order Summary PDF: ${error.message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
