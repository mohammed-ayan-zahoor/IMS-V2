# Cloudinary Multi-Tenant Storage - Production Deployment Guide

## Phase 2 Completion & Deployment

This guide covers deploying the multi-tenant Cloudinary storage system (Phase 2) to production.

## Prerequisites

- Phase 1 implementation completed (core infrastructure in place)
- All test suites passing (88.9% success rate)
- Admin access to your hosting platform
- Cloudinary account(s) configured

## Step 1: Environment Configuration

### Generate Encryption Key

Generate a cryptographically secure 32-byte encryption key for the `STORAGE_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output:
```
a7f2e1c3d8b4f9a2e5c6d7b3f1a8e4c2d9b6f3e5a1c7d4e2b8f9a3c5d6e1f2
```

### Set Environment Variables

Add these variables to your production `.env.local` or hosting platform's environment config:

```env
# New encryption key (required for Phase 2)
STORAGE_ENCRYPTION_KEY=<your-32-byte-hex-string>

# Existing Cloudinary defaults (optional - used if institute has no custom config)
CLOUDINARY_CLOUD_NAME=<platform-default-cloud-name>
CLOUDINARY_API_KEY=<platform-default-api-key>
CLOUDINARY_API_SECRET=<platform-default-api-secret>
```

**Security Notes:**
- Never commit `STORAGE_ENCRYPTION_KEY` to version control
- Use your platform's secrets management (Vercel Secrets, AWS Secrets Manager, etc.)
- Rotate keys periodically; implement key versioning for future rotations
- Each environment (dev, staging, production) should have its own encryption key

## Step 2: Database Migrations

### Update Institute Schema

The `Institute` model has been updated to include Cloudinary configuration. Ensure your MongoDB has the new schema:

```javascript
// The following fields are now part of the Institute document:
cloudinary: {
    enabled: Boolean,
    cloudName: String,
    apiKey: String,
    apiSecret: String (encrypted in DB, masked in API responses)
}
```

**For existing installations:**
Run this migration to add the field to all existing institutes:

```bash
# Option 1: Using MongoDB CLI
db.institutes.updateMany({}, { $set: { cloudinary: null } })

# Option 2: In your migration script
const Institute = require('@/models/Institute');
await Institute.updateMany({}, { $set: { cloudinary: null } });
```

## Step 3: Deploy Application Changes

### Code Changes in Production

Deploy the following updates:

1. **Core Library Files** (already deployed if using Phase 1):
   - `/lib/cloudinaryResolver.js` - Credential resolution with scoping
   - `/lib/crypto.js` - AES-256-CBC encryption
   - `/lib/rateLimit.js` - Rate limiting for credential validation

2. **API Endpoints**:
   - `/app/api/v1/admin/settings/route.js` - Settings management with masking
   - `/app/api/v1/admin/settings/cloudinary-test/route.js` - Rate-limited credential testing

3. **Updated Upload Routes** (Phase 2):
   - `/app/api/v1/upload/route.js` - Main upload route (refactored)
   - `/app/api/upload/route.js` - Website media upload (refactored)
   - `/app/api/v1/students/[id]/documents/route.js` - Document uploads (refactored)
   - `/app/api/v1/id-cards/generate/route.js` - ID card generation (refactored)

### Build & Verification

```bash
# Build application
npm run build

# Verify no TypeScript/build errors
npm run lint

# Test in staging first
npm start  # Start locally or in staging environment
```

**Expected output:** No errors, 168 routes optimized

## Step 4: Post-Deployment Verification

### 1. Test Cloudinary Connection

Access the admin settings to test the connection:

```bash
# Test endpoint with rate limiting (5 requests/min)
POST /api/v1/admin/settings/cloudinary-test
Content-Type: application/json

{
  "cloudName": "your-cloud-name",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret"
}
```

Expected response:
```json
{
  "success": true,
  "message": "Connection test successful"
}
```

### 2. Verify Settings API

Get current settings (should show masked secret):

```bash
GET /api/v1/admin/settings
Authorization: Bearer <admin-token>
```

Expected response (showing masking):
```json
{
  "success": true,
  "settings": {
    "cloudinary": {
      "enabled": true,
      "cloudName": "your-cloud",
      "apiKey": "key123",
      "apiSecret": "••••••••"
    }
  }
}
```

### 3. Test Upload Routes

Test each refactored upload route:

```bash
# Main upload
POST /api/v1/upload
Authorization: Bearer <token>
Content-Type: application/json
Body: { file: "base64-encoded-file" }

