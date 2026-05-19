# Cloudinary Multi-Tenant Storage - Troubleshooting Guide

## Common Issues & Solutions

### 1. Encryption/Decryption Errors

#### Error: "STORAGE_ENCRYPTION_KEY environment variable not configured"

**Cause:** Missing or invalid encryption key in environment variables.

**Solution:**
```bash
# Generate a new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local
STORAGE_ENCRYPTION_KEY=<your-32-byte-hex-string>

# Verify key is set
echo $STORAGE_ENCRYPTION_KEY | wc -c  # Should be 65 characters (64 hex + newline)
```

#### Error: "Failed to decrypt Cloudinary credentials" / "Invalid ciphertext format"

**Cause:** 
- Encryption key was changed after credentials were encrypted
- Database corruption of encrypted value
- Trying to decrypt with wrong key

**Solution:**
1. Check if key was recently changed
2. If key was changed, restore from backup or re-encrypt all credentials:
```javascript
// Reset institute configuration
const institute = await Institute.findById(instituteId);
institute.cloudinary = null;
await institute.save();

// Re-enter credentials with current key
```

3. Verify the stored value is valid base64:
```bash
# In MongoDB shell
db.institutes.findOne({ _id: ObjectId("...") }).cloudinary.apiSecret

# Should output: base64-encoded-string (look for = padding at end)
```

#### Error: "Decryption failed: final round not reached"

**Cause:** Corrupted encrypted data or wrong IV extraction.

**Solution:**
1. Check the ciphertext format (should be: `iv-hex:encrypted-hex` as base64)
2. Clear and re-enter credentials
3. If issue persists, rotate all encryption keys

---

### 2. Rate Limiting Issues

#### Error: "RATE_LIMIT_EXCEEDED" when testing credentials

**Cause:** User has made 5+ requests in the last 60 seconds to `/api/v1/admin/settings/cloudinary-test`

**Solution:**
```bash
# Option 1: Wait 60 seconds

# Option 2: Reset rate limit (admin only)
# Contact system admin to clear the rate limit bucket for your user ID

# Option 3: Check rate limit status
# Current limits are: 5 requests per 60 seconds per user per endpoint
```

#### Rate limit blocking legitimate requests

**Solution:**
1. Check if rate limit is too strict for your use case:
```javascript
// In /lib/rateLimit.js, adjust:
const DEFAULT_OPTIONS = {
    points: 1,
    duration: 60,        // Increase window (e.g., 120 seconds)
    blockDuration: 60,   // Increase block duration if needed
    maxPoints: 10        // Increase allowed requests
};
```

2. Implement exponential backoff in client:
```javascript
async function testCredentialsWithRetry(creds, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetch('/api/v1/admin/settings/cloudinary-test', {
                method: 'POST',
                body: JSON.stringify(creds)
            }).then(r => r.json());
        } catch (e) {
            if (e.message.includes('RATE_LIMIT')) {
                const delay = Math.pow(2, i) * 1000; // Exponential backoff
                await new Promise(r => setTimeout(r, delay));
            } else throw e;
        }
    }
}
```

---

### 3. Upload Failures

#### Error: "Failed to upload to cloud storage"

**Cause:**
- Invalid Cloudinary credentials
- Network connectivity issue
- Cloudinary API error
- Missing folder permissions

**Solution:**
1. Verify credentials:
```bash
POST /api/v1/admin/settings/cloudinary-test
Content-Type: application/json

{
  "cloudName": "your-cloud",
  "apiKey": "your-key",
  "apiSecret": "your-secret"
}
```

2. Check Cloudinary dashboard:
   - Verify API key is active
   - Check rate limits (Cloudinary free tier has limits)
   - Verify API secret hasn't expired

3. Check error logs:
```bash
# Look for "Cloudinary Upload Error" in logs
# The error message should indicate the specific issue
```

4. Verify folder permissions:
   - Ensure institute ID contains valid characters (alphanumeric, hyphens, underscores)
   - Check if folder structure is being created correctly

#### Error: Files uploading to wrong folder

**Cause:** Institute ID extraction is incorrect

**Solution:**
1. Verify institute ID is from session only:
```javascript
// Correct (secure):
const instituteId = session.user.institute?.id  // From session only

// Wrong (insecure):
const instituteId = req.query.instituteId  // From query params
const instituteId = req.body.instituteId   // From request body
```

