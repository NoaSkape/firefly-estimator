import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generatePDF = async (quoteData) => {
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
    
    const { model, options, client, fees } = quoteData
    
    pdfElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">Firefly Tiny Homes</h1>
        <h2 style="color: #374151; font-size: 20px; margin: 10px 0;">Quote Estimate</h2>
        <p style="color: #6b7280; margin: 0;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px;">Client Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p><strong>Name:</strong> ${client.fullName || 'N/A'}</p>
            <p><strong>Phone:</strong> ${client.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Address:</strong> ${client.address || 'N/A'}</p>
            <p><strong>ZIP Code:</strong> ${client.zip || 'N/A'}</p>
            <p><strong>Preferred Date:</strong> ${client.preferredDate || 'TBD'}</p>
          </div>
        </div>
        ${client.notes ? `<p><strong>Special Instructions:</strong> ${client.notes}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px;">Selected Model</h3>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #0ea5e9;">${model.name}</h4>
          <p style="margin: 0 0 10px 0; color: #6b7280;">${model.description}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
            <p style="margin: 0;"><strong>Length:</strong> ${model.specs.length}</p>
            <p style="margin: 0;"><strong>Width:</strong> ${model.specs.width}</p>
            <p style="margin: 0;"><strong>Height:</strong> ${model.specs.height}</p>
            <p style="margin: 0;"><strong>Weight:</strong> ${model.specs.weight}</p>
            <p style="margin: 0;"><strong>Bedrooms:</strong> ${model.specs.bedrooms}</p>
            <p style="margin: 0;"><strong>Bathrooms:</strong> ${model.specs.bathrooms}</p>
          </div>
        </div>
      </div>
      
      ${options.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #374151; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px;">Selected Options & Upgrades</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            ${options.map(option => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <div>
                  <div style="font-weight: bold; color: ${option.isPackage ? '#0ea5e9' : '#374151'};">
                    ${option.name}
                  </div>
                  ${option.description ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${option.description}</div>` : ''}
                </div>
                <div style="font-weight: bold; color: #0ea5e9;">
                  $${option.price.toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px;">Pricing Breakdown</h3>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span><strong>Base Model:</strong></span>
            <span>$${model.basePrice.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span><strong>Options & Upgrades:</strong></span>
            <span>$${options.reduce((sum, opt) => sum + opt.price, 0).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span><strong>Subtotal:</strong></span>
            <span>$${fees.subtotal.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span><strong>Tax:</strong></span>
            <span>$${fees.tax.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span><strong>Delivery Fee:</strong></span>
            <span>$${fees.deliveryFee.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #0ea5e9;">
            <span><strong>TOTAL:</strong></span>
            <span>$${fees.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">Important Information</h4>
        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
          <li>This quote is valid for 30 days from the date of generation</li>
          <li>Final pricing may vary based on site conditions and delivery requirements</li>
          <li>Financing options available through approved lenders</li>
          <li>Delivery timeline subject to manufacturing schedule and site preparation</li>
        </ul>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="margin: 0;">Firefly Tiny Homes | Professional Tiny Home Manufacturing</p>
        <p style="margin: 5px 0;">Contact us for more information or to schedule a consultation</p>
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
    const filename = `firefly-quote-${model.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
    pdf.save(filename)

    // Clean up
    document.body.removeChild(pdfElement)

    return true
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
} 