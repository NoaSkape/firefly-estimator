/**
 * Master Retail Purchase Agreement (Cash Sale) HTML Template
 * For Firefly Tiny Homes - complete legal document with DocuSeal field tags
 * Updated to use proper DocuSeal HTML template format
 */

export function buildAgreementHtml(order) {
  const {
    buyer_full_name = "{{buyer_full_name}}",
    buyer_address = "{{buyer_address}}", 
    buyer_phone = "{{buyer_phone}}",
    buyer_email = "{{buyer_email}}",
    cobuyer_full_name = "{{cobuyer_full_name}}",
    cobuyer_email = "{{cobuyer_email}}",
    model_brand = "{{model_brand}}",
    model_code = "{{model_code}}", 
    model_year = "{{model_year}}",
    dimensions = "{{dimensions}}",
    price_base = "{{price_base}}",
    price_options = "{{price_options}}", 
    price_freight_est = "{{price_freight_est}}",
    price_setup = "{{price_setup}}",
    price_other = "{{price_other}}",
    price_total = "{{price_total}}",
    payment_method = "cash_ach"
  } = order

  const noticeFinancing = payment_method === "financing"
    ? `<div class="notice">Subject to lender approval. Final sale contingent on lender's clearance.</div>`
    : ""
    
  const noticeCard = payment_method === "credit_card"
    ? `<div class="notice">Card payments may incur processing fees disclosed at payment step.</div>`
    : ""

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Master Retail Purchase Agreement (Cash Sale)</title>
<style>
  @page { size: Letter; margin: 1in; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.35; color: #111; }
  h1, h2 { margin: 0 0 8px; }
  h1 { font-size: 18px; letter-spacing: .3px; font-weight: bold; }
  h2 { font-size: 14px; margin-top: 16px; font-weight: bold; }
  .muted { color: #444; }
  .row { display: flex; gap: 24px; }
  .col { flex: 1; }
  .kv { margin: 6px 0; }
  .kv span:first-child { display: inline-block; width: 170px; color: #333; font-weight: 500; }
  .box { border: 1px solid #aaa; padding: 10px 12px; border-radius: 4px; margin: 10px 0; background: #fafafa; }
  .table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .table th, .table td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
  .table th { background: #f5f5f5; font-weight: bold; }
  .conspicuous { font-weight: 700; text-transform: uppercase; background: #fff3cd; padding: 4px; border: 2px solid #856404; }
  .notice { margin: 8px 0; padding: 6px 8px; border-left: 3px solid #555; background: #f8f9fa; }
  .anchors { margin-top: 24px; }
  .page-initials { margin-top: 28px; text-align: right; }
  .sigline { margin-top: 18px; }
  .sig { margin-top: 28px; display: flex; gap: 16px; align-items: center; }
  .sig .label { width: 160px; color: #333; font-weight: 500; }
  .sig .line { flex: 1; border-bottom: 1px solid #333; height: 18px; }
  .small { font-size: 11px; }
  .anchor { background: #ffeb3b; padding: 2px 4px; border: 1px dashed #f57f17; font-weight: bold; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<h1>MASTER RETAIL PURCHASE AGREEMENT (CASH SALE)</h1>
<div class="muted">This Agreement is entered into by and between the parties identified below.</div>

<h2>SELLER ("Dealer")</h2>
<div class="box">
  <div class="kv"><span>Legal Name:</span> Firefly Tiny Homes LLC</div>
  <div class="kv"><span>Retailer License #:</span> A164017</div>
  <div class="kv"><span>Managing Member:</span> Joshua Koviak</div>
  <div class="kv"><span>Business Address:</span> 6150 TX-16, Pipe Creek, TX 78063</div>
  <div class="kv"><span>Phone:</span> 830-328-6109</div>
</div>

<h2>BUYER(S)</h2>
<div class="box">
  <div class="kv"><span>Buyer Name:</span> ${buyer_full_name}</div>
  <div class="kv"><span>Buyer Address:</span> ${buyer_address}</div>
  <div class="kv"><span>Buyer Phone:</span> ${buyer_phone}</div>
  <div class="kv"><span>Buyer Email:</span> ${buyer_email}</div>
  ${cobuyer_full_name ? `<div class="kv"><span>Co-Buyer Name:</span> ${cobuyer_full_name}</div>` : ''}
  ${cobuyer_email ? `<div class="kv"><span>Co-Buyer Email:</span> ${cobuyer_email}</div>` : ''}
</div>

<h2>DESCRIPTION OF UNIT</h2>
<div class="box">
  <div class="kv"><span>Brand:</span> ${model_brand}</div>
  <div class="kv"><span>Model:</span> ${model_code}</div>
  <div class="kv"><span>Year:</span> ${model_year}</div>
  <div class="kv"><span>Dimensions:</span> ${dimensions}</div>
</div>

<h2>1. PURCHASE PRICE</h2>
<table class="table">
  <tr><th>Base Price</th><td>$${price_base}</td></tr>
  <tr><th>Options</th><td>$${price_options}</td></tr>
  <tr><th>Freight (Estimate)</th><td>$${price_freight_est}</td></tr>
  <tr><th>Setup</th><td>$${price_setup}</td></tr>
  <tr><th>Other</th><td>$${price_other}</td></tr>
  <tr><th><b>TOTAL</b></th><td><b>$${price_total}</b></td></tr>
</table>

<h2>2. PAYMENT TERMS (CASH SALE)</h2>
<div class="box">
  <div>Buyer shall pay a non-refundable deposit equal to 50% of the Total Purchase Price at execution.</div>
  <div>Final payment of the balance is due in full prior to release of the Unit from the factory.</div>
  <div>Payment methods accepted: Wire transfer or ACH (processed through Stripe portal).</div>
  ${noticeFinancing}
  ${noticeCard}
</div>

<h2>3. STORAGE FEES</h2>
<div class="box">
  If delivery has not occurred within twelve (12) days after factory completion due to Buyer delay, storage fees of $50 per day shall accrue and must be paid in full before release.
</div>

<h2>4. DELIVERY, SITE, AND INSURANCE</h2>
<div class="box">
  <div>- Buyer is responsible for site readiness, permits, access, utilities, and compliance with zoning codes.</div>
  <div>- Buyer assumes responsibility for insurance coverage on the Unit upon factory completion and during transit. Minimum coverage equal to the Purchase Price is required. Firefly Tiny Homes LLC must be named as additional insured.</div>
</div>

<h2>5. RISK OF LOSS</h2>
<div class="box">
  Risk of loss passes to Buyer upon factory completion. Seller will reasonably assist with carrier claims but bears no liability for transit damages.
</div>

<div class="page-initials">
  Buyer Initials: [[BUYER_INITIALS]] &nbsp;&nbsp;&nbsp; Co-Buyer Initials: [[COBUYER_INITIALS]]
</div>

<div class="page-break"></div>

<h2>6. WARRANTY</h2>
<div class="box">
  <div>- Manufacturer's written limited warranty applies. Buyer must register warranty directly with manufacturer.</div>
  <div>- Except as expressly provided in writing, Seller makes no other warranties.</div>
  <div class="conspicuous">DISCLAIMER: ALL IMPLIED WARRANTIES INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED TO THE MAXIMUM EXTENT PERMITTED BY TEXAS LAW.</div>
</div>

<h2>7. CHANGE ORDERS</h2>
<div class="box">
  All modifications require a signed Change Order form. Verbal promises are not binding.
</div>

<h2>8. CANCELLATION</h2>
<div class="box">
  <div>- Buyer cancellation after execution results in forfeiture of the 50% deposit as liquidated damages.</div>
  <div>- Seller default entitles Buyer to refund of funds paid for undelivered goods.</div>
</div>

<h2>9. DISPUTE RESOLUTION</h2>
<div class="box">
  <div class="conspicuous">ANY DISPUTE SHALL BE RESOLVED THROUGH BINDING ARBITRATION UNDER THE AMERICAN ARBITRATION ASSOCIATION (AAA) CONSUMER ARBITRATION RULES. ARBITRATION SHALL TAKE PLACE IN TEXAS. THE FEDERAL ARBITRATION ACT APPLIES. THIS CLAUSE IS CONSPICUOUS AND WAIVES JURY TRIAL.</div>
</div>

<h2>10. MISCELLANEOUS</h2>
<div class="box small">
  This Agreement contains the entire understanding between the parties. Texas law governs. Severability applies.
</div>

<div class="page-initials">
  Buyer Initials: [[BUYER_INITIALS]] &nbsp;&nbsp;&nbsp; Co-Buyer Initials: [[COBUYER_INITIALS]]
</div>

<div class="page-break"></div>

<h2>ELECTRONIC SIGNATURE CONSENT</h2>
<div class="box">
  <div>By signing below, all parties consent to the use of electronic signatures for this Agreement and acknowledge that electronic signatures have the same legal effect as handwritten signatures.</div>
</div>

<h2>EXECUTION</h2>
<div class="sig">
  <div class="label">SELLER (Dealer):</div><div class="line"></div><div class="label small">Firefly Tiny Homes LLC</div>
</div>
<div class="sigline">By: [[FIREFLY_SIGNATURE]] &nbsp;&nbsp; Date: ____________</div>

<div class="sig">
  <div class="label">BUYER:</div><div class="line"></div>
</div>
<div class="sigline">Signature: [[BUYER_SIGNATURE]] &nbsp;&nbsp; Date: ____________</div>

<div class="sig">
  <div class="label">CO-BUYER (optional):</div><div class="line"></div>
</div>
<div class="sigline">Signature: [[COBUYER_SIGNATURE]] &nbsp;&nbsp; Date: ____________</div>

<div class="page-initials">
  Buyer Initials: [[BUYER_INITIALS]] &nbsp;&nbsp;&nbsp; Co-Buyer Initials: [[COBUYER_INITIALS]]
</div>

</body>
</html>
`
}

/**
 * Build DocuSeal-compatible HTML template with proper field tags
 * This version uses DocuSeal's {{field;type=text;role=buyer}} syntax
 */
export function buildAgreementHtmlForDocuSeal() {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Master Retail Purchase Agreement (Cash Sale)</title>
<style>
  @page { size: Letter; margin: 1in; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.35; color: #111; }
  h1, h2 { margin: 0 0 8px; }
  h1 { font-size: 18px; letter-spacing: .3px; font-weight: bold; }
  h2 { font-size: 14px; margin-top: 16px; font-weight: bold; }
  .muted { color: #444; }
  .row { display: flex; gap: 24px; }
  .col { flex: 1; }
  .box { border: 1px solid #ccc; padding: 12px; margin: 8px 0; background-color: #f9f9f9; }
  .table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .table th, .table td { border: 1px solid #999; padding: 8px; text-align: left; }
  .table th { background-color: #e6e6e6; font-weight: bold; }
  .sigline { border-bottom: 1px solid #333; padding-bottom: 4px; margin: 16px 0; min-height: 24px; }
  .page-break { page-break-before: always; }
  .page-initials { margin: 20px 0; text-align: center; font-size: 11px; }
  .conspicuous { font-weight: bold; text-transform: uppercase; }
  .arbitration { font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 12px; margin: 12px 0; }
</style>
</head>
<body>

<h1>MASTER RETAIL PURCHASE AGREEMENT (CASH SALE)</h1>
<div class="muted">This Agreement is entered into by and between the parties identified below.</div>

<h2>SELLER ("Dealer")</h2>
<div class="box">
  <div class="row">
    <div class="col">
      <div><strong>Legal Name:</strong> Firefly Tiny Homes LLC</div>
      <div><strong>Retailer License #:</strong> A164017</div>
      <div><strong>Managing Member:</strong> Joshua Koviak</div>
    </div>
    <div class="col">
      <div><strong>Business Address:</strong> 6150 TX-16, Pipe Creek, TX 78063</div>
      <div><strong>Phone:</strong> 830-328-6109</div>
    </div>
  </div>
</div>

<h2>BUYER(S)</h2>
<div class="box">
  <div class="row">
    <div class="col">
      <div><strong>Buyer Name:</strong> {{buyer_full_name;type=text;role=buyer;required=true}}</div>
      <div><strong>Buyer Address:</strong> {{buyer_address;type=text;role=buyer;required=true}}</div>
      <div><strong>Buyer Phone:</strong> {{buyer_phone;type=text;role=buyer;required=true}}</div>
    </div>
    <div class="col">
      <div><strong>Buyer Email:</strong> {{buyer_email;type=text;role=buyer;required=true}}</div>
      <div><strong>Co-Buyer Name:</strong> {{cobuyer_full_name;type=text;role=cobuyer;required=false}}</div>
      <div><strong>Co-Buyer Email:</strong> {{cobuyer_email;type=text;role=cobuyer;required=false}}</div>
    </div>
  </div>
</div>

<h2>DESCRIPTION OF UNIT</h2>
<div class="box">
  <div class="row">
    <div class="col">
      <div><strong>Brand:</strong> {{model_brand;type=text;role=buyer;required=true}}</div>
      <div><strong>Model:</strong> {{model_code;type=text;role=buyer;required=true}}</div>
    </div>
    <div class="col">
      <div><strong>Year:</strong> {{model_year;type=text;role=buyer;required=true}}</div>
      <div><strong>Dimensions:</strong> {{dimensions;type=text;role=buyer;required=true}}</div>
    </div>
  </div>
</div>

<h2>1. PURCHASE PRICE</h2>
<table class="table">
  <tr><th>Item</th><th>Amount</th></tr>
  <tr><td>Base Price</td><td>{{price_base;type=text;role=buyer;required=true}}</td></tr>
  <tr><td>Options</td><td>{{price_options;type=text;role=buyer;required=true}}</td></tr>
  <tr><td>Freight (Estimate)</td><td>{{price_freight_est;type=text;role=buyer;required=true}}</td></tr>
  <tr><td>Setup</td><td>{{price_setup;type=text;role=buyer;required=true}}</td></tr>
  <tr><td>Other</td><td>{{price_other;type=text;role=buyer;required=true}}</td></tr>
  <tr style="font-weight: bold;"><td><strong>TOTAL</strong></td><td><strong>{{price_total;type=text;role=buyer;required=true}}</strong></td></tr>
</table>

<h2>2. PAYMENT TERMS</h2>
<div class="box">
  This Agreement is for a CASH SALE. All payments are due per the executed payment method agreement. No financing is provided by Seller.
</div>

<h2>3. STORAGE FEES</h2>
<div class="box">
  If delivery has not occurred within twelve (12) days after factory completion due to Buyer delay, storage fees of $50 per day shall accrue and must be paid in full before release.
</div>

<h2>4. DELIVERY, SITE, AND INSURANCE</h2>
<div class="box">
  <div>- Buyer is responsible for site readiness, permits, access, utilities, and compliance with zoning codes.</div>
  <div>- Buyer assumes responsibility for insurance coverage on the Unit upon factory completion and during transit. Minimum coverage equal to the Purchase Price is required. Firefly Tiny Homes LLC must be named as additional insured.</div>
</div>

<h2>5. RISK OF LOSS</h2>
<div class="box">
  Risk of loss passes to Buyer upon factory completion. Seller will reasonably assist with carrier claims but bears no liability for transit damages.
</div>

<div class="page-initials">
  Buyer Initials: {{buyer_initials_1;type=initials;role=buyer;required=true}} &nbsp;&nbsp;&nbsp; Co-Buyer Initials: {{cobuyer_initials_1;type=initials;role=cobuyer;required=false}}
</div>

<div class="page-break"></div>

<h2>6. WARRANTY</h2>
<div class="box">
  <div>- Manufacturer's written limited warranty applies. Buyer must register warranty directly with manufacturer.</div>
  <div>- Except as expressly provided in writing, Seller makes no other warranties.</div>
  <div class="conspicuous">DISCLAIMER: ALL IMPLIED WARRANTIES INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED TO THE MAXIMUM EXTENT PERMITTED BY TEXAS LAW.</div>
</div>

<h2>7. RIGHT TO CANCEL</h2>
<div class="box">
  Buyer has the right to cancel this transaction at any time prior to midnight of the third business day after signing this contract. If cancelled, any payments made will be returned within 10 business days.
</div>

<h2>8. DEFAULT & REMEDIES</h2>
<div class="box">
  <div>- Time is of the essence. If Buyer fails to make timely payments, Seller may terminate this Agreement.</div>
  <div>- Seller may retain any payments as liquidated damages and pursue any legal remedies.</div>
  <div>- If Seller defaults, Buyer's sole remedy is return of payments made.</div>
</div>

<div class="arbitration">
  ARBITRATION CLAUSE: ANY DISPUTE ARISING OUT OF OR RELATING TO THIS AGREEMENT SHALL BE RESOLVED BY BINDING ARBITRATION IN ACCORDANCE WITH THE COMMERCIAL ARBITRATION RULES OF THE AMERICAN ARBITRATION ASSOCIATION. JUDGMENT ON THE AWARD RENDERED BY THE ARBITRATOR(S) MAY BE ENTERED IN ANY COURT HAVING JURISDICTION. BY SIGNING BELOW, BUYER WAIVES THE RIGHT TO TRIAL BY JURY.
</div>

<div class="page-initials">
  Buyer Initials: {{buyer_initials_2;type=initials;role=buyer;required=true}} &nbsp;&nbsp;&nbsp; Co-Buyer Initials: {{cobuyer_initials_2;type=initials;role=cobuyer;required=false}}
</div>

<h2>9. ENTIRE AGREEMENT</h2>
<div class="box">
  This Agreement constitutes the entire agreement between the parties. No modification is valid unless in writing and signed by both parties. This Agreement shall be governed by Texas law.
</div>

<h2>SIGNATURES</h2>

<div style="margin: 20px 0;">
<strong>SELLER</strong><br>
Firefly Tiny Homes LLC<br>
<div class="sigline">By: {{firefly_signature;type=signature;role=firefly_signer;required=true}} &nbsp;&nbsp; Date: ____________</div>
Joshua Koviak, Managing Member
</div>

<div style="margin: 20px 0;">
<strong>BUYER</strong><br>
<div class="sigline">Signature: {{buyer_signature;type=signature;role=buyer;required=true}} &nbsp;&nbsp; Date: ____________</div>
Print Name: {{buyer_full_name;type=text;role=buyer;required=true}}
</div>

<div style="margin: 20px 0;">
<strong>CO-BUYER (if applicable)</strong><br>
<div class="sigline">Signature: {{cobuyer_signature;type=signature;role=cobuyer;required=false}} &nbsp;&nbsp; Date: ____________</div>
Print Name: {{cobuyer_full_name;type=text;role=cobuyer;required=false}}
</div>

<div class="page-initials">
  Buyer Initials: {{buyer_initials_3;type=initials;role=buyer;required=true}} &nbsp;&nbsp;&nbsp; Co-Buyer Initials: {{cobuyer_initials_3;type=initials;role=cobuyer;required=false}}
</div>

</body>
</html>
`;
}