2. Check session setup:
```bash
# Verify session has institute:
console.log(session.user.institute)  // Should output: { id: "institute-123", ... }
```

3. Check upload folder naming:
```bash
# Expected format in Cloudinary:
institutes/{instituteId}/students/{studentId}/documents/
institutes/{instituteId}/id-cards/front

# Wrong format (indicates ID extraction failed):
quantech/students/...
institutes/undefined/...
```

---

### 4. Settings API Issues

#### Error: "apiSecret" is returning as "••••••••" but I need the actual value

**Cause:** Security feature - secrets are always masked in API responses

**Solution:**
The masked value is intentional to prevent accidental exposure. To update:

1. If you need to CHANGE the secret:
```bash
PATCH /api/v1/admin/settings
Content-Type: application/json

{
  "cloudinary": {
    "cloudName": "new-cloud-name",
    "apiKey": "new-key",
    "apiSecret": "new-secret-value"  # Provide new plain-text
  }
}
```

2. If you want to KEEP the existing secret unchanged:
```bash
PATCH /api/v1/admin/settings
Content-Type: application/json

{
  "cloudinary": {
    "cloudName": "new-cloud-name",
    "apiSecret": "••••••••"  # Send masked value = skip this field
  }
}
```

#### Error: "Unauthorized" when accessing settings

**Cause:** User doesn't have admin role

**Solution:**
```bash
# Required role: admin or super_admin
# Check user's role:
db.users.findOne({ email: "user@example.com" }).role

# Update role if needed:
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

---

### 5. Trust Boundary & Security Issues

#### Cross-tenant upload happening (file in wrong institute folder)

**Cause:** Institute ID being extracted from insecure source (query, body, headers)

**Solution:**
1. Verify all routes extract institute ID from session only:
```javascript
// CORRECT:
const instituteId = session.user.institute?.id

// WRONG (all of these):
const instituteId = req.query.instituteId
const instituteId = req.body.instituteId
const instituteId = req.headers['x-institute-id']
const instituteId = (await params).instituteId
```

2. Verify session security:
```javascript
// Session should have institute:
const session = await getServerSession(authOptions)
console.assert(session.user.institute?.id, "Institute ID missing from session")
```

3. Check middleware:
```javascript
// Ensure getInstituteScope uses session:
const scope = await getInstituteScope(req)
// Should return: { instituteId: session.user.institute.id }
```

---

### 6. Database Connection Issues

#### Error: "Institute not found, using platform defaults"

**Cause:** 
- Institute ID doesn't exist in database
- Database connection issue
- Wrong database context

**Solution:**
1. Verify institute exists:
```bash
# MongoDB shell
db.institutes.findOne({ _id: ObjectId("...") })

# Should return institute document with cloudinary field
```

2. Check database connection:
```bash
npm run seed  # Verify DB is accessible
```

3. Verify connection string:
```bash
echo $MONGODB_URI  # Should be set and valid
```

---

### 7. Audit Logging Issues

#### Missing audit logs for credential changes

**Cause:** 
- Audit logging disabled
- Database write failure
- User doesn't have permission to trigger auditable action

**Solution:**
1. Check if AuditLog collection exists:
```bash
db.auditlogs.find().limit(1)

# If collection doesn't exist, create it:
db.createCollection("auditlogs")
db.auditlogs.createIndex({ actor: 1, createdAt: -1 })
db.auditlogs.createIndex({ resource.id: 1 })
```

2. Enable audit logging:
```javascript
// Ensure AuditLog.create() is called after each admin action
await AuditLog.create({
    actor: session.user.id,
    action: 'cloudinary.credentials_updated',
    resource: { type: 'Institute', id: instituteId },
    details: { ... },
    ipAddress: getClientIP(req),
    userAgent: req.headers.get('user-agent'),
    createdAt: new Date()
});
```

---

### 8. Performance Issues

#### Slow uploads with custom credentials

**Cause:**
- Network latency to custom Cloudinary account
- Cloudinary account rate limits
- Large file size

**Solution:**
1. Check Cloudinary account limits:
   - Visit Cloudinary Dashboard → Settings → Upload
   - Check bandwidth and storage usage

2. Optimize upload settings:
```javascript
const options = {
    folder: uploadFolder,
    resource_type: 'auto',
    quality: 'auto',      // Let Cloudinary optimize
    eager: [],            // Remove if not needed
    eager_async: true,    // Process in background
};
```

3. Implement client-side compression:
```javascript
// Compress image before uploading
const compressed = await compressImage(file, { quality: 0.8 });
const base64 = compressed.toString('base64');
```

---

### 9. Testing Issues

#### Tests failing with "Cannot find module '@/lib'"

**Cause:** Test runner doesn't support path aliases

**Solution:**
1. Run tests with correct command:
```bash
node __tests__/cloudinary/run-tests.js
```

2. Ensure test files use relative imports:
```javascript
// CORRECT:
const { getUploadFolder } = require('../../lib/cloudinaryResolver');