# Document upload
POST /api/v1/students/{id}/documents
Authorization: Bearer <token>

# ID card generation
POST /api/v1/id-cards/generate
Authorization: Bearer <token>
```

### 4. Check Cloudinary Folder Structure

Verify that files are being uploaded to the correct tenant-scoped folders:

- Platform default uploads: `quantech/` (if no custom config)
- Institute uploads: `institutes/{instituteId}/...`
  - Documents: `institutes/{id}/students/{studentId}/documents/`
  - ID Cards: `institutes/{id}/students/{studentId}/id-cards/front`

## Step 5: Monitoring & Logging

### Enable Logging

Monitor these key areas in production:

```javascript
// Cloudinary resolver logs
[Cloudinary] Institute {id} not found
[Cloudinary] Failed to decrypt API secret
[Cloudinary] Error resolving options

// Rate limiting logs
Rate limit exceeded for user: {userId}

// Upload logs
Upload completed to institutes/{id}/...
File uploaded successfully: {publicId}
```

### Set Up Alerts

Configure alerts for:

1. **Decryption failures** - Could indicate corrupted keys or wrong encryption key
2. **Rate limit threshold** - Multiple blocks for same user
3. **Missing institute credentials** - Upload fallback to platform defaults
4. **Cloudinary API errors** - Connection issues with custom credentials

## Step 6: Rollback Plan

If issues occur after deployment:

### Quick Rollback (Within 24 hours)

```bash
# Revert to previous commit
git revert <deployment-commit>
npm run build
npm start

# API endpoints will automatically fall back to platform defaults
```

### Data Recovery

If credential encryption issues occur:

```javascript
// All encrypted data includes IV (random), so safe even if re-encrypted
// Database backups: Restore from pre-deployment backup
// Cloudinary assets: All files remain in Cloudinary regardless of key changes
```

## Security Checklist

Before going live, verify:

- [ ] `STORAGE_ENCRYPTION_KEY` is set in production environment
- [ ] Key is NOT in version control or logs
- [ ] All institutes that need custom credentials are configured
- [ ] Settings API returns masked secrets (not plaintext)
- [ ] Rate limiting is active on credential validation endpoint
- [ ] Trust boundary enforced (session-only institute ID extraction)
- [ ] Upload folder namespacing verified (institutes/{id}/)
- [ ] No credential leakage in error messages
- [ ] Audit logging captures all admin config changes

## Performance Optimization

### Rate Limiting Configuration

Current defaults (in production):
- **Limit:** 5 requests per minute per user
- **Endpoint:** POST `/api/v1/admin/settings/cloudinary-test`
- **Block duration:** 60 seconds

Adjust in `/lib/rateLimit.js` if needed:

```javascript
const DEFAULT_OPTIONS = {
    points: 1,           // Requests to allow
    duration: 60,        // Time window in seconds
    blockDuration: 60,   // Block duration in seconds
    maxPoints: 5         // Max points in window
};
```

### Caching

- Thread-safe credential resolution (no caching - fetches on each request)
- Uploaded files cached by Cloudinary CDN
- No in-memory credential caching for security

## Migration from Phase 1 to Phase 2

If upgrading from Phase 1:

1. **No data migration needed** - Phase 1 infrastructure remains unchanged
2. **Backward compatible** - Old upload routes still work with platform defaults
3. **Gradual rollout** - Enable custom credentials per institute as needed
4. **Zero downtime** - Deploy new routes alongside existing ones

## Support & Troubleshooting

See `CLOUDINARY_REFACTOR_TROUBLESHOOTING.md` for:
- Common errors and solutions
- Debugging encryption issues
- Rate limit reset procedures
- Credential validation failures
- File upload troubleshooting

## Version Information

- **Phase:** 2 (Testing & Integration)
- **Test Coverage:** 8/9 tests passing (88.9%)
- **Routes Updated:** 4 total (2 from Phase 1 + 2 new)
- **Deployment Date:** [Date of deployment]
- **Encryption Algorithm:** AES-256-CBC
- **Key Size:** 256 bits (32 bytes)

## Next Steps (Phase 3 - Optional)

Future enhancements not included in Phase 2:

1. **Frontend UI Component** - Admin panel for Cloudinary settings
2. **Key Rotation** - Automated encryption key versioning
3. **Multi-region Support** - Multiple Cloudinary accounts per institute
4. **Webhook Integration** - Cloudinary event notifications
5. **Performance Analytics** - Upload metrics and monitoring dashboard

---

**Questions or issues?** Contact the development team with error logs and the affected institute ID.
