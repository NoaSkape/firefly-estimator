# Firefly Estimator - Admin Content Management Upgrade

This upgrade adds admin-managed content for base models with photo uploads (Cloudinary) and editable descriptions (MongoDB).

## New Features

### Admin Content Management
- **Photo Uploads**: Admins can upload images directly to Cloudinary with signed uploads
- **Editable Descriptions**: Admins can edit model descriptions in real-time
- **Image Gallery**: Dynamic image gallery with admin upload capabilities
- **Role-Based Access**: Admin features only visible to users with `role: "admin"` in Clerk metadata

### API Endpoints

#### Authentication Required (All endpoints)
- `GET /api/models/:modelCode` - Get model details (signed-in users)
- `PATCH /api/models/:modelCode/description` - Update description (admin only)
- `POST /api/models/:modelCode/images` - Add image metadata (admin only)
- `POST /api/cloudinary/sign` - Get signed upload parameters (admin only)

#### Health Check
- `GET /api/health` - API health status

### Database Schema

The `baseModels` collection uses this schema:
```javascript
{
  modelCode: String, // unique
  name: String,
  subtitle: String,
  width: Number,
  squareFeet: Number,
  basePrice: Number,
  description: String,
  images: [{ url, publicId, tag }],
  updatedAt: Date
}
```

## Setup Instructions

### 1. Environment Variables
Ensure these environment variables are set:
```bash
CLERK_SECRET_KEY=your_clerk_secret_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_ROOT_FOLDER=firefly-estimator/models
```

### 2. Database Migration
Run the migration script to populate the database with existing model data:
```bash
npm run migrate
```

### 3. Local Development
Start the development server with both frontend and backend:
```bash
npm run dev
```

This will start:
- Vite dev server on port 5173
- Vercel dev server on port 3000
- API proxy configured to forward `/api/*` requests to the backend

### 4. Admin Setup
To make a user an admin, set their `publicMetadata.role` to `"admin"` in Clerk:
1. Go to Clerk Dashboard
2. Find the user
3. Edit their metadata: `{ "role": "admin" }`

## Usage

### For Admins
1. **Edit Descriptions**: Click "Edit" next to the description on any model detail page
2. **Upload Images**: Use the upload form on model detail pages
   - Select image tag (gallery, hero, floorplan, etc.)
   - Choose image file (max 10MB, jpg/jpeg/png/webp)
   - Images are automatically uploaded to Cloudinary and saved to the database

### For Users
- View model details and images
- Navigate through image galleries
- No admin features visible

## File Structure Changes

### New Files
- `api/cloudinary/sign.js` - Cloudinary signed upload endpoint
- `scripts/migrate-data.js` - Database migration script
- `scripts/test-api.js` - API testing script
- `vercel.json` - Vercel configuration

### Updated Files
- `lib/db.js` - Simplified MongoDB connection
- `lib/auth.js` - Updated auth with admin role checking
- `lib/cloudinary.js` - Simplified Cloudinary configuration
- `api/models/[code]/get.js` - Updated to use new schema
- `api/models/[code]/description.patch.js` - Updated for admin-only access
- `api/models/[code]/images.post.js` - Updated for new image structure
- `src/pages/ModelDetail.jsx` - Complete rewrite with admin features
- `src/App.jsx` - Updated routing to use modelCode
- `package.json` - Updated scripts for new dev workflow
- `vite.config.js` - Updated proxy configuration

## Security Features

- **File Validation**: Only jpg/jpeg/png/webp files accepted
- **Size Limits**: Maximum 10MB per image
- **Admin Authorization**: All write operations require admin role
- **Signed Uploads**: Cloudinary uploads use server-signed parameters
- **No Public Signup**: App remains behind Clerk authentication

## Production Deployment

The production deployment remains unchanged - Vercel will automatically deploy the serverless functions and the frontend will work with the new API structure.

## Troubleshooting

### Common Issues

1. **API 401/403 Errors**: Ensure user is signed in and has proper permissions
2. **Image Upload Fails**: Check Cloudinary environment variables and file size
3. **Database Connection**: Verify MONGODB_URI is correct
4. **Admin Features Not Visible**: Check user's `publicMetadata.role` in Clerk

### Testing
Run the API test script to verify endpoints:
```bash
node scripts/test-api.js
```

## Migration Notes

- Existing model data is preserved and migrated to the new schema
- Frontend continues to work with existing quote builder functionality
- No breaking changes to existing features
- Admin features are additive and don't affect regular user experience 