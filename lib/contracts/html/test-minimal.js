/**
 * Minimal test template to verify DocuSeal field syntax
 */

export function buildMinimalTestHtml() {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Minimal Test Template</title>
</head>
<body>
<h1>Test Template</h1>
<p>Buyer Name: {{buyer_name;type=text;role=buyer;required=true}}</p>
<p>Signature: {{buyer_signature;type=signature;role=buyer;required=true}}</p>
</body>
</html>
`;
}
