# Admin Edit/Upload Debug Test Plan

This guide verifies the end-to-end admin edit flow across Clerk → UI → API → Mongo → Cloudinary → UI state.

All diagnostics are gated behind DEBUG flags:
- Frontend: `VITE_DEBUG_ADMIN=true`
- Backend: `DEBUG_ADMIN=true`

Use the provided npm scripts for convenience:

```bash
npm run debug:dev        # Vite + vercel dev with debug flags
npm run debug:server     # Backend server with debug flag
```

## 1) Read flow sanity check
1. Load a model detail page.
2. In browser console, confirm `[DEBUG_ADMIN] Fetch model` followed by `Model loaded from API` (or fallback to local data logs in code path).
3. Check the data summary: `_id`, `modelCode`, `imagesLength`, `featuresLength`.

## 2) Edit/save text with/without token
1. Click `Edit` (must be admin). In the editor, change `Name` or `Description`.
2. Click `Save`.
3. Expect logs in console:
   - `AdminModelEditor: starting save` with `{ idParam, isAdmin }`.
   - `token from getToken()` with `hasToken/length`.
   - `Request` showing `PATCH /api/models/:code` and masked Authorization.
4. On the server, expect logs:
   - `models/[code]/index.patch called` with method/url/query.
   - `requireAuth` logs showing authorization header presence, `verifyToken` result, user emails, role, and admin decision booleans.
   - `Computed $set keys` and `Found model` summary.
   - `Update result` with `matchedCount`/`modifiedCount`.
5. On success, browser logs `onSaved(updated)` with summary and ModelDetail logs `onSaved(received)`.
6. If token is null, the editor will alert: `No Clerk token from getToken(). Are you signed in?` and no request is sent.

## 3) Admin mismatch scenarios
1. While signed in as a non-admin or with misconfigured `ADMIN_EMAILS`/role, attempt save.
2. Server logs show `requireAuth: admin decision` with `final: false` and route responds 403.
3. Use the temporary debug route (dev only): `GET /api/_debug/auth` with a Bearer token. It returns `{ ok, isAdmin, role, emails, reason }` to identify why admin evaluation failed.

## 4) Image upload/sign/persist
1. In editor Images tab, set a tag and choose a file.
2. Client logs:
   - `Upload image start` file info.
   - `getToken for sign` → `Request sign` to `/api/cloudinary/sign`.
   - `Sign response` showing `folder` and `cloudName`.
   - `Cloudinary upload start` and on success `Cloudinary upload success` with `public_id`.
   - `Persist image metadata` PATCH `/api/models/images?modelCode=...`.
3. Server logs:
   - `cloudinary/sign` with `folder`, `tags`, and public `cloudName`.
   - `models/images called` and `modelCode`.
   - Images PATCH/DELETE results with `matchedCount`/`modifiedCount`.

## 5) State refresh & reload persistence
1. After saving text or images, verify UI state updates immediately (logs in `onSaved(...)`).
2. Refresh the page; the GET handler logs should show `found: true` and the new data should render.

---

## Network/Logs Checklist

Browser Network:
- PATCH `/api/models/:code` → 200 with JSON body containing updated document.
- POST `/api/cloudinary/sign` → 200 with `{ timestamp, signature, apiKey, cloudName, folder }`.
- POST `https://api.cloudinary.com/.../image/upload` → 200 with `{ secure_url, public_id }`.
- PATCH `/api/models/images?modelCode=...` → 200 with updated document.

Server Logs (look for these exact strings):
- `[DEBUG_ADMIN] requireAuth:` entries for token + admin decision.
- `[DEBUG_ADMIN] Computed $set keys`
- `[DEBUG_ADMIN] Update result` or `images PATCH update result`
- `[DEBUG_ADMIN] Mongo: connecting`
- `[DEBUG_ADMIN] findModelById:` classification logs
- `[DEBUG_ADMIN] cloudinary/sign`
- `[DEBUG_ADMIN] === models/[code]/index.patch called ===`
- `[DEBUG_ADMIN] === models/images called ===`

---

## Capturing a failing case
1. In browser DevTools → Network → Export HAR of the failing interaction (save/upload).
2. Copy server console logs around the same timeframe.
3. Note the user identity (email), role, and `ADMIN_EMAILS`.

---

## Common fixes
- Token null: Ensure you are signed in, Clerk frontend is initialized, and domain matches `src/lib/clerkGuard.ts` guard. Try reloading or re-authenticating.
- Role mismatch: Set `user.publicMetadata.role = 'admin'` in Clerk, or add the email to `ADMIN_EMAILS` (server) and `VITE_ADMIN_EMAILS` (client).
- Route mismatch: Client should call `PATCH /api/models/:code` and `/api/models/images?modelCode=...`. Confirm paths in logs.
- Empty $set / no fields modified: Confirm you actually changed a value; watch `Computed $set keys` output.
- CORS: Server routes set permissive CORS in images and index.patch; if on a different origin, verify headers.
- 401/403: Token invalid or not admin; check `[DEBUG_ADMIN] requireAuth` logs and `/api/_debug/auth` route.
- 415/422/500: Check request `Content-Type`, body JSON structure, and server exception logs.


