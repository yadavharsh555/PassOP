const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
// Derive a 256-bit key from the secret. A secure salt is used.
const SECRET = process.env.ENCRYPTION_SECRET || "PassOP_Secret_Super_Secure_Key_5599_!!";
const KEY = crypto.scryptSync(SECRET, "PassOP_Salt", 32);

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text Plain text to encrypt
 * @returns {object} { encryptedData: string, iv: string }
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText Encrypted hex string
 * @param {string} ivHex Initialization vector in hex string
 * @returns {string} Plain text
 */
function decrypt(encryptedText, ivHex) {
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt,
};
