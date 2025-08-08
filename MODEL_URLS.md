# Model URL Structure Documentation

## Overview

The Firefly Estimator now supports SEO-friendly URLs for all 16 tiny home models. Each model has its own dedicated page with a clean, memorable URL structure.

## URL Structure

### Format
```
https://fireflyestimator.com/models/{model-slug}
```

### Examples
- `https://fireflyestimator.com/models/magnolia` → The Magnolia (APS-630)
- `https://fireflyestimator.com/models/bluebonnet` → The Bluebonnet (APS-601)
- `https://fireflyestimator.com/models/nest` → The Nest (APS-520MS)
- `https://fireflyestimator.com/models/juniper-xl` → The Juniper XL (APX-150)

## Complete Model URL Mapping

| Model Name | URL Slug | Model ID | Base Price |
|------------|----------|----------|------------|
| The Magnolia | `magnolia` | aps-630 | $71,475 |
| The Bluebonnet | `bluebonnet` | aps-601 | $70,415 |
| The Nest | `nest` | aps-520ms | $69,780 |
| The Azul | `azul` | aps-523 | $69,385 |
| The Meadow | `meadow` | aps-528 | $67,325 |
| The Lookout | `lookout` | aps-527b | $67,075 |
| The Canyon | `canyon` | aps-532 | $66,505 |
| The Falcon | `falcon` | apx-118sl | $66,471 |
| The Hilltop | `hilltop` | aps-544 | $62,995 |
| The Juniper XL | `juniper-xl` | apx-150 | $62,971 |
| The Sage | `sage` | aps-550 | $62,505 |
| The Homestead | `homestead` | aps-531 | $61,860 |
| The Willow | `willow` | apx-118 | $60,971 |
| The Ranch | `ranch` | apx-122 | $57,243 |
| The Juniper | `juniper` | aps-522a | $55,985 |
| The Pecan | `pecan` | aps-590 | $54,785 |

## Technical Implementation

### URL Mapping Utility (`src/utils/modelUrlMapping.js`)

The application uses a centralized mapping system to convert between:
- Model names → URL slugs
- URL slugs → Model IDs
- Model IDs → URL slugs

### Key Functions

- `modelNameToSlug(modelName)` - Converts "The Magnolia" to "magnolia"
- `slugToModelId(slug)` - Converts "magnolia" to "aps-630"
- `isValidSlug(slug)` - Validates if a slug is supported
- `getModelBySlug(slug, models)` - Gets model data from slug

### Route Structure

The application supports both individual routes and a fallback dynamic route:

```jsx
{/* Individual model routes for SEO */}
{modelSlugs.map(slug => (
  <Route
    key={slug}
    path={`/models/${slug}`}
    element={<ModelDetail />}
  />
))}

{/* Fallback dynamic route */}
<Route 
  path="/models/:modelCode" 
  element={<ModelDetail />} 
/>
```

## SEO Features

### Page Titles
Each model page has a unique, SEO-optimized title:
- `"The Magnolia - Firefly Tiny Homes"`
- `"The Bluebonnet - Firefly Tiny Homes"`

### Meta Descriptions
Dynamic meta descriptions include model name and description:
- `"The Magnolia - 1 BR / 1 Bath W/ 6ft Porch - Explore this beautiful tiny home model from Firefly Tiny Homes."`

### Structured Data
Each page includes JSON-LD structured data for rich snippets:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "The Magnolia",
  "description": "1 BR / 1 Bath W/ 6ft Porch",
  "brand": {
    "@type": "Brand",
    "name": "Firefly Tiny Homes"
  },
  "offers": {
    "@type": "Offer",
    "price": 71475,
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
```

## Error Handling

### Graceful Fallbacks
- Invalid URLs redirect to a "Model Not Found" page
- Legacy modelCode URLs still work (e.g., `/models/aps-630`)
- Error boundaries catch and handle unexpected errors

### Development Testing
The application includes comprehensive testing utilities:
- `testModelUrls()` - Validates all URL mappings
- `generateModelSitemap()` - Generates a sitemap of all URLs
- `validateModelUrl(url)` - Validates specific URLs

## Performance Optimizations

### Local Data Loading
For slug-based URLs, the application loads model data from local files first, reducing API calls and improving performance.

### Lazy Loading
Model images are loaded on-demand to improve page load times.

### SEO Optimization
- Server-side rendering ready
- Meta tags updated dynamically
- Structured data for search engines

## Migration Notes

### Backward Compatibility
- Legacy URLs (e.g., `/models/aps-630`) still work
- Existing links will continue to function
- No breaking changes for existing integrations

### URL Generation
When linking to models, use the new URL structure:
```jsx
// ✅ Recommended
navigate(`/models/magnolia`)

// ✅ Still works (legacy)
navigate(`/models/aps-630`)
```

## Testing

### Development Mode
In development, the application automatically tests all URLs on startup:
```javascript
// Console output in development
🧪 Testing Model URL Mapping...
✅ magnolia → aps-630 → The Magnolia
✅ bluebonnet → aps-601 → The Bluebonnet
...
🎉 All model URL tests passed!
```

### Manual Testing
Test each URL manually:
1. Navigate to `http://localhost:5173/models/magnolia`
2. Verify the page loads correctly
3. Check that the model information is accurate
4. Test the "Choose This Model" functionality

## Future Enhancements

### Planned Features
- Breadcrumb navigation
- Related model suggestions
- Social media sharing
- Analytics tracking
- A/B testing capabilities

### Potential Improvements
- Image optimization
- Caching strategies
- CDN integration
- Advanced SEO features 