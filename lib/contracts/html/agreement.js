/**
 * Master Retail Purchase Agreement (Cash Sale) HTML Template
 * For Firefly Tiny Homes - complete legal document with anchor fields
 */

export function buildAgreementHtml(order) {
  const {
    buyer_full_name = "________________",
    buyer_address = "________________", 
    buyer_phone = "________________",
    buyer_email = "________________",
    cobuyer_full_name = "",
    cobuyer_email = "",
    model_brand = "________________",
    model_code = "________________", 
    model_year = "________________",
    dimensions = "________________",
    price_base = "________________",
    price_options = "________________", 
    price_freight_est = "________________",
    price_setup = "________________",
    price_other = "________________",
    price_total = "________________",
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
  Buyer Initials: <span class="anchor">[[BUYER_INITIALS_PAGE1]]</span> &nbsp;&nbsp;&nbsp; Co-Buyer Initials: <span class="anchor">[[COBUYER_INITIALS_PAGE1]]</span>
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
  Any dispute shall be resolved through binding arbitration under the American Arbitration Association (AAA) Consumer Arbitration Rules. Arbitration shall take place in Texas. The Federal Arbitration Act applies. This clause is conspicuous and waives jury trial.
</div>

<h2>10. MISCELLANEOUS</h2>
<div class="box small">
  This Agreement contains the entire understanding between the parties. Texas law governs. Severability applies.
</div>

<div class="page-initials">
  Buyer Initials: <span class="anchor">[[BUYER_INITIALS_PAGE2]]</span> &nbsp;&nbsp;&nbsp; Co-Buyer Initials: <span class="anchor">[[COBUYER_INITIALS_PAGE2]]</span>
</div>

<div class="page-break"></div>

<h2>ELECTRONIC SIGNATURE CONSENT</h2>
<div class="box">
  <div>By signing below, all parties consent to the use of electronic signatures for this Agreement and acknowledge that electronic signatures have the same legal effect as handwritten signatures.</div>
  <div>□ Buyer consents to electronic signature: <span class="anchor">[[BUYER_ESIG_CONSENT]]</span></div>
  <div>□ Co-Buyer consents to electronic signature: <span class="anchor">[[COBUYER_ESIG_CONSENT]]</span></div>
</div>

<h2>EXECUTION</h2>
<div class="sig">
  <div class="label">SELLER (Dealer):</div><div class="line"></div><div class="label small">Firefly Tiny Homes LLC</div>
</div>
<div class="sigline">By: <span class="anchor">[[FIREFLY_SIGNATURE]]</span> &nbsp;&nbsp; Date: <span class="anchor">[[FIREFLY_DATE]]</span></div>

<div class="sig">
  <div class="label">BUYER:</div><div class="line"></div>
</div>
<div class="sigline">Signature: <span class="anchor">[[BUYER_SIGNATURE]]</span> &nbsp;&nbsp; Date: <span class="anchor">[[BUYER_DATE]]</span></div>

<div class="sig">
  <div class="label">CO-BUYER (optional):</div><div class="line"></div>
</div>
<div class="sigline">Signature: <span class="anchor">[[COBUYER_SIGNATURE]]</span> &nbsp;&nbsp; Date: <span class="anchor">[[COBUYER_DATE]]</span></div>

<div class="page-initials">
  Buyer Initials: <span class="anchor">[[BUYER_INITIALS_PAGE3]]</span> &nbsp;&nbsp;&nbsp; Co-Buyer Initials: <span class="anchor">[[COBUYER_INITIALS_PAGE3]]</span>
</div>

</body>
</html>
`
}
