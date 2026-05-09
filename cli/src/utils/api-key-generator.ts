import * as crypto from 'crypto';

export function generateApiKey(length: number = 32): string {
  try {
    const encoding = 'base64';
    return crypto.randomBytes(length).toString(encoding);
  } catch (err) {
    console.error('Error generating secret key:', err);
    process.exit(1);
  }
}