# Phase 1: Multi-Tenant Cloudinary Storage - Core Infrastructure

## ✅ Implementation Complete

### Security Controls Implemented

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| **SDK singleton credential bleed** | 🔴 High | Thread-safe scoped injection (no singleton mutations) | ✅ |
| **Encryption key co-location** | 🟠 Medium | Separate STORAGE_ENCRYPTION_KEY environment variable | ✅ |
| **API Secret exposure on read** | 🟠 Medium | Mask secret as "••••••••" in API responses | ✅ |
| **`instituteId` trust boundary** | 🟠 Medium | Enforce from session, never from query params | ✅ |
| **Upload folder namespacing** | 🟡 Low | Explicit prefix `institutes/{instituteId}/` | ✅ |

---

## 📁 Files Created/Modified

### New Files

1. **`lib/crypto.js`** - AES-256-CBC Encryption Utilities
   - `encrypt(plaintext, key)` - Encrypts secrets with random IV
   - `decrypt(ciphertext, key)` - Decrypts with IV extraction
   - `hashString(text)` - SHA-256 hashing utility

2. **`lib/cloudinaryResolver.js`** - Thread-Safe Cloudinary Resolver
   - `getCloudinaryOptions(instituteId)` - Scoped credential injection
   - `getUploadFolder(instituteId, subfolder)` - Dynamic folder paths
   - `validateCloudinaryCredentials(credentials)` - Test connection
   - `maskCloudinaryConfig(config)` - Mask secrets for API responses

3. **`lib/rateLimit.js`** - Rate Limiting Engine
   - Token bucket algorithm implementation
   - Max 5 requests per minute per user
   - Prevents brute-force attacks on credential validation

4. **`app/api/v1/admin/settings/route.js`** - Settings API
   - GET: Fetch settings with masked credentials
   - PATCH: Update settings with encrypted secrets
   - Handles credential preservation (skip update if "••••••••")

5. **`app/api/v1/admin/settings/cloudinary-test/route.js`** - Test Connection
   - Rate-limited endpoint for credential validation
   - 1x1 transparent PNG upload test
   - Records test results with audit trail

### Modified Files

1. **`models/Institute.js`**
   - Added `cloudinary` field with sub-fields:
     - `enabled` - Toggle custom Cloudinary
     - `cloudName` - Tenant's Cloudinary account name
     - `apiKey` - Tenant's API key
     - `apiSecret` - Encrypted API secret (stored encrypted)
     - `configuredAt` - When custom config was added
     - `lastTestedAt` - Last connection test time
     - `lastTestResult` - Test status and error message

2. **`app/api/v1/upload/route.js`**
   - Extract `instituteId` from session (never from query params)
   - Call `getCloudinaryOptions(instituteId)` for scoped injection
   - Use `getUploadFolder(instituteId)` for namespaced uploads
   - Pass tenant credentials safely to Cloudinary SDK

---

## 🔐 Security Guarantees

### 1. Thread-Safe Credential Injection
```javascript
// NO SINGLETON MUTATION - Safe for concurrent requests
const tenantOptions = await getCloudinaryOptions(instituteId);
const uploadOptions = {
    folder: `institutes/${instituteId}/uploads`,
    ...tenantOptions  // Scoped injection, not global config
};
```

### 2. Encryption Key Isolation
```javascript
// Separate environment variable - can be rotated independently
process.env.STORAGE_ENCRYPTION_KEY  // AES-256 key for secrets
process.env.DATABASE_URL            // DB credentials
process.env.CLOUDINARY_API_SECRET   // Platform defaults
```

### 3. Credential Masking on Read
```javascript
// Frontend receives masked value - prevents accidental exposure
{
    enabled: true,
    cloudName: "mycloud",
    apiKey: "abc123",
    apiSecret: "••••••••"  // Masked! Never shows real value
}
```

### 4. Trust Boundary Enforcement
```javascript
// ONLY SOURCE OF TRUTH - from authenticated JWT session
const instituteId = session.user.institute?.id;  // ✅ Trusted

// NEVER from untrusted sources
const instituteId = req.query.instituteId;       // ❌ Rejected
const instituteId = body.instituteId;            // ❌ Rejected
```

### 5. Folder Namespacing
```javascript
// All uploads prefixed with institute ID
folder: `institutes/${instituteId}/uploads`

// Even if credentials leaked, data is logically partitioned
// Cloudinary's API Key validation would still apply
```

---

## 🧪 Environment Variables Required

