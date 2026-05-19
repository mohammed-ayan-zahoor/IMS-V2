import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, IV is always 16 bytes

/**
 * Encrypts a plaintext string using AES-256-CBC
 * 
 * @param {string} plaintext - The text to encrypt
 * @param {string} encryptionKey - The encryption key (must be 32 bytes for AES-256)
 * @returns {string} - The encrypted text with IV prepended (base64 encoded)
 * @throws {Error} - If encryption key is invalid or encryption fails
 */
export function encrypt(plaintext, encryptionKey) {
    if (!plaintext) return null;
    if (!encryptionKey) {
        throw new Error('Encryption key is required');
    }

    // Ensure key is 32 bytes for AES-256
    const key = crypto
        .createHash('sha256')
        .update(String(encryptionKey))
        .digest();

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted text and return as base64
    const ivAndEncrypted = iv.toString('hex') + ':' + encrypted;
    return Buffer.from(ivAndEncrypted).toString('base64');
}

/**
 * Decrypts a ciphertext string using AES-256-CBC
 * 
 * @param {string} ciphertext - The encrypted text (base64 encoded with IV prepended)
 * @param {string} encryptionKey - The encryption key (must be 32 bytes for AES-256)
 * @returns {string} - The decrypted plaintext
 * @throws {Error} - If decryption key is invalid or decryption fails
 */
export function decrypt(ciphertext, encryptionKey) {
    if (!ciphertext) return null;
    if (!encryptionKey) {
        throw new Error('Encryption key is required');
    }

    // Ensure key is 32 bytes for AES-256
    const key = crypto
        .createHash('sha256')
        .update(String(encryptionKey))
        .digest();

    // Decode from base64 and extract IV
    const ivAndEncrypted = Buffer.from(ciphertext, 'base64').toString();
    const parts = ivAndEncrypted.split(':');
    
    if (parts.length !== 2) {
        throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Decrypt the ciphertext
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Hash a string using SHA-256
 * 
 * @param {string} text - The text to hash
 * @returns {string} - The hex-encoded SHA-256 hash
 */
export function hashString(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text).digest('hex');
}
