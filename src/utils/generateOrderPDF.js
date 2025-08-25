import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generateOrderPDF = async (orderData) => {
  try {
    // Create a temporary element for the PDF content
    const pdfElement = document.createElement('div')
    pdfElement.style.position = 'absolute'
    pdfElement.style.left = '-9999px'
    pdfElement.style.width = '800px'
    pdfElement.style.padding = '40px'
    pdfElement.style.backgroundColor = 'white'
    pdfElement.style.fontFamily = 'Arial, sans-serif'
    pdfElement.style.fontSize = '12px'
    pdfElement.style.lineHeight = '1.4'
    
    const { build, settings, pricing } = orderData
    
    // Group options by category
    const optionsByCategory = (build.selections?.options || []).reduce((acc, option) => {
      const category = option.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(option)
      return acc
    }, {})
    
    pdfElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 10px;">FIREFLY TINY HOMES</div>
        <div style="font-size: 20px; color: #374151; margin-bottom: 5px;">Order Summary</div>
        <div style="font-size: 14px; color: #6b7280;">Generated on ${new Date().toLocaleDateString()}</div>
      </div>

      <div style="margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>Order ID:</strong> ${build._id}
        </div>
        <div style="display: flex; justify-content: space-between;">
          <strong>Date:</strong> ${new Date().toLocaleDateString()}
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #f59e0b; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Model Configuration
        </div>
        <div style="font-size: 16px; margin-bottom: 20px;">
          <strong>${build.modelName}</strong> (${build.modelSlug})
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span>Base Price</span>
          <span>$${formatCurrency(pricing.basePrice)}</span>
        </div>
      </div>

      ${Object.keys(optionsByCategory).length > 0 ? `
      <div style="margin-bottom: 25px;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #f59e0b; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Selected Options
        </div>
        ${Object.entries(optionsByCategory).map(([category, categoryOptions]) => `
          <div style="font-weight: bold; margin-bottom: 8px; color: #666;">${category}</div>
          ${categoryOptions.map(option => `
            <div style="margin-bottom: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span>${option.name || option.code}${option.quantity > 1 ? ` (×${option.quantity})` : ''}</span>
                <span>$${formatCurrency(Number(option.price || 0) * (option.quantity || 1))}</span>
              </div>
              ${option.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${option.description}</div>` : ''}
            </div>
          `).join('')}
        `).join('')}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <strong>Options Subtotal</strong>
          <strong>$${formatCurrency(pricing.optionsSubtotal)}</strong>
        </div>
      </div>
      ` : ''}

      <div style="margin-bottom: 25px;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #f59e0b; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Fees & Services
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span>Delivery${build.pricing?.deliveryMiles ? ` (${Math.round(build.pricing.deliveryMiles)} miles)` : ''}</span>
          <span>$${formatCurrency(pricing.deliveryFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span>Title & Registration</span>
          <span>$${formatCurrency(pricing.titleFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span>Setup & Installation</span>
          <span>$${formatCurrency(pricing.setupFee)}</span>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #f59e0b; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Tax Calculation
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
          <span>Sales Tax (${(pricing.taxRate * 100).toFixed(2)}%)</span>
          <span>$${formatCurrency(pricing.salesTax)}</span>
        </div>
      </div>

      <div style="border-top: 2px solid #ccc; padding-top: 10px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #f59e0b;">
          <span>TOTAL PURCHASE PRICE</span>
          <span>$${formatCurrency(pricing.total)}</span>
        </div>
      </div>

      <div style="margin-top: 40px;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #f59e0b; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Buyer & Delivery Information
        </div>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
          <div style="margin-bottom: 8px;"><strong>Name:</strong> ${build.buyerInfo?.firstName || ''} ${build.buyerInfo?.lastName || ''}</div>
          <div style="margin-bottom: 8px;"><strong>Email:</strong> ${build.buyerInfo?.email || ''}</div>
          <div style="margin-bottom: 8px;"><strong>Phone:</strong> ${build.buyerInfo?.phone || 'Not provided'}</div>
          <div style="margin-bottom: 8px;"><strong>Delivery Address:</strong> ${build.buyerInfo?.deliveryAddress || [build.buyerInfo?.address, build.buyerInfo?.city, build.buyerInfo?.state, build.buyerInfo?.zip].filter(Boolean).join(', ') || 'Not specified'}</div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
        <p style="margin: 0;">This is a detailed summary of your Firefly Tiny Home order.</p>
        <p style="margin: 5px 0;">Generated on ${new Date().toLocaleString()}</p>
      </div>
    `
    
    document.body.appendChild(pdfElement)
    
    // Configure html2canvas options
    const canvas = await html2canvas(pdfElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: pdfElement.scrollHeight,
      scrollX: 0,
      scrollY: 0
    })

    // Create PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth - 20 // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    let heightLeft = imgHeight
    let position = 10 // 10mm top margin

    // Add first page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
    heightLeft -= (pdfHeight - 20) // Account for margins

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)
    }

    // Download the PDF
    const filename = `firefly-order-${build._id}.pdf`
    pdf.save(filename)

    // Clean up
    document.body.removeChild(pdfElement)

    return true
  } catch (error) {
    console.error('Error generating order PDF:', error)
    throw error
  }
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