Add to `.env.local`:
```bash
# Encryption key for storing Cloudinary API secrets (32 bytes recommended)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
STORAGE_ENCRYPTION_KEY=your_32_byte_hex_string

# Existing Cloudinary platform defaults (unchanged)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Upload Request                                               │
│  POST /api/v1/upload { file, fileType }                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Extract instituteId from     │
        │ session.user.institute.id    │
        │ (NEVER from query/body)      │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ getCloudinaryOptions()       │
        │ - Query Institute document   │
        │ - Check if custom enabled    │
        │ - Decrypt apiSecret          │
        │ - Return scoped options      │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Thread-safe scoped injection │
        │ (NO global mutation)         │
        │ {                            │
        │   folder: `institutes/...`,  │
        │   cloud_name,                │
        │   api_key,                   │
        │   api_secret                 │
        │ }                            │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Cloudinary SDK               │
        │ upload_stream(...options)    │
        │ (Uses options, doesn't       │
        │  mutate global config)       │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Response to client           │
        │ { url, public_id }           │
        └──────────────────────────────┘
```

---

## 🛠️ How to Use

### 1. Configure Custom Cloudinary (Admin Dashboard)
```javascript
// PATCH /api/v1/admin/settings
{
    cloudinary: {
        enabled: true,
        cloudName: "tenant-cloud",
        apiKey: "key_123",
        apiSecret: "secret_456"  // Plain text - will be encrypted
    }
}

// API Response (masked)
{
    cloudinary: {
        enabled: true,
        cloudName: "tenant-cloud",
        apiKey: "key_123",
        apiSecret: "••••••••"  // Masked for security
    }
}
```

### 2. Test Connection (Before Saving)
```javascript
// POST /api/v1/admin/settings/cloudinary-test
{
    cloudName: "tenant-cloud",
    apiKey: "key_123",
    apiSecret: "secret_456"
}

// Response
{
    success: true,
    message: "Cloudinary connection test successful!",
    timestamp: "2024-01-15T10:30:00Z"
}
```

### 3. Update Existing Credentials
```javascript
// PATCH /api/v1/admin/settings
// If apiSecret is "••••••••", PRESERVES the existing encrypted value
// Only updates if new plain text value provided
{
    cloudinary: {
        cloudName: "new-cloud",
        apiSecret: "••••••••"  // Keeps existing encrypted value
    }
}
```

### 4. Upload Files (Automatic Tenant Routing)
```javascript
// Frontend code (unchanged)
const formData = new FormData();
formData.append('file', file);
formData.append('fileType', 'image');
await fetch('/api/v1/upload', { method: 'POST', body: formData });

// Backend automatically:
// 1. Extracts instituteId from session
// 2. Loads tenant's Cloudinary config
// 3. Routes to correct cloud account
// 4. Prefixes with institutes/{instituteId}/
```

---

## 📋 Testing Checklist (Phase 2)

- [ ] Unit tests for encryption/decryption
- [ ] Concurrent upload tests (prevent credential bleed)
- [ ] Payload validation tests (mask/unmask)
- [ ] Trust boundary tests (enforce instituteId from session)
- [ ] Rate limit tests (prevent brute force)

---

## ⚙️ Next Steps (Phase 2)

1. **Create Test Suite**
   - Concurrent leak test (50 simultaneous uploads)
   - Payload validation test (mask verification)
   - Trust boundary test (query param rejection)

2. **Update Existing Upload Routes**
   - `lib/cloudinary.js` helper functions
   - `app/api/v1/website/media/route.js`
   - `app/api/v1/students/[id]/documents/route.js`
   - `app/api/v1/id-cards/generate/route.js`

3. **Frontend Integration**
   - Add Cloudinary settings UI component
   - Test connection button with feedback
   - Save/update credentials with validation

4. **Production Deployment**
   - Set `STORAGE_ENCRYPTION_KEY` in production
   - Rotate existing credentials to new accounts (optional)
   - Enable custom Cloudinary for tier 2+ institutes

---

## 📝 Summary

**Phase 1 Core Infrastructure** implements all five security controls with:
- ✅ Zero singleton mutations (thread-safe scoped injection)
- ✅ Isolated encryption keys (separate env variable)
- ✅ Masked API responses (never expose secrets)
- ✅ Trusted institute isolation (session-only source of truth)
- ✅ Namespaced uploads (logical data partitioning)

**Build Status:** ✅ Success (no errors)

**Ready for:** Phase 2 (Tests & Integration)
