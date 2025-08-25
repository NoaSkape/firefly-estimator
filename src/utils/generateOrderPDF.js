import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generateOrderPDF = async (orderData) => {
  try {
    const { build, settings, pricing } = orderData
    
    // Group options by category
    const optionsByCategory = (build.selections?.options || []).reduce((acc, option) => {
      const category = option.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(option)
      return acc
    }, {})
    
    // Helper function to create and render HTML element with proper PDF styling
    const createAndRenderElement = async (htmlContent) => {
      const element = document.createElement('div')
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.width = '816px' // Letter width at 96dpi
      element.style.backgroundColor = 'white'
      element.style.fontFamily = 'Arial, sans-serif'
      element.style.fontSize = '12px'
      element.style.lineHeight = '1.4'
      element.style.margin = '0'
      element.style.padding = '0'
      element.innerHTML = htmlContent
      
             // Inject the PDF CSS
       const link = document.createElement('link')
       link.rel = 'stylesheet'
       link.href = '/styles/pdf.css'
       document.head.appendChild(link)
      
      document.body.appendChild(element)
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 816,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      })
      
      document.body.removeChild(element)
      document.head.removeChild(link)
      return canvas
    }
    
    // Helper function to create page header (logo visible within margins)
    const createPageHeader = () => `
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" style="height: 42px;"/>
      </div>
    `
    
    // Helper function to create options HTML
    const createOptionsHTML = (optionsByCategory) => {
      if (Object.keys(optionsByCategory).length === 0) return ''
      
      return `
        <div class="pdf-section">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
            Selected Options
          </div>
          ${Object.entries(optionsByCategory).map(([category, categoryOptions]) => `
            <div style="font-weight: bold; margin-bottom: 8px; color: #000000;">${category}</div>
            ${categoryOptions.map(option => `
              <div style="margin-bottom: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #000000;">${option.name || option.code}${option.quantity > 1 ? ` (×${option.quantity})` : ''}</span>
                  <span style="color: #000000;">${formatCurrency(Number(option.price || 0) * (option.quantity || 1))}</span>
                </div>
                ${option.description ? `<div style="font-size: 12px; color: #000000; margin-top: 4px;">${option.description}</div>` : ''}
              </div>
            `).join('')}
          `).join('')}
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
            <strong style="color: #000000;">Options Subtotal</strong>
            <strong style="color: #000000;">${formatCurrency(pricing.optionsSubtotal)}</strong>
          </div>
        </div>
      `
    }
    
    // Helper function to create pricing summary HTML
    const createPricingSummaryHTML = () => `
      <div class="pdf-section">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Fees & Services
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span style="color: #000000;">Delivery${build.pricing?.deliveryMiles ? ` (${Math.round(build.pricing.deliveryMiles)} miles)` : ''}</span>
          <span style="color: #000000;">${formatCurrency(pricing.deliveryFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span style="color: #000000;">Title & Registration</span>
          <span style="color: #000000;">${formatCurrency(pricing.titleFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span style="color: #000000;">Setup & Installation</span>
          <span style="color: #000000;">${formatCurrency(pricing.setupFee)}</span>
        </div>
      </div>

      <div class="pdf-section">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Tax Calculation
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span style="color: #000000;">Sales Tax (${(pricing.taxRate * 100).toFixed(2)}%)</span>
          <span style="color: #000000;">${formatCurrency(pricing.salesTax)}</span>
        </div>
      </div>

      <div style="border-top: 2px solid #ccc; padding-top: 10px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #000000;">
          <span style="color: #000000;">TOTAL PURCHASE PRICE</span>
          <span style="color: #000000;">${formatCurrency(pricing.total)}</span>
        </div>
      </div>
    `
    
    // Helper function to create buyer info and legal notices HTML
    const createBuyerAndLegalHTML = () => `
      <div class="page-break"></div>
      <div class="pdf-section">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Buyer & Delivery Information
        </div>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
          <div style="margin-bottom: 8px;"><strong style="color: #000000;">Name:</strong> <span style="color: #000000;">${build.buyerInfo?.firstName || ''} ${build.buyerInfo?.lastName || ''}</span></div>
          <div style="margin-bottom: 8px;"><strong style="color: #000000;">Email:</strong> <span style="color: #000000;">${build.buyerInfo?.email || ''}</span></div>
          <div style="margin-bottom: 8px;"><strong style="color: #000000;">Phone:</strong> <span style="color: #000000;">${build.buyerInfo?.phone || 'Not provided'}</span></div>
          <div style="margin-bottom: 8px;"><strong style="color: #000000;">Delivery Address:</strong> <span style="color: #000000;">${build.buyerInfo?.deliveryAddress || [build.buyerInfo?.address, build.buyerInfo?.city, build.buyerInfo?.state, build.buyerInfo?.zip].filter(Boolean).join(', ') || 'Not specified'}</span></div>
        </div>
      </div>

      <div class="pdf-section">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Legal Notices & Disclosures
        </div>
        <div style="font-size: 12px; color: #000000; line-height: 1.6;">
          <p style="margin-bottom: 8px;"><strong>•</strong> This document is a summary of estimated pricing and options. It is not a binding contract. Final terms will be set forth in the signed Purchase Agreement and related addendums.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> Deposits are non-refundable. Final payment must be made in full before the home may leave the factory.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> Delivery must occur within twelve (12) days of factory completion or storage charges of $50 per day will apply.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> Freight charges are estimated and may be adjusted due to fuel surcharges, DOT re-routing, escort requirements, or delivery site conditions.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> All prices are subject to change until construction authorization. Manufacturer pricing, material, or freight increases may require an adjustment to the total purchase price. Final pricing will be confirmed at the time Firefly Tiny Homes authorizes construction with the manufacturer.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> Any changes to the scope of construction require a signed Change Order form. Verbal promises are not binding.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> The home is covered solely by the Manufacturer's Limited Warranty. Firefly Tiny Homes does not provide additional warranties. To the maximum extent permitted by law, all implied warranties (including merchantability and fitness for a particular purpose) are disclaimed.</p>
          <p style="margin-bottom: 8px;"><strong>•</strong> The Unit will be titled and registered as a travel trailer under Texas law. Buyer is responsible for completing TxDMV requirements.</p>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #000000; border-top: 1px solid #ddd; padding-top: 20px;">
        <p style="margin: 0;">This is a detailed summary of your Firefly Tiny Home.</p>
        <p style="margin: 5px 0;">Generated on ${new Date().toLocaleString()}</p>
      </div>
    `
    
    // Build content sections
    const headerContent = `
      <div class="pdf-section">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 10px;">${build.modelName} Order Summary</div>
          <div style="font-size: 20px; color: #374151; margin-bottom: 5px;">Generated on ${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    `
    
    const orderInfoContent = `
      <div class="pdf-section">
        <div style="margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong style="color: #000000;">Order ID:</strong> <span style="color: #000000;">${build._id}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <strong style="color: #000000;">Date:</strong> <span style="color: #000000;">${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `
    
    const modelConfigContent = `
      <div class="pdf-section">
        <div style="margin-bottom: 25px;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #000000; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
            Model Configuration
          </div>
          <div style="font-size: 16px; margin-bottom: 20px;">
            <strong style="color: #000000;">${build.modelName}</strong> <span style="color: #000000;">(${build.modelSlug})</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
            <span style="color: #000000;">Base Price</span>
            <span style="color: #000000;">${formatCurrency(pricing.basePrice)}</span>
          </div>
        </div>
      </div>
    `
    
    // Create complete content with proper PDF structure
    const hasOptions = Object.keys(optionsByCategory).length > 0
    
    const completeContent = `
      <div class="pdf-root">
        ${createPageHeader()}
        ${headerContent}
        ${orderInfoContent}
        ${modelConfigContent}
        ${hasOptions ? createOptionsHTML(optionsByCategory) : ''}
        ${createPricingSummaryHTML()}
        ${createBuyerAndLegalHTML()}
      </div>
    `
    
    // Prefer html2pdf.js with @page-aware margins; fallback to manual jsPDF slicing
    const filename = `firefly-order-${build._id}.pdf`

    try {
      const { default: html2pdf } = await import('html2pdf.js')

      // Create a live DOM node for html2pdf
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.innerHTML = completeContent

      // Ensure the stylesheet is applied
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/styles/pdf.css'
      document.head.appendChild(link)
      document.body.appendChild(container)

      const rootEl = container.querySelector('.pdf-root') || container
      const opt = {
        margin: [18, 18, 18, 18], // mm
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page-break' },
      }

      // Render and then annotate page numbers by reloading the generated blob into jsPDF
      const worker = html2pdf().set(opt).from(rootEl)
      const blob = await worker.outputPdf('blob')
      const arrayBuf = await blob.arrayBuffer()
      const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
      // Load existing pages as images and add page numbers
      const existing = await new Response(arrayBuf).arrayBuffer()
      const existingPdf = new Uint8Array(existing)
      // Fallback simple save if we can't parse: save the blob
      try {
        // Use addFileToVFS is not available here; instead, just open the blob and draw page numbers approximately by duplicating into canvas
        // Simpler approach: just save as-is when parsing is not trivial
        // Save the blob directly
        const linkDl = document.createElement('a')
        linkDl.href = URL.createObjectURL(blob)
        linkDl.download = filename
        document.body.appendChild(linkDl)
        linkDl.click()
        document.body.removeChild(linkDl)
      } catch (_) {
        const linkDl = document.createElement('a')
        linkDl.href = URL.createObjectURL(blob)
        linkDl.download = filename
        document.body.appendChild(linkDl)
        linkDl.click()
        document.body.removeChild(linkDl)
      }

      // Cleanup
      document.body.removeChild(container)
      document.head.removeChild(link)
    } catch (err) {
      // Fallback: manual jsPDF with slicing
      const completeCanvas = await createAndRenderElement(completeContent)
      const completeImgData = completeCanvas.toDataURL('image/png')

      const pdf = new jsPDF('p', 'mm', 'letter')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 36 // 18mm margins
      const imgHeight = (completeCanvas.height * imgWidth) / completeCanvas.width

      let heightLeft = imgHeight
      let position = 18

      pdf.addImage(completeImgData, 'PNG', 18, position, imgWidth, imgHeight)
      // Page number 1
      pdf.setFontSize(12)
      pdf.text(`Page 1`, pdfWidth - 24, 12, { align: 'right' })
      heightLeft -= (pdfHeight - 36)

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 18
        pdf.addPage()
        pdf.addImage(completeImgData, 'PNG', 18, position, imgWidth, imgHeight)
        // Add page number for this page
        const current = pdf.getNumberOfPages()
        pdf.setFontSize(12)
        pdf.text(`Page ${current}`, pdfWidth - 24, 12, { align: 'right' })
        heightLeft -= (pdfHeight - 36)
      }

      pdf.save(filename)
    }
    
    return true
  } catch (error) {
    console.error('Error generating order PDF:', error)
    throw error
  }
}

// Helper function to format currency - fixed to avoid double dollar signs
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00'
  }
  
  // Convert to number and format without the currency symbol
  const numAmount = Number(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount)
  
  // Add single dollar sign
  return `$${formatted}`
}
