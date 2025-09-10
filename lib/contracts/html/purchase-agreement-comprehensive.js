/**
 * Comprehensive Purchase Agreement (Cash Sale) HTML Template
 * For Firefly Tiny Homes - Complete legal document with all sections A-S
 * Updated to match the comprehensive specification provided
 */

import { convertFieldTagsToHtmlElements } from './field-converter.js'

export function buildComprehensivePurchaseAgreementHtml() {
  // Use string concatenation to avoid linter issues with DocuSeal field syntax
  const field = (name, type = 'text', role = 'buyer', required = true) => {
    return `{{${name};type=${type};role=${role};required=${required}}}`;
  };

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>PURCHASE AGREEMENT (CASH SALE) - Firefly Tiny Homes</title>
<style>
  @page { size: Letter; margin: 0.75in; }
  body { 
    font-family: 'Times New Roman', serif; 
    font-size: 11pt; 
    line-height: 1.4; 
    color: #000; 
    margin: 0;
    padding: 0;
  }
  h1 { 
    font-size: 16pt; 
    font-weight: bold; 
    text-align: center; 
    margin: 0 0 20px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  h2 { 
    font-size: 12pt; 
    font-weight: bold; 
    margin: 16px 0 8px 0;
    text-transform: uppercase;
  }
  .header-info {
    margin-bottom: 20px;
    text-align: center;
  }
  .dealer-info {
    border: 1px solid #000;
    padding: 8px;
    margin: 8px 0;
    background-color: #f9f9f9;
  }
  .buyer-info {
    border: 1px solid #000;
    padding: 8px;
    margin: 8px 0;
    background-color: #f9f9f9;
  }
  .order-info {
    border: 1px solid #000;
    padding: 8px;
    margin: 8px 0;
    background-color: #f9f9f9;
  }
  .field-row {
    display: flex;
    margin: 4px 0;
    align-items: center;
  }
  .field-label {
    min-width: 120px;
    font-weight: bold;
    margin-right: 8px;
  }
  .field-value {
    flex: 1;
    border-bottom: 1px solid #000;
    min-height: 18px;
    padding: 2px 4px;
  }
  .price-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
  }
  .price-table th, .price-table td {
    border: 1px solid #000;
    padding: 6px 8px;
    text-align: left;
  }
  .price-table th {
    background-color: #e6e6e6;
    font-weight: bold;
  }
  .total-row {
    font-weight: bold;
    background-color: #f0f0f0;
  }
  .section {
    margin: 12px 0;
  }
  .section-content {
    margin: 8px 0;
    line-height: 1.5;
  }
  .conspicuous {
    font-weight: bold;
    text-transform: uppercase;
    background-color: #fff3cd;
    border: 2px solid #856404;
    padding: 8px;
    margin: 8px 0;
  }
  .plain-english {
    font-style: italic;
    color: #555;
    margin: 4px 0;
    font-size: 10pt;
  }
  .initials-line {
    margin: 12px 0;
    text-align: right;
  }
  .signature-section {
    margin: 20px 0;
    border: 1px solid #000;
    padding: 12px;
  }
  .signature-box {
    margin: 12px 0;
  }
  .signature-line {
    border-bottom: 1px solid #000;
    height: 40px;
    margin: 8px 0;
  }
  .page-break {
    page-break-before: always;
  }
  .acknowledgment-section {
    margin: 20px 0;
    border: 1px solid #000;
    padding: 12px;
    background-color: #f9f9f9;
  }
  .acknowledgment-item {
    margin: 8px 0;
    display: flex;
    align-items: center;
  }
  .acknowledgment-label {
    flex: 1;
    font-size: 10pt;
  }
  .acknowledgment-initials {
    width: 60px;
    border-bottom: 1px solid #000;
    margin: 0 8px;
    text-align: center;
  }
</style>
</head>
<body>

<h1>PURCHASE AGREEMENT (CASH SALE)</h1>

<div class="header-info">
  <div class="field-row">
    <span class="field-label">Effective Date:</span>
    <span class="field-value">${field('effective_date', 'date')}</span>
  </div>
</div>

<div class="dealer-info">
  <h2>Dealer / Seller ("Dealer")</h2>
  <div class="field-row">
    <span class="field-label">Legal Name:</span>
    <span class="field-value">Firefly Tiny Homes LLC</span>
  </div>
  <div class="field-row">
    <span class="field-label">Texas Retailer License #:</span>
    <span class="field-value">A164017</span>
  </div>
  <div class="field-row">
    <span class="field-label">Business Address:</span>
    <span class="field-value">6150 TX 16, Pipe Creek, TX 78063</span>
  </div>
  <div class="field-row">
    <span class="field-label">Phone:</span>
    <span class="field-value">830 328 6109</span>
  </div>
</div>

<div class="buyer-info">
  <h2>Buyer(s)</h2>
  <div class="field-row">
    <span class="field-label">Buyer Name:</span>
    <span class="field-value">${field('buyer_full_name')}</span>
    <span class="field-label">Phone:</span>
    <span class="field-value">${field('buyer_phone')}</span>
    <span class="field-label">Email:</span>
    <span class="field-value">${field('buyer_email')}</span>
  </div>
  <div class="field-row">
    <span class="field-label">Co Buyer (if any):</span>
    <span class="field-value">${field('cobuyer_full_name', 'text', 'cobuyer', false)}</span>
    <span class="field-label">Phone:</span>
    <span class="field-value">${field('cobuyer_phone', 'text', 'cobuyer', false)}</span>
    <span class="field-label">Email:</span>
    <span class="field-value">${field('cobuyer_email', 'text', 'cobuyer', false)}</span>
  </div>
  <div class="field-row">
    <span class="field-label">Mailing Address:</span>
    <span class="field-value">${field('buyer_address')}</span>
  </div>
  <div class="field-row">
    <span class="field-label">Delivery / Installation Address:</span>
    <span class="field-value">${field('delivery_address')}</span>
  </div>
</div>

<div class="order-info">
  <h2>Order / Reference</h2>
  <div class="field-row">
    <span class="field-label">Order / Quote #:</span>
    <span class="field-value">${field('order_id')}</span>
    <span class="field-label">Sales Agent:</span>
    <span class="field-value">${field('sales_agent')}</span>
    <span class="field-label">Model Year:</span>
    <span class="field-value">${field('model_year')}</span>
  </div>
</div>

<div class="section">
  <h2>A. DESCRIPTION OF UNIT</h2>
  <div class="section-content">
    <div class="field-row">
      <span class="field-label">Brand:</span>
      <span class="field-value">${field('model_brand')}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Model:</span>
      <span class="field-value">${field('model_code')}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Year:</span>
      <span class="field-value">${field('model_year')}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Dimensions (approx.):</span>
      <span class="field-value">${field('dimensions')}</span>
    </div>
    <div class="field-row">
      <span class="field-label">VIN/Serial (when assigned):</span>
      <span class="field-value">${field('vin_serial')}</span>
    </div>
    <div class="plain-english">
      Plain English summary: This section identifies exactly what you're buying so we both have the same understanding.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_a_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_a_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>B. PURCHASE PRICE & TAXES</h2>
  <div class="section-content">
    <table class="price-table">
      <tr>
        <th>Line Item</th>
        <th>Amount (USD)</th>
      </tr>
      <tr>
        <td>Base Price</td>
        <td>$${field('price_base')}</td>
      </tr>
      <tr>
        <td>Options / Upgrades</td>
        <td>$${field('price_options')}</td>
      </tr>
      <tr>
        <td>Freight (Estimate)</td>
        <td>$${field('price_freight_est')}</td>
      </tr>
      <tr>
        <td>Setup / Install (Estimate)</td>
        <td>$${field('price_setup')}</td>
      </tr>
      <tr>
        <td>Other (Title, Fees, etc.)</td>
        <td>$${field('price_other')}</td>
      </tr>
      <tr class="total-row">
        <td>Estimated Subtotal</td>
        <td>$${field('price_subtotal')}</td>
      </tr>
      <tr>
        <td>Sales Tax (if applicable)</td>
        <td>$${field('price_sales_tax')}</td>
      </tr>
      <tr class="total-row">
        <td>Total Purchase Price</td>
        <td>$${field('price_total')}</td>
      </tr>
    </table>
    <div class="plain-english">
      Notes: (i) Freight and setup are estimates, subject to change per Section H; (ii)<br>
      Plain English summary: We lay out all costs clearly. Some line items (like freight and setup) are estimates because they depend on final logistics.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_b_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_b_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>C. PAYMENT TERMS (CASH SALE)</h2>
  <div class="section-content">
    <p><strong>Deposit (Non Refundable):</strong> Buyer shall pay a deposit of 25% of the Total Purchase Price upon execution of this Agreement. This deposit becomes non refundable when Dealer places the Unit into the factory's build queue.</p>
    
    <p><strong>Final Payment:</strong> The remaining 75% balance is due in full prior to the Unit's release from the factory. Dealer will not schedule transport until cleared funds are received.</p>
    
    <p><strong>No Financing by Dealer:</strong> This is a cash sale. For a cash sale, Dealer does not extend credit or arrange financing.</p>
    
    <p><strong>Price Adjustments if Buyer Delays Authorization:</strong> If Buyer is not ready to authorize construction or delays selections beyond the timeframe required by the manufacturer, the price may be adjusted to reflect manufacturer increases or surcharge changes effective at the time authorization is given.</p>
    
    <p><strong>Late / Returned Payments:</strong> Payments not received when due may accrue a late charge up to the maximum allowed by Texas law. Returned/failed payments will incur bank and administrative fees.</p>
    
    <div class="plain-english">
      Plain English summary: 25% down locks your build slot; the rest is due before the home leaves the factory. Because suppliers and freight costs can change, waiting to authorize can change the price.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_c_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_c_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>D. TITLE / REGISTRATION & CLASSIFICATION ACKNOWLEDGMENT</h2>
  <div class="section-content">
    <p><strong>Park Model / Travel Trailer</strong> — Titled/registered as a travel trailer under Texas law; Buyer will complete required TxDMV forms.</p>
    
    <div class="initials-line">
      Buyer Initials: ${field('classification_ack_initials', 'initials')} &nbsp;&nbsp;&nbsp; 
      Date: ${field('classification_ack_date', 'date')}
    </div>
    
    <div class="plain-english">
      Plain English summary: A Park Model home is classified and treated the same as an RV (travel trailer) by Texas law, and is subject to DMV regulations and titling.
    </div>
  </div>
</div>

<div class="section">
  <h2>E. CHANGE ORDERS, SELECTIONS & NO ORAL PROMISES</h2>
  <div class="section-content">
    <p><strong>Changes Must Be in Writing:</strong> All modifications (features, finishes, options, colorways, or site related changes) must be made via a signed Change Order on Dealer's form; verbal promises are not binding. Changes may affect price and schedule.</p>
    
    <p><strong>Selection Deadlines:</strong> Buyer must finalize selections within the manufacturer's timeline. Missing deadlines can result in substitutions, schedule delays, and/or price adjustments per Section C.4.</p>
    
    <p><strong>No Oral Promises / Entire Agreement:</strong> No verbal statement by any employee or agent modifies this Agreement. Only a written, signed Change Order or amendment will be effective.</p>
    
    <div class="plain-english">
      Plain English summary: Changes are easy, but they must be written and signed. No verbal promises.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_e_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_e_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>F. STORAGE, RISK OF LOSS & INSURANCE</h2>
  <div class="section-content">
    <p><strong>Storage Charges After Factory Completion:</strong> If delivery does not occur within twelve (12) days of factory completion due to Buyer delay, storage fees of $50 per day will accrue and must be paid before release or delivery.</p>
    
    <p><strong>Risk of Loss:</strong> Risk of loss transfers to Buyer upon factory completion. Dealer will reasonably assist with carrier claims but is not liable for transit damage.</p>
    
    <div class="conspicuous">
      <strong>Insurance Requirement (Conspicuous):</strong> Buyer must obtain builder's risk or inland marine insurance coverage equal to the full Purchase Price of the Unit effective upon factory completion and continuing through transit. Firefly Tiny Homes LLC must be named as an additional insured. Proof of coverage is required before scheduling shipment.
    </div>
    
    <div class="plain-english">
      Plain English summary: Once the factory finishes your home, you need insurance and, if you're not ready for delivery within 12 days, storage costs kick in.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_f_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_f_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>G. DELIVERY, SET & SITE READINESS</h2>
  <div class="section-content">
    <p><strong>Buyer Responsibilities:</strong> Buyer is solely responsible for site readiness, including permitting, zoning approvals, access easements, pad/foundation readiness, utility stubs and connections, and clear, safe ingress/egress suitable for oversized transport.</p>
    
    <p><strong>Access & Conditions:</strong> Delivery requires adequate road width, turning radius, grade, load bearing, and overhead clearance (no low trees, wires, or bridges). If delivery cannot be completed due to site conditions, redelivery and standby charges apply.</p>
    
    <p><strong>Freight (Estimates Only):</strong> Freight quotes are estimates that may vary due to fuel surcharges, DOT re routing, escorts, law enforcement fees, road construction detours, terrain, or other conditions. Complex placements (e.g., cranes) are additional and billed to Buyer. Freight estimates do not guarantee final placement.</p>
    
    <p><strong>Scheduling:</strong> Dealer will coordinate an estimated delivery window. Actual timing depends on factory release, permits, routing, weather, and carrier availability. Force majeure applies (Section P).</p>
    
    <div class="plain-english">
      Plain English summary: We'll coordinate delivery, but you control the site. If special equipment or extra trips are needed, those costs are yours. Freight numbers are estimates.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_g_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_g_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>H. WARRANTY (CONSPICUOUS)</h2>
  <div class="section-content">
    <p><strong>Manufacturer's Limited Warranty Only:</strong> The Unit is covered solely by the Manufacturer's written limited warranty, which Buyer must register directly with the Manufacturer. Dealer provides no separate warranties.</p>
    
    <div class="conspicuous">
      <strong>DISCLAIMER OF IMPLIED WARRANTIES:</strong> TO THE MAXIMUM EXTENT PERMITTED BY TEXAS LAW, DEALER DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
    </div>
    
    <p><strong>Service Coordination:</strong> During the manufacturer's warranty period, Dealer may assist in coordinating service requests as a courtesy, but Manufacturer controls warranty coverage and remedies.</p>
    
    <div class="plain-english">
      Plain English summary: The factory's warranty applies. We disclaim other implied warranties as Texas law allows.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_h_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_h_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>I. INSPECTION AT DELIVERY; PUNCH LIST & ACCEPTANCE</h2>
  <div class="section-content">
    <p>At delivery/set, Buyer and Dealer (or carrier/installer on Dealer's behalf) will conduct a joint inspection and list punch list items. Except for items listed, Buyer accepts the Unit as substantially conforming. Reasonable punch list work will be scheduled.</p>
    
    <div class="plain-english">
      Plain English summary: We inspect together on delivery, list any small fixes, and then get them handled.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_i_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_i_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>J. LIEN WAIVERS (IF APPLICABLE)</h2>
  <div class="section-content">
    <p>For any Dealer performed site work, Dealer will provide Texas statutory lien waivers in compliance with Texas Property Code Chapter 53, effective upon actual receipt of funds.</p>
    
    <div class="plain-english">
      Plain English summary: If we do site work, we'll issue proper lien waivers once we're paid.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_j_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_j_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>K. CONSUMER DISCLOSURES & RIGHT TO CANCEL</h2>
  <div class="section-content">
    <p><strong>Texas Consumer Disclosures:</strong> Buyer acknowledges receipt of applicable consumer disclosures under the Texas Deceptive Trade Practices–Consumer Protection Act (DTPA). No verbal promises are binding.</p>
    
    <p><strong>Right to Cancel (If Applicable by Law):</strong> If this transaction qualifies as a home solicitation sale under Texas law, Buyer may cancel by delivering written notice to Dealer within three (3) business days from the Effective Date. If the transaction does not qualify, this statutory rescission period does not apply.</p>
    
    <div class="plain-english">
      Plain English summary: If state law grants a 3 day right to cancel for your situation, you have it. Otherwise, normal cancellation rules apply.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_k_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_k_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>L. CANCELLATION, TERMINATION & REMEDIES</h2>
  <div class="section-content">
    <p><strong>Buyer Cancellation:</strong> After execution, Buyer's cancellation results in forfeiture of the non refundable 25% deposit as liquidated damages to cover factory slotting, administrative work, and custom ordering. If the Manufacturer has begun production or Dealer incurred special order costs, Buyer remains responsible for such amounts if they exceed the deposit.</p>
    
    <p><strong>Seller Default:</strong> If Dealer materially defaults and cannot cure within a reasonable cure period after written notice, Buyer's sole remedy is the return of funds paid for undelivered goods/services (less amounts already paid to third parties at Buyer's request), and in no event consequential or special damages.</p>
    
    <p><strong>Time is of the Essence:</strong> The parties agree time is of the essence in all payment and performance obligations.</p>
    
    <p><strong>Limitation of Liability:</strong> To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, punitive, or consequential damages (including loss of use, loss of value, or lost profits), except for willful misconduct or amounts expressly due under this Agreement.</p>
    
    <div class="plain-english">
      Plain English summary: If you cancel, the deposit is forfeited; if we truly default, you get back what you paid for undelivered items; neither side owes the other for special losses.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_l_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_l_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>M. DISPUTE RESOLUTION (CONSPICUOUS – ARBITRATION & JURY TRIAL WAIVER)</h2>
  <div class="section-content">
    <div class="conspicuous">
      <strong>AGREEMENT TO ARBITRATE:</strong> ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THIS AGREEMENT OR THE UNIT SHALL BE RESOLVED BY BINDING ARBITRATION ADMINISTERED BY THE AMERICAN ARBITRATION ASSOCIATION (AAA) UNDER ITS CONSUMER ARBITRATION RULES. THE FEDERAL ARBITRATION ACT (FAA) GOVERNS THIS CLAUSE. THE SEAT/LOCATION OF ARBITRATION IS TEXAS. JUDGMENT ON THE AWARD MAY BE ENTERED IN ANY COURT WITH JURISDICTION. CLASS ACTIONS AND JURY TRIALS ARE WAIVED. NOTHING HEREIN PREVENTS EITHER PARTY FROM SEEKING TEMPORARY INJUNCTIVE RELIEF IN A COURT OF COMPETENT JURISDICTION TO PRESERVE THE STATUS QUO PENDING ARBITRATION.
    </div>
    
    <p><strong>Notice & Cure:</strong> Before filing arbitration, the complaining party shall give written Notice of Dispute and a 30 day opportunity to cure.</p>
    
    <p><strong>Small Claims Carve Out:</strong> Either party may bring an individual claim in small claims court if within that court's jurisdiction.</p>
    
    <div class="plain-english">
      Plain English summary: We resolve disputes through AAA consumer arbitration in Texas, not court (unless it's a small claim or we need a temporary order). No jury trial or class actions.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_m_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_m_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>N. ELECTRONIC SIGNATURES & E DELIVERY</h2>
  <div class="section-content">
    <p>The parties consent to electronic signatures and electronic records under the Texas UETA and federal ESIGN Act; electronic signatures and records have the same force and effect as handwritten signatures and paper records. Notices and copies may be provided electronically.</p>
    
    <div class="plain-english">
      Plain English summary: E signatures count the same as ink signatures.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_n_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_n_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>O. GOVERNING LAW; NOTICES; ASSIGNMENT</h2>
  <div class="section-content">
    <p><strong>Governing Law:</strong> This Agreement is governed by the laws of the State of Texas, without regard to conflicts rules.</p>
    
    <p><strong>Notices:</strong> Notices must be in writing and delivered by hand, certified mail, recognized courier, or email with confirmation, to the addresses on page 1 (or as updated in writing).</p>
    
    <p><strong>Assignment:</strong> Buyer may not assign this Agreement without Dealer's prior written consent. Dealer may assign to an affiliate or financing provider for administrative purposes.</p>
    
    <div class="plain-english">
      Plain English summary: Texas law applies. Notices go to the addresses we listed. You can't assign this agreement without our written OK.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_o_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_o_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>P. FORCE MAJEURE</h2>
  <div class="section-content">
    <p>Dealer is not liable for delays or nonperformance due to events beyond its reasonable control, including acts of God, weather, pandemic, labor shortages, strikes, accidents, supply chain disruptions, factory delays, government actions, utility outages, or transportation interruptions. Schedules will be adjusted accordingly.</p>
    
    <div class="plain-english">
      Plain English summary: If something truly out of anyone's control causes a delay, we'll adapt the schedule.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_p_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_p_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>Q. MISCELLANEOUS</h2>
  <div class="section-content">
    <p><strong>Entire Agreement; Severability:</strong> This Agreement (with its attachments) is the entire understanding between the parties and supersedes all prior discussions. If any provision is unenforceable, the remainder stays in effect. Modifications must be in writing and signed by both parties. No oral changes.</p>
    
    <p><strong>Headings & Plain English Summaries:</strong> Headings and summaries are for convenience only and do not alter the legal meaning.</p>
    
    <p><strong>Counterparts:</strong> This Agreement may be executed in counterparts (including e signatures), each deemed an original, together one instrument.</p>
    
    <p><strong>Attorney's Fees:</strong> The prevailing party in any action to enforce an arbitral award or to obtain injunctive relief may recover reasonable attorney's fees and costs if permitted by applicable law and AAA rules.</p>
    
    <div class="initials-line">
      Buyer Initials: ${field('pa_q_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_q_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="section">
  <h2>R. ATTACHMENTS / INCORPORATED DOCUMENTS</h2>
  <div class="section-content">
    <p>The following are incorporated by reference (and will be executed, where applicable):</p>
    <ul>
      <li>Construction Deposit & Payment Schedule Addendum (Deposit 25% non refundable; final due before release; payment methods; storage fees; no verbal promises).</li>
      <li>Delivery, Set & Site Readiness Agreement (permits, access, readiness, redelivery/standby; complex placements billed to Buyer).</li>
      <li>Freight, Routing & Special Handling Disclosure (estimates; surcharges; escorts; terrain; cranes; no guarantee of final placement).</li>
      <li>Notice of Completion, Storage & Risk of Loss (12 day window; $50/day storage; insurance at completion).</li>
      <li>Warranty & Service Acknowledgment (manufacturer's limited warranty; conspicuous disclaimers).</li>
      <li>Change Order Authorization (all changes in writing; price/schedule impact).</li>
      <li>Title / Registration & Classification Acknowledgment (travel trailer vs. real property).</li>
      <li>Final Inspection, Punch List & Acceptance (joint inspection; substantial conformity).</li>
      <li>Lien Waivers & Releases (Texas Statutory Forms) (if site work performed).</li>
      <li>Consumer Disclosures & Right to Cancel (DTPA disclosures; conditional 3 day rescission if applicable).</li>
      <li>Electronic Signature & E Delivery Consent (UETA / ESIGN).</li>
    </ul>
    
    <div class="plain-english">
      Plain English summary: These short forms go with the Agreement. They keep everything organized and crystal clear.
    </div>
    <div class="initials-line">
      Buyer Initials: ${field('pa_r_initials_buyer', 'initials')} &nbsp;&nbsp;&nbsp; 
      Co Buyer Initials: ${field('pa_r_initials_cobuyer', 'initials', 'cobuyer', false)}
    </div>
  </div>
</div>

<div class="page-break"></div>

<div class="section">
  <h2>S. SIGNATURES</h2>
  <div class="section-content">
    <p>By signing below, the parties agree to this Master Retail Purchase Agreement (Cash Sale) and acknowledge that they have read and understand all sections above, including the conspicuous warranty disclaimers and the arbitration clause with jury trial waiver.</p>
  </div>
</div>

<div class="signature-section">
  <h2>SELLER / DEALER</h2>
  <div class="signature-box">
    <div class="field-row">
      <span class="field-label">Firefly Tiny Homes LLC</span>
    </div>
    <div class="signature-line">
      By: ${field('dealer_signature', 'signature', 'firefly_signer')}
    </div>
    <div class="field-row">
      <span class="field-label">Name:</span>
      <span class="field-value">${field('dealer_signer_name', 'text', 'firefly_signer')}</span>
      <span class="field-label">Title:</span>
      <span class="field-value">${field('dealer_signer_title', 'text', 'firefly_signer')}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Date:</span>
      <span class="field-value">${field('dealer_signature_date', 'date', 'firefly_signer')}</span>
    </div>
  </div>
</div>

<div class="signature-section">
  <h2>BUYER</h2>
  <div class="signature-box">
    <div class="signature-line">
      Signature: ${field('buyer_signature', 'signature')}
    </div>
    <div class="field-row">
      <span class="field-label">Date:</span>
      <span class="field-value">${field('buyer_signature_date', 'date')}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Printed Name:</span>
      <span class="field-value">${field('buyer_printed_name')}</span>
    </div>
  </div>
</div>

<div class="signature-section">
  <h2>CO BUYER (if any)</h2>
  <div class="signature-box">
    <div class="signature-line">
      Signature: ${field('cobuyer_signature', 'signature', 'cobuyer', false)}
    </div>
    <div class="field-row">
      <span class="field-label">Date:</span>
      <span class="field-value">${field('cobuyer_signature_date', 'date', 'cobuyer', false)}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Printed Name:</span>
      <span class="field-value">${field('cobuyer_printed_name', 'text', 'cobuyer', false)}</span>
    </div>
  </div>
</div>

<div class="acknowledgment-section">
  <h2>Buyer's Initials Acknowledgment (Key Terms)</h2>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Payment Terms (25% non refundable deposit; final before release):</span>
    <span class="acknowledgment-initials">${field('ack_payment_terms_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_payment_terms_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Storage / Risk / Insurance (12 day window; $50/day; insurance at completion with additional insured):</span>
    <span class="acknowledgment-initials">${field('ack_storage_risk_insurance_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_storage_risk_insurance_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Delivery / Freight (estimates; escorts/cranes extra; no guarantee of final placement if conditions prevent):</span>
    <span class="acknowledgment-initials">${field('ack_delivery_freight_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_delivery_freight_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Warranty (manufacturer only; implied warranties disclaimed):</span>
    <span class="acknowledgment-initials">${field('ack_warranty_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_warranty_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Change Orders / No Verbal Promises (written only):</span>
    <span class="acknowledgment-initials">${field('ack_change_orders_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_change_orders_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Arbitration & Jury Trial Waiver (AAA Consumer Rules; FAA; Texas seat):</span>
    <span class="acknowledgment-initials">${field('ack_arbitration_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_arbitration_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
  <div class="acknowledgment-item">
    <span class="acknowledgment-label">• Consumer Disclosures & Conditional 3 Day Right to Cancel (if applicable):</span>
    <span class="acknowledgment-initials">${field('ack_disclosures_cancel_buyer', 'initials')}</span>
    <span class="acknowledgment-initials">${field('ack_disclosures_cancel_cobuyer', 'initials', 'cobuyer', false)}</span>
  </div>
</div>

<div class="section">
  <h2>Exhibit A – Price Detail (Optional)</h2>
  <div class="section-content">
    <p>Attach the final option/spec list and quote reference from your pricing worksheet for clarity.</p>
  </div>
</div>

</body>
</html>
`;

  // Convert curly brace field tags to HTML elements for DocuSeal HTML API
  return convertFieldTagsToHtmlElements(template);
}
