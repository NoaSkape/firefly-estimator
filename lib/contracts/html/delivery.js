/**
 * Delivery, Set & Site Readiness Agreement HTML Builder
 * Generates complete HTML contract with placeholders and DocuSeal anchors
 */

export function buildDeliveryHtml(input) {
  const {
    buyer_full_name = "{{buyer_full_name}}",
    buyer_email = "{{buyer_email}}",
    cobuyer_full_name = "{{cobuyer_full_name}}",
    cobuyer_email = "{{cobuyer_email}}",
    delivery_address_line1 = "{{delivery_address_line1}}",
    delivery_address_line2 = "{{delivery_address_line2}}",
    delivery_city = "{{delivery_city}}",
    delivery_state = "{{delivery_state}}",
    delivery_zip = "{{delivery_zip}}",
    model_brand = "{{model_brand}}",
    model_code = "{{model_code}}",
    model_year = "{{model_year}}",
    dimensions = "{{dimensions}}",
    est_completion_date = "{{est_completion_date}}"
  } = input

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Delivery, Set & Site Readiness Agreement</title>
<style>
  @page { size: Letter; margin: 1in; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color:#111; line-height:1.35; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  h2 { font-size: 14px; margin: 16px 0 6px; }
  .muted { color:#555; }
  .box { border:1px solid #aaa; border-radius:4px; padding:10px 12px; margin:8px 0; }
  .kv { margin:4px 0; }
  .kv span:first-child { display:inline-block; width:170px; color:#333; }
  .list { margin:6px 0 0 16px; }
  .conspicuous { font-weight:700; text-transform:uppercase; }
  .notice { border-left:3px solid #444; padding:6px 8px; margin:8px 0; }
  .sig { margin-top: 20px; }
  .sigrow { display:flex; gap:16px; align-items:center; margin-top:12px; }
  .label { width:160px; color:#333; }
  .line { flex:1; border-bottom:1px solid #333; height:18px; }
  .page-initials { margin-top:28px; text-align:right; }
  .small { font-size: 11px; }
</style>
</head>
<body>

<h1>DELIVERY, SET & SITE READINESS AGREEMENT</h1>
<div class="muted">This Agreement supplements the Master Retail Purchase Agreement between the parties identified below.</div>

<h2>PARTIES</h2>
<div class="box">
  <div class="kv"><span>Dealer (Seller):</span> Firefly Tiny Homes LLC</div>
  <div class="kv"><span>Dealer Email:</span> office@fireflytinyhomes.com</div>
  <div class="kv"><span>Buyer:</span> ${buyer_full_name} (${buyer_email})</div>
  <div class="kv"><span>Co-Buyer (optional):</span> ${cobuyer_full_name} (${cobuyer_email})</div>
</div>

<h2>UNIT & DELIVERY LOCATION</h2>
<div class="box">
  <div class="kv"><span>Brand / Model / Year:</span> ${model_brand} / ${model_code} / ${model_year}</div>
  <div class="kv"><span>Dimensions:</span> ${dimensions}</div>
  <div class="kv"><span>Delivery Address:</span> ${delivery_address_line1} ${delivery_address_line2}, ${delivery_city}, ${delivery_state} ${delivery_zip}</div>
  <div class="kv"><span>Estimated Factory Completion:</span> ${est_completion_date}</div>
</div>

<h2>1) BUYER SITE READINESS (REQUIRED)</h2>
<div class="box">
  Buyer is solely responsible for preparing the site to accept the Unit. At minimum, Buyer confirms and initials each requirement:
  <ol class="list">
    <li>Legal access, permits, approvals, and compliance with local codes/zoning are secured by Buyer prior to delivery. [[SITE_INITIALS_1]]</li>
    <li>Approach route supports oversize transport: width, height, and turning radius are adequate; obstructions trimmed/removed. [[SITE_INITIALS_2]]</li>
    <li>Ground conditions along the route and pad are firm, level, and dry; no soft sand, mud, or saturated soil. [[SITE_INITIALS_3]]</li>
    <li>Pad or foundation prepared to manufacturer spec, level within tolerance, and accessible to delivery vehicle(s). [[SITE_INITIALS_4]]</li>
    <li>Driveways/culverts/bridges rated for vehicle weight; Buyer assumes responsibility for any damage to private improvements. [[SITE_INITIALS_5]]</li>
    <li>All utilities (power, water, sewer/septic) are stubbed-out within required distance and capped for safe connection. [[SITE_INITIALS_6]]</li>
  </ol>
</div>

<h2>2) DELIVERY SCHEDULING & ACCESS</h2>
<div class="box">
  <ul class="list">
    <li>Dealer will coordinate a target delivery window after factory completion. Buyer shall be present or represented by an authorized adult. [[DELIVERY_INITIALS_1]]</li>
    <li>If route is impassable or unsafe on the scheduled day (weather, ground, obstacles), Dealer or carrier may postpone at their sole discretion. [[DELIVERY_INITIALS_2]]</li>
    <li>Escort/pilot cars, permits, or police details required by jurisdiction are billable to Buyer and will be invoiced at cost plus administrative fee. [[DELIVERY_INITIALS_3]]</li>
  </ul>
</div>

<h2>3) REDESIGN, REDELIVERY & STANDBY</h2>
<div class="box">
  <ul class="list">
    <li>If delivery cannot be completed due to site conditions not meeting Section 1, Buyer agrees to pay reasonable standby charges and any redelivery fees quoted by the carrier. [[FEES_INITIALS_1]]</li>
    <li>Any additional equipment required (e.g., skid steer, winch truck, crane) will be billed to Buyer at cost plus administrative fee. [[FEES_INITIALS_2]]</li>
    <li>Changes to the planned set requiring new drawings, permits, or engineering are out-of-scope and billable. [[FEES_INITIALS_3]]</li>
  </ul>
</div>

<h2>4) RISK OF LOSS & DAMAGE</h2>
<div class="box">
  <ul class="list">
    <li><span class="conspicuous">Risk of loss passes to Buyer upon factory completion.</span> Dealer will reasonably assist with carrier claims but is not liable for transit damage. [[RISK_INITIALS_1]]</li>
    <li>Minor transport scuffs and adjustments will be captured on a punch list and addressed per manufacturer policy; they do not constitute refusal of delivery. [[RISK_INITIALS_2]]</li>
  </ul>
</div>

<h2>5) INSURANCE</h2>
<div class="box">
  Buyer shall maintain insurance coverage from the time of factory completion, naming Firefly Tiny Homes LLC as additional insured for the Purchase Price minimum until final payment clears. Proof of coverage may be requested prior to release. [[INS_INITIALS]]
</div>

<h2>6) STORAGE AFTER COMPLETION</h2>
<div class="box">
  If delivery is delayed more than twelve (12) days after factory completion for reasons outside Dealer's control, storage fees of $50/day accrue and are due before release. [[STORAGE_INITIALS]]
</div>

<h2>7) INDEMNIFICATION</h2>
<div class="box">
  Buyer agrees to defend, indemnify, and hold harmless Dealer, its employees, and carriers from claims, damages, or costs arising from site conditions, access routes, or Buyer's directions, except to the extent caused by Dealer's gross negligence or willful misconduct. [[INDEM_INITIALS]]
</div>

<h2>8) GOVERNING TERMS</h2>
<div class="box small">
  This Agreement supplements the Master Retail Purchase Agreement and is governed by Texas law. In case of conflict, the Master Agreement controls except as to delivery logistics governed herein.
</div>

<div class="page-initials">
  Buyer Initials: [[BUYER_INITIALS]] &nbsp;&nbsp; Co-Buyer Initials: [[COBUYER_INITIALS]]
</div>

<h2>SIGNATURES</h2>
<div class="sig">
  <div class="sigrow"><div class="label">Dealer (Firefly Tiny Homes):</div><div class="line"></div></div>
  <div>By: [[FIREFLY_SIGNATURE]] &nbsp;&nbsp; Date: ____________</div>
</div>

<div class="sig">
  <div class="sigrow"><div class="label">Buyer:</div><div class="line"></div></div>
  <div>Signature: [[BUYER_SIGNATURE]] &nbsp;&nbsp; Date: ____________</div>
</div>

<div class="sig">
  <div class="sigrow"><div class="label">Co-Buyer (optional):</div><div class="line"></div></div>
  <div>Signature: [[COBUYER_SIGNATURE]] &nbsp;&nbsp; Date: ____________</div>
</div>

</body>
</html>`
}
