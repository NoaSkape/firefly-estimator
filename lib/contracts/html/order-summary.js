/**
 * Order Summary HTML Builder
 * Generates HTML for the Order Summary PDF (Pack 1)
 */

export function buildOrderSummaryHtml(order) {
  // Debug logging for model information
  console.log('[ORDER_SUMMARY] Model debug:', {
    orderModel: order.model,
    orderModelName: order.model?.name,
    orderModelCode: order.model?.modelCode,
    buildModelName: order.build?.modelName,
    buildModelSlug: order.build?.modelSlug
  })
  
  const formatCurrency = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getPaymentMethodDisplay = (order) => {
    // Check for specific payment method details - prioritize payment.method over financing.method
    // payment.method is set when user completes payment setup with specific method (ach_debit, bank_transfer, card)
    // financing.method is set when user initially selects cash vs financing
    const paymentMethod = order.paymentMethod || order.build?.payment?.method || order.build?.financing?.method
    
    // Debug logging
    console.log('[ORDER_SUMMARY] Payment method debug:', {
      orderPaymentMethod: order.paymentMethod,
      buildPaymentMethod: order.build?.payment?.method,
      buildFinancingMethod: order.build?.financing?.method,
      finalPaymentMethod: paymentMethod,
      buildPayment: order.build?.payment,
      buildFinancing: order.build?.financing
    })
    
    if (paymentMethod === 'ach_debit') {
      // For ACH debit, show account identifier if available
      const accountId = order.build?.payment?.accountId || order.build?.payment?.last4
      if (accountId) {
        return `ACH Debit (Account ending in ${accountId})`
      }
      return 'ACH Debit'
    } else if (paymentMethod === 'bank_transfer') {
      // For bank transfer, show transfer type
      return 'Bank Transfer (Wire/ACH Credit)'
    } else if (paymentMethod === 'card') {
      // For credit card, show card identifier if available
      const last4 = order.build?.payment?.last4 || order.build?.payment?.cardLast4
      if (last4) {
        return `Credit Card (ending in ${last4})`
      }
      return 'Credit Card'
    } else if (paymentMethod === 'financing') {
      return 'Financing'
    } else if (paymentMethod === 'cash') {
      return 'Cash'
    }
    
    // Fallback to original logic
    return paymentMethod === 'cash_ach' ? 'Bank Transfer (ACH/Wire)' : 
           paymentMethod === 'credit_card' ? 'Credit Card' : 
           paymentMethod === 'financing' ? 'Financing' : 'Cash'
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Order Summary - ${order.buyer?.firstName} ${order.buyer?.lastName}</title>
<style>
  @page { size: Letter; margin: 1in; }
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    font-size: 12px; 
    color: #111; 
    line-height: 1.4; 
    margin: 0;
    padding: 0;
  }
  .header { 
    text-align: center; 
    margin-bottom: 30px; 
    border-bottom: 2px solid #333;
    padding-bottom: 20px;
  }
  .header h1 { 
    font-size: 24px; 
    margin: 0 0 10px; 
    color: #333;
  }
  .header .subtitle { 
    font-size: 14px; 
    color: #666; 
    margin: 5px 0;
  }
  .section { 
    margin-bottom: 25px; 
  }
  .section h2 { 
    font-size: 16px; 
    margin: 0 0 10px; 
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
  }
  .info-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 20px; 
    margin-bottom: 20px;
  }
  .info-box { 
    border: 1px solid #ddd; 
    border-radius: 4px; 
    padding: 15px; 
    background: #f9f9f9;
  }
  .info-box h3 { 
    font-size: 14px; 
    margin: 0 0 10px; 
    color: #333;
    font-weight: bold;
  }
  .info-line { 
    margin: 5px 0; 
    display: flex;
    justify-content: space-between;
  }
  .info-line .label { 
    color: #666; 
    min-width: 120px;
  }
  .info-line .value { 
    font-weight: 500;
    text-align: right;
    flex: 1;
  }
  .model-specs {
    background: #f0f8ff;
    border: 1px solid #4a90e2;
    border-radius: 6px;
    padding: 20px;
    margin: 15px 0;
  }
  .model-specs h3 {
    color: #2c5aa0;
    margin: 0 0 15px;
    font-size: 16px;
  }
  .options-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
  }
  .options-table th,
  .options-table td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  .options-table th {
    background: #f5f5f5;
    font-weight: bold;
    color: #333;
  }
  .options-table .price {
    text-align: right;
    font-weight: 500;
  }
  .pricing-summary {
    background: #fff8e1;
    border: 2px solid #ffa000;
    border-radius: 6px;
    padding: 20px;
    margin: 20px 0;
  }
  .pricing-summary h3 {
    color: #e65100;
    margin: 0 0 15px;
    font-size: 16px;
  }
  .pricing-line {
    display: flex;
    justify-content: space-between;
    margin: 8px 0;
    padding: 5px 0;
  }
  .pricing-line.total {
    border-top: 2px solid #ffa000;
    margin-top: 15px;
    padding-top: 10px;
    font-weight: bold;
    font-size: 14px;
    color: #e65100;
  }
  .payment-info {
    background: #e8f5e8;
    border: 1px solid #4caf50;
    border-radius: 6px;
    padding: 15px;
    margin: 15px 0;
  }
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
    text-align: center;
    color: #666;
    font-size: 11px;
  }
  .timestamp {
    color: #999;
    font-size: 10px;
    text-align: right;
    margin-top: 10px;
  }
