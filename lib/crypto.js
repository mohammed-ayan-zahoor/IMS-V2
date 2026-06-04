import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getMasterKey = () => {
  const key = process.env.DATABASE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('DATABASE_ENCRYPTION_KEY must be a 64-character hex string (256-bit).');
  }
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt a plain-text secret
 */
export function encryptSecret(plainText) {
  if (!plainText) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return IV, AuthTag, and Encrypted Text combined cleanly
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted secret
 */
export function decryptSecret(cipherText) {
  if (!cipherText) return null;
  
  try {
    const [ivHex, authTagHex, encryptedText] = cipherText.split(':');
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error('Invalid cipher text format.');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

/**
 * Encrypt a plain-text secret using a custom key (must be 64-character hex)
 */
export function encrypt(plainText, customKeyHex) {
  if (!plainText) return null;
  
  let keyBuffer;
  if (customKeyHex) {
    if (customKeyHex.length !== 64) throw new Error('Custom key must be 64-character hex string');
    keyBuffer = Buffer.from(customKeyHex, 'hex');
  } else {
    keyBuffer = getMasterKey();
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted secret using a custom key
 */
export function decrypt(cipherText, customKeyHex) {
  if (!cipherText) return null;
  
  try {
    let keyBuffer;
    if (customKeyHex) {
      if (customKeyHex.length !== 64) throw new Error('Custom key must be 64-character hex string');
      keyBuffer = Buffer.from(customKeyHex, 'hex');
    } else {
      keyBuffer = getMasterKey();
    }

    const [ivHex, authTagHex, encryptedText] = cipherText.split(':');
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error('Invalid cipher text format.');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}
