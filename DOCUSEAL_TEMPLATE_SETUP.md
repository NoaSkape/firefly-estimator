# DocuSeal Template Setup Guide

## Overview
The contract signing system now supports 5 separate legal documents that need to be configured in DocuSeal and linked via environment variables.

## Required Environment Variables

Add these to your `.env` file and Vercel environment variables:

```env
# Existing (keep this)
DOCUSEAL_PURCHASE_TEMPLATE_ID=your_existing_purchase_agreement_template_id

# New templates (add these)
DOCUSEAL_PAYMENT_TERMS_TEMPLATE_ID=your_payment_terms_template_id
DOCUSEAL_DELIVERY_TEMPLATE_ID=your_delivery_agreement_template_id
DOCUSEAL_WARRANTY_TEMPLATE_ID=your_warranty_information_template_id
DOCUSEAL_LEGAL_DISCLOSURES_TEMPLATE_ID=your_legal_disclosures_template_id
```

## Template Setup Steps

### 1. Upload HTML Templates to DocuSeal

For each of the 5 templates, you need to:

1. Go to your DocuSeal dashboard
2. Create a new template
3. Upload the corresponding HTML file from the `templates/` folder:
   - `purchase-agreement.html` → Purchase Agreement template
   - `payment-terms-agreement.html` → Payment Terms Agreement template
   - `delivery-agreement.html` → Delivery Agreement template
   - `warranty-information.html` → Warranty Information template
   - `legal-disclosures.html` → Legal Disclosures template

### 2. Get Template IDs

After uploading each template:
1. Note the template ID from the URL or template settings
2. Add it to the corresponding environment variable

### 3. Test Template Integration

Once all templates are configured:
1. Create a new build and proceed to the contract page
2. Verify all 5 documents appear in the document tabs
3. Test signing each document individually
4. Verify the overall contract status updates correctly

## Template Field Mapping

All templates use the same prefill data structure from `buildContractPrefill()`. The field names in the HTML templates must match the prefill object keys:

- `order_id`, `order_date`
- `buyer_name`, `buyer_email`, `buyer_phone`, etc.
- `unit_brand`, `unit_model`, `unit_year`
- `base_price`, `total_price`, `deposit_amount`, etc.
- `delivery_address`, `delivery_city`, etc.

## Troubleshooting

### Missing Template Configuration
If you see "DocuSeal templates not fully configured" error:
- Check that all 5 environment variables are set
- Verify template IDs are valid numbers
- Ensure templates exist in your DocuSeal account

### Template Field Errors
If documents don't populate correctly:
- Verify field names in HTML templates match prefill data
- Check that templates are properly uploaded to DocuSeal
- Test individual template submissions in DocuSeal

### Status Tracking Issues
If document status doesn't update:
- Verify webhook URL is configured in DocuSeal
- Check webhook secret matches `DOCUSEAL_WEBHOOK_SECRET`
- Monitor webhook logs for errors

## Legal Review

**Important**: Before going live:
1. Have your legal counsel review all 5 templates
2. Make any necessary edits within DocuSeal
3. Test the complete signing flow with real data
4. Verify all legal requirements are met for your jurisdiction

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review server logs for API errors
3. Verify DocuSeal API connectivity
4. Test individual template submissions