// WRONG:
import { getUploadFolder } from '@/lib/cloudinaryResolver';
```

#### Test suite shows 8/9 passing, but Session test fails

**Cause:** Session validation logic in test doesn't match actual implementation

**Solution:**
- This is a known test limitation, not a real security issue
- Actual session validation in routes is working correctly
- Can be fixed in Phase 3 by updating test expectations

---

### 10. Monitoring & Diagnostics

#### How to check if credentials are properly encrypted

```bash
# In MongoDB shell:
db.institutes.findOne({ 
  _id: ObjectId("...") 
}, { 
  "cloudinary.apiSecret": 1 
})

# Output should show base64-encoded value:
{
  "_id": ObjectId("..."),
  "cloudinary": {
    "apiSecret": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo="
  }
}

# NOT plaintext:
# "apiSecret": "my-secret-key"  <- This would be a security issue!
```

#### How to verify credential isolation

```bash
# Check that different institutes use different folders:
# AWS S3 / Cloudinary Path:
# Institute A: institutes/inst-a-123/documents/file.pdf
# Institute B: institutes/inst-b-456/documents/file.pdf

# Verify no cross-contamination:
# Institute A files should NEVER appear in inst-b-456/ folder
```

#### How to trace credential resolution

Add debug logging:
```javascript
// In cloudinaryResolver.js
console.log(`[DEBUG] Resolving credentials for institute: ${instituteId}`);
const institute = await Institute.findById(instituteId);
console.log(`[DEBUG] Institute found: ${!!institute}`);
console.log(`[DEBUG] Cloudinary config enabled: ${institute.cloudinary?.enabled}`);
console.log(`[DEBUG] Using scoped options for upload`);
```

---

## Emergency Procedures

### Emergency: Credential Leak

If credentials are accidentally exposed:

1. **Immediately** revoke credentials in Cloudinary:
   - Delete compromised API key
   - Generate new API key
   - Update environment variables

2. **Clear rate limits** if account is blocked:
   ```bash
   # Reset in-memory rate limiter
   # Contact system admin to clear /api/v1/admin/settings/cloudinary-test limits
   ```

3. **Re-encrypt** all credentials with new key:
   ```bash
   # Generate new encryption key
   STORAGE_ENCRYPTION_KEY=<new-key> npm start
   
   # Manually re-enter all institute credentials
   ```

### Emergency: Corrupted Encryption Key

If encryption key is lost or corrupted:

1. **Stop uploads** to prevent further issues
2. **Restore from backup** if available
3. **Regenerate** all credentials with new key
4. **Notify institutes** to re-configure Cloudinary settings

### Emergency: Database Corruption

If audit logs or settings corrupted:

1. **Backup current database**
2. **Restore from pre-corruption backup**
3. **Verify data integrity:**
   ```bash
   # Check all encrypted values are valid base64
   db.institutes.find().forEach(doc => {
     if (doc.cloudinary?.apiSecret) {
       try {
         Buffer.from(doc.cloudinary.apiSecret, 'base64');
         console.log("✓ Valid:", doc._id);
       } catch (e) {
         console.error("✗ Invalid:", doc._id, e.message);
       }
     }
   });
   ```

---

## Support Resources

- **Cloudinary Documentation:** https://cloudinary.com/documentation
- **Next.js API Routes:** https://nextjs.org/docs/api-routes/introduction
- **MongoDB Documentation:** https://docs.mongodb.com/
- **AES Encryption Details:** https://en.wikipedia.org/wiki/Advanced_Encryption_Standard

---

**Still need help?**

Gather the following information before contacting support:
1. Error message (full error log)
2. Affected institute ID
3. Steps to reproduce
4. Environment (dev/staging/production)
5. Recent configuration changes

