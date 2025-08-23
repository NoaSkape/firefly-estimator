# Customization Persistence Feature

## Overview

The Customization Persistence feature allows anonymous users to save their customization progress before creating an account, ensuring their work is not lost when they sign up or sign in.

## How It Works

### For Anonymous Users

1. **Automatic Saving**: When an anonymous user customizes a home (selects options, packages), their progress is automatically saved to `localStorage` with a 1-second debounce.

2. **Session Management**: Each anonymous user gets a unique session ID that persists across browser sessions.

3. **Expiration**: Anonymous customizations expire after 7 days to prevent storage bloat.

4. **Auto-Recovery**: When an anonymous user returns to a customization page, their previous selections are automatically restored.

### For Signed-In Users

1. **Migration**: When a user signs up or signs in, any anonymous customizations are automatically migrated to their account as builds.

2. **Redirection**: If the user was on a customization page when they signed in, they are redirected to their newly created build.

3. **Cleanup**: After successful migration, anonymous customizations are cleared from `localStorage`.

## Technical Implementation

### Storage Structure

```javascript
// localStorage keys follow this pattern:
// ff.customization.{modelId}.{sessionId}

// Example data structure:
{
  selectedOptions: [
    { id: 'option-1', name: 'Metal Roof', price: 2500 },
    { id: 'option-2', name: 'Hardwood Floors', price: 2800 }
  ],
  selectedPackage: 'premium-package',
  sessionId: 'uuid-v4-session-id',
  modelId: 'firefly-24',
  timestamp: 1640995200000,
  expiresAt: 1641600000000 // 7 days from timestamp
}
```

### Key Components

1. **`src/utils/customizationStorage.js`**: Core utility functions for managing anonymous customizations
2. **`src/components/CustomizationMigration.jsx`**: Background component that handles migration when users sign in
3. **`src/pages/Customize.jsx`**: Updated to integrate with the storage system

### API Integration

The system integrates with the existing builds API:

- **`POST /api/builds`**: Creates builds from migrated customizations
- **Idempotency**: Uses unique keys to prevent duplicate builds during migration

## User Experience Flow

### Anonymous User Journey

1. User visits `/customize/firefly-24`
2. User selects options and packages
3. Progress is automatically saved every 1 second
4. User clicks "Create Account" or "Sign In"
5. User completes authentication
6. Customization is migrated to their account
7. User is redirected to their new build

### Signed-In User Journey

1. User visits `/customize/firefly-24`
2. User selects options and packages
3. User clicks "Save"
4. Build is created in their account
5. User proceeds to checkout

## Error Handling

- **Storage Failures**: Graceful fallback if `localStorage` is unavailable
- **Migration Failures**: User is notified but can still access their account
- **Expired Data**: Automatic cleanup of expired customizations
- **Network Issues**: Customizations remain in `localStorage` until next successful migration

## Configuration

### Environment Variables

No additional environment variables are required.

### Storage Limits

- **Expiration**: 7 days
- **Storage Key Prefix**: `ff.customization.`
- **Session Key**: `ff.anonymous.session`

## Testing

### Manual Testing

1. **Anonymous Customization**:
   - Visit `/customize/firefly-24` without signing in
   - Select some options and packages
   - Refresh the page - customizations should be restored
   - Check browser devtools → Application → Local Storage

2. **Migration Testing**:
   - Customize a home as anonymous user
   - Sign up for a new account
   - Verify customizations are migrated to builds
   - Check that anonymous data is cleared

3. **Expiration Testing**:
   - Manually modify `expiresAt` in localStorage to a past date
   - Refresh page - expired data should be cleaned up

### Automated Testing

Run the test utility in browser console:

```javascript
import { testCustomizationStorage } from './src/utils/customizationStorage.test.js'
testCustomizationStorage()
```

## Security Considerations

- **Session Isolation**: Each anonymous session is isolated
- **Data Privacy**: Only customization data is stored, no personal information
- **Automatic Cleanup**: Expired data is automatically removed
- **No Server Storage**: Anonymous data is only stored client-side

## Performance Impact

- **Minimal**: Uses debounced saves to prevent excessive writes
- **Storage**: ~1-5KB per customization
- **Migration**: Single API call per customization during sign-in

## Future Enhancements

1. **Cloud Sync**: Store anonymous customizations in the cloud for cross-device access
2. **Social Sharing**: Allow sharing of customizations via URL
3. **Comparison**: Allow comparing multiple customizations
4. **Templates**: Save popular customization combinations as templates

## Troubleshooting

### Common Issues

1. **Customizations Not Saving**:
   - Check if `localStorage` is available
   - Verify browser storage permissions
   - Check console for errors

2. **Migration Not Working**:
   - Verify user is authenticated
   - Check network connectivity
   - Review API response in devtools

3. **Data Not Restoring**:
   - Check if data has expired
   - Verify session ID consistency
   - Clear and retry

### Debug Commands

```javascript
// Check all anonymous customizations
localStorage.getItem('ff.anonymous.session')
Object.keys(localStorage).filter(key => key.startsWith('ff.customization.'))

// Clear all anonymous data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('ff.')) localStorage.removeItem(key)
})
```
