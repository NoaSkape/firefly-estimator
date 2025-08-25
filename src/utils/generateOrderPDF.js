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
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const margin = 15 // 15mm margins
    const contentWidth = pdfWidth - (margin * 2)
    
    // Calculate maximum content height for PDF page (accounting for margins)
    const maxContentHeight = pdfHeight - (margin * 2) // ~267mm for A4 with 15mm margins
    const maxImageHeight = maxContentHeight * 2.83465 // Convert mm to pixels (96 DPI)
    
    // Helper function to create and render HTML element with height constraint
    const createAndRenderElement = async (htmlContent, maxHeight = null) => {
      const element = document.createElement('div')
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.width = '800px'
      element.style.padding = '80px 60px 60px 60px'
      element.style.backgroundColor = 'transparent'
      element.style.fontFamily = 'Arial, sans-serif'
      element.style.fontSize = '12px'
      element.style.lineHeight = '1.4'
      element.innerHTML = htmlContent
      
      document.body.appendChild(element)
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: maxHeight || element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowHeight: maxHeight || element.scrollHeight
      })
      
      document.body.removeChild(element)
      return canvas
    }
    
    // Helper function to create page header
    const createPageHeader = (pageNumber) => `
      <div style="position: relative; margin-bottom: 30px;">
        <img src="/logo/firefly-logo.png" alt="Firefly Tiny Homes" style="height: 60px; position: absolute; top: -80px; left: 0;"/>
        <div style="text-align: right; font-size: 14px; color: #000000; position: absolute; top: -70px; right: 0;">Page ${pageNumber}</div>
      </div>
    `
    
    // Helper function to create options HTML
    const createOptionsHTML = (optionsByCategory) => {
      if (Object.keys(optionsByCategory).length === 0) return ''
      
      return `
        <div style="margin-bottom: 25px;">
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
      <div style="margin-bottom: 25px;">
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

      <div style="margin-bottom: 25px;">
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
      <div style="margin-top: 40px;">
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

      <div style="margin-top: 40px;">
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
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 10px;">${build.modelName} Order Summary</div>
        <div style="font-size: 20px; color: #374151; margin-bottom: 5px;">Generated on ${new Date().toLocaleDateString()}</div>
      </div>
    `
    
    const orderInfoContent = `
      <div style="margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong style="color: #000000;">Order ID:</strong> <span style="color: #000000;">${build._id}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: #000000;">Date:</strong> <span style="color: #000000;">${new Date().toLocaleDateString()}</span>
        </div>
      </div>
    `
    
    const modelConfigContent = `
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
    `
    
    // Generate pages with proper height constraints
    let currentPage = 1
    
    // Page 1: Header, Order Info, Model Config, and options (if they fit)
    const page1Content = `
      ${createPageHeader(currentPage)}
      ${headerContent}
      ${orderInfoContent}
      ${modelConfigContent}
    `
    
    // Add options to page 1 if they exist and fit
    let page1OptionsHTML = ''
    if (Object.keys(optionsByCategory).length > 0) {
      page1OptionsHTML = createOptionsHTML(optionsByCategory)
    }
    
    const page1HTML = page1Content + page1OptionsHTML + `<div style="margin-bottom: 40px;"></div>`
    
    const canvas1 = await createAndRenderElement(page1HTML, maxImageHeight)
    const imgData1 = canvas1.toDataURL('image/png')
    const imgWidth = pdfWidth - 30
    const imgHeight1 = (canvas1.height * imgWidth) / canvas1.width
    
    pdf.addImage(imgData1, 'PNG', 15, 20, imgWidth, imgHeight1)
    
    // If we have options and they might not fit on page 1, create additional pages
    if (Object.keys(optionsByCategory).length > 0) {
      // Check if options actually fit on page 1 by comparing rendered height
      const optionsOnlyHTML = createOptionsHTML(optionsByCategory)
      const optionsCanvas = await createAndRenderElement(optionsOnlyHTML)
      
      // If options are too tall, create separate pages for them
      if (optionsCanvas.height > maxImageHeight * 0.6) { // If options take more than 60% of page height
        // Remove options from page 1 and add pricing summary
        const updatedPage1HTML = page1Content + createPricingSummaryHTML() + `<div style="margin-bottom: 40px;"></div>`
        const updatedCanvas1 = await createAndRenderElement(updatedPage1HTML, maxImageHeight)
        const updatedImgData1 = updatedCanvas1.toDataURL('image/png')
        const updatedImgHeight1 = (updatedCanvas1.height * imgWidth) / updatedCanvas1.width
        
        pdf.setPage(1)
        pdf.addImage(updatedImgData1, 'PNG', 15, 20, imgWidth, updatedImgHeight1)
        
        // Add options on separate pages
        currentPage++
        pdf.addPage()
        
        const optionsPageHTML = `
          ${createPageHeader(currentPage)}
          ${optionsOnlyHTML}
        `
        
        const optionsPageCanvas = await createAndRenderElement(optionsPageHTML, maxImageHeight)
        const optionsPageImgData = optionsPageCanvas.toDataURL('image/png')
        const optionsPageImgHeight = (optionsPageCanvas.height * imgWidth) / optionsPageCanvas.width
        
        pdf.addImage(optionsPageImgData, 'PNG', 15, 20, imgWidth, optionsPageImgHeight)
      } else {
        // Options fit on page 1, add pricing summary on page 2
        currentPage++
        pdf.addPage()
        
        const pricingPageHTML = `
          ${createPageHeader(currentPage)}
          ${createPricingSummaryHTML()}
        `
        
        const pricingCanvas = await createAndRenderElement(pricingPageHTML, maxImageHeight)
        const pricingImgData = pricingCanvas.toDataURL('image/png')
        const pricingImgHeight = (pricingCanvas.height * imgWidth) / pricingCanvas.width
        
        pdf.addImage(pricingImgData, 'PNG', 15, 20, imgWidth, pricingImgHeight)
      }
    }
    
    // Add final page with buyer info and legal notices
    currentPage++
    pdf.addPage()
    
    const finalPageHTML = `
      ${createPageHeader(currentPage)}
      ${createBuyerAndLegalHTML()}
    `
    
    const finalCanvas = await createAndRenderElement(finalPageHTML, maxImageHeight)
    const finalImgData = finalCanvas.toDataURL('image/png')
    const finalImgHeight = (finalCanvas.height * imgWidth) / finalCanvas.width
    
    pdf.addImage(finalImgData, 'PNG', 15, 20, imgWidth, finalImgHeight)
    
    // Download the PDF
    const filename = `firefly-order-${build._id}.pdf`
    pdf.save(filename)
    
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