</style>
</head>
<body>

<div class="header">
  <h1>ORDER SUMMARY</h1>
  <div class="subtitle">Firefly Tiny Homes</div>
  <div class="subtitle">6150 TX-16, Pipe Creek, TX 78063 | 830-328-6109</div>
  <div class="subtitle">Order ID: ${order.id}</div>
</div>

<div class="info-grid">
  <div class="info-box">
    <h3>Buyer Information</h3>
    <div class="info-line">
      <span class="label">Name:</span>
      <span class="value">${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}</span>
    </div>
    <div class="info-line">
      <span class="label">Email:</span>
      <span class="value">${order.buyer?.email || ''}</span>
    </div>
    <div class="info-line">
      <span class="label">Phone:</span>
      <span class="value">${order.buyer?.phone || 'Not provided'}</span>
    </div>
    ${order.coBuyer ? `
    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
      <strong>Co-Buyer:</strong>
      <div class="info-line">
        <span class="label">Name:</span>
        <span class="value">${order.coBuyer.firstName} ${order.coBuyer.lastName}</span>
      </div>
      <div class="info-line">
        <span class="label">Email:</span>
        <span class="value">${order.coBuyer.email}</span>
      </div>
    </div>
    ` : ''}
  </div>

  <div class="info-box">
    <h3>Delivery Information</h3>
    <div class="info-line">
      <span class="label">Address:</span>
      <span class="value">${order.deliveryAddress?.line1 || ''}</span>
    </div>
    ${order.deliveryAddress?.line2 ? `
    <div class="info-line">
      <span class="label"></span>
      <span class="value">${order.deliveryAddress.line2}</span>
    </div>
    ` : ''}
    <div class="info-line">
      <span class="label">City:</span>
      <span class="value">${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} ${order.deliveryAddress?.zip || ''}</span>
    </div>
    <div class="info-line">
      <span class="label">Est. Completion:</span>
      <span class="value">${formatDate(order.estimatedFactoryCompletion)}</span>
    </div>
  </div>
</div>

<div class="section">
  <div class="model-specs">
    <h3>Selected Model</h3>
    <div class="info-line">
      <span class="label">Brand:</span>
      <span class="value">Firefly</span>
    </div>
    <div class="info-line">
      <span class="label">Model Name:</span>
      <span class="value">${order.model?.name || order.build?.modelName || ''}</span>
    </div>
    <div class="info-line">
      <span class="label">Model ID:</span>
      <span class="value">${order.model?.modelCode || order.build?.modelSlug || ''}</span>
    </div>
    <div class="info-line">
      <span class="label">Year:</span>
      <span class="value">2025</span>
    </div>
  </div>
</div>

${order.options && order.options.length > 0 ? `
<div class="section">
  <h2>Selected Options</h2>
  <table class="options-table">
    <thead>
      <tr>
        <th>Option</th>
        <th>Description</th>
        <th>Qty</th>
        <th class="price">Price</th>
      </tr>
    </thead>
    <tbody>
      ${order.options.map(option => `
        <tr>
          <td>${option.code || ''}</td>
          <td>${option.label || ''}</td>
          <td>${option.qty || 1}</td>
          <td class="price">${option.price ? formatCurrency(option.price) : 'Included'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
` : ''}

<div class="section">
  <div class="pricing-summary">
    <h3>Pricing Summary</h3>
    <div class="pricing-line">
      <span>Base Price:</span>
      <span>${formatCurrency(order.pricing?.base || 0)}</span>
    </div>
    <div class="pricing-line">
      <span>Options:</span>
      <span>${formatCurrency(order.pricing?.options || 0)}</span>
    </div>
    <div class="pricing-line">
      <span>Tax:</span>
      <span>${formatCurrency(order.pricing?.tax || 0)}</span>
    </div>
    <div class="pricing-line">
      <span>Title Fee:</span>
      <span>${formatCurrency(order.pricing?.titleFee || 0)}</span>
    </div>
    <div class="pricing-line">
      <span>Delivery:</span>
      <span>${formatCurrency(order.pricing?.delivery || 0)}</span>
    </div>
    <div class="pricing-line">
      <span>Setup:</span>
      <span>${formatCurrency(order.pricing?.setup || 0)}</span>
    </div>
    ${order.pricing?.discounts ? `
    <div class="pricing-line">
      <span>Discounts:</span>
      <span>-${formatCurrency(Math.abs(order.pricing.discounts))}</span>
    </div>
    ` : ''}
    <div class="pricing-line total">
      <span>TOTAL:</span>
      <span>${formatCurrency(order.pricing?.total || 0)}</span>
    </div>
  </div>
</div>

<div class="section">
  <div class="payment-info">
    <h3>Payment Method</h3>
    <div class="info-line">
      <span class="label">Payment Type:</span>
      <span class="value">${getPaymentMethodDisplay(order)}</span>
    </div>
    ${order.depositRequired && order.pricing?.depositDue ? `
    <div class="info-line">
      <span class="label">Deposit Due:</span>
      <span class="value">${formatCurrency(order.pricing.depositDue)}</span>
    </div>
    ` : ''}
  </div>
</div>

<div class="footer">
  <p>This order summary is for review purposes. All details are subject to the terms and conditions in the Purchase Agreement.</p>
  <p>Questions? Contact us at office@fireflytinyhomes.com or 830-328-6109</p>
  <div class="timestamp">Generated: ${new Date().toLocaleString('en-US')}</div>
</div>

</body>
</html>`
}
