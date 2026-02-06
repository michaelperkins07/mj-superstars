// ============================================================
// MJ's Superstars - Security Middleware Tests
// ============================================================

const {
  sanitizeString,
  sanitizeEmail,
  sanitizeInt,
  sanitizeUUID,
  sanitizeObject,
  validatePassword,
  encrypt,
  decrypt,
  hash,
  generateSecureToken,
  blacklistToken,
  isTokenBlacklisted,
  maskSensitiveData,
  stripSensitiveFields
} = require('../../middleware/security');

describe('Security Middleware', () => {
  // ============================================================
  // STRING SANITIZATION TESTS
  // ============================================================

  describe('sanitizeString', () => {
    test('returns empty string for non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
    });

    test('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    test('removes script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeString(input)).toBe('Hello');
    });

    test('removes onclick attributes', () => {
      const input = '<div onclick="evil()">Click me</div>';
      const result = sanitizeString(input);
      expect(result).not.toContain('onclick');
    });

    test('respects maxLength parameter', () => {
      const input = 'A'.repeat(100);
      expect(sanitizeString(input, 50)).toHaveLength(50);
    });

    test('removes null bytes', () => {
      const input = 'Hello\0World';
      expect(sanitizeString(input)).toBe('HelloWorld');
    });

    test('preserves normal text', () => {
      const input = 'Hello, World! 123';
      expect(sanitizeString(input)).toBe('Hello, World! 123');
    });

    test('handles unicode characters', () => {
      const input = 'Hello 👋 World 🌍';
      expect(sanitizeString(input)).toBe('Hello 👋 World 🌍');
    });
  });

  // ============================================================
  // EMAIL SANITIZATION TESTS
  // ============================================================

  describe('sanitizeEmail', () => {
    test('returns empty string for non-string input', () => {
      expect(sanitizeEmail(null)).toBe('');
      expect(sanitizeEmail(123)).toBe('');
    });

    test('converts to lowercase', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    test('trims whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    test('validates email format', () => {
      expect(sanitizeEmail('valid@example.com')).toBe('valid@example.com');
      expect(sanitizeEmail('invalid-email')).toBe('');
      expect(sanitizeEmail('@missing-local.com')).toBe('');
      expect(sanitizeEmail('missing-domain@')).toBe('');
    });

    test('limits email length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = sanitizeEmail(longEmail);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    test('handles common email formats', () => {
      expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
      expect(sanitizeEmail('user.name@example.co.uk')).toBe('user.name@example.co.uk');
    });
  });

  // ============================================================
  // INTEGER SANITIZATION TESTS
  // ============================================================

  describe('sanitizeInt', () => {
    test('parses valid integers', () => {
      expect(sanitizeInt('42')).toBe(42);
      expect(sanitizeInt(42)).toBe(42);
      expect(sanitizeInt('100')).toBe(100);
    });

    test('returns min for invalid input', () => {
      expect(sanitizeInt('not-a-number')).toBe(0);
      expect(sanitizeInt(null)).toBe(0);
      expect(sanitizeInt(undefined)).toBe(0);
    });

    test('clamps to min value', () => {
      expect(sanitizeInt(-10, 0)).toBe(0);
      expect(sanitizeInt(5, 10)).toBe(10);
    });

    test('clamps to max value', () => {
      expect(sanitizeInt(100, 0, 50)).toBe(50);
      expect(sanitizeInt(1000, 0, 100)).toBe(100);
    });

    test('handles floating point input', () => {
      expect(sanitizeInt('42.9')).toBe(42);
      expect(sanitizeInt(42.9)).toBe(42);
    });
  });

  // ============================================================
  // UUID SANITIZATION TESTS
  // ============================================================

  describe('sanitizeUUID', () => {
    test('returns null for non-string input', () => {
      expect(sanitizeUUID(null)).toBeNull();
      expect(sanitizeUUID(123)).toBeNull();
    });

    test('validates UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(sanitizeUUID(validUUID)).toBe(validUUID);
    });

    test('converts to lowercase', () => {
      const upperUUID = '550E8400-E29B-41D4-A716-446655440000';
      expect(sanitizeUUID(upperUUID)).toBe(upperUUID.toLowerCase());
    });

    test('returns null for invalid UUIDs', () => {
      expect(sanitizeUUID('not-a-uuid')).toBeNull();
      expect(sanitizeUUID('550e8400-e29b-41d4-a716')).toBeNull();
      expect(sanitizeUUID('550e8400e29b41d4a716446655440000')).toBeNull();
    });

    test('trims whitespace', () => {
      const uuid = '  550e8400-e29b-41d4-a716-446655440000  ';
      expect(sanitizeUUID(uuid)).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  // ============================================================
  // OBJECT SANITIZATION TESTS
  // ============================================================

  describe('sanitizeObject', () => {
    test('sanitizes string values', () => {
      const input = { name: '<script>evil</script>John' };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
    });

    test('preserves numbers', () => {
      const input = { age: 25, score: 98.5 };
      const result = sanitizeObject(input);
      expect(result.age).toBe(25);
      expect(result.score).toBe(98.5);
    });

    test('preserves booleans', () => {
      const input = { active: true, verified: false };
      const result = sanitizeObject(input);
      expect(result.active).toBe(true);
      expect(result.verified).toBe(false);
    });

    test('handles nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          profile: {
            bio: '<script>alert()</script>Hello'
          }
        }
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('John');
      expect(result.user.profile.bio).toBe('Hello');
    });

    test('handles arrays', () => {
      const input = {
        tags: ['<b>tag1</b>', 'tag2', '<script>x</script>tag3']
      };
      const result = sanitizeObject(input);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('limits array length', () => {
      const input = {
        items: Array(200).fill('item')
      };
      const result = sanitizeObject(input);
      expect(result.items.length).toBe(100);
    });

    test('prevents deep recursion', () => {
      // Create a deeply nested object
      let obj = { value: 'test' };
      for (let i = 0; i < 15; i++) {
        obj = { nested: obj };
      }

      const result = sanitizeObject(obj);
      // Should not throw and should truncate deep nesting
      expect(result).toBeDefined();
    });

    test('sanitizes object keys', () => {
      const input = { '<script>key</script>': 'value' };
      const result = sanitizeObject(input);
      expect(result['key']).toBe('value');
    });
  });

  // ============================================================
  // PASSWORD VALIDATION TESTS
  // ============================================================

  describe('validatePassword', () => {
    test('accepts valid password', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects short password', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('rejects very long password', () => {
      const result = validatePassword('A'.repeat(200));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    test('requires lowercase letter', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a lowercase letter');
    });

    test('requires uppercase letter', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain an uppercase letter');
    });

    test('requires number', () => {
      const result = validatePassword('PasswordABC');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a number');
    });

    test('rejects common passwords', () => {
      const result = validatePassword('password');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    test('handles null/undefined', () => {
      const result = validatePassword(null);
      expect(result.valid).toBe(false);
    });
  });

  // ============================================================
  // ENCRYPTION TESTS
  // ============================================================

  describe('Encryption', () => {
    test('encrypt returns object with iv, data, and tag', () => {
      const result = encrypt('secret message');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('tag');
    });

    test('encrypt returns null for empty input', () => {
      expect(encrypt('')).toBeNull();
      expect(encrypt(null)).toBeNull();
    });

    test('decrypt recovers original message', () => {
      const original = 'Hello, World!';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('decrypt returns null for invalid input', () => {
      expect(decrypt(null)).toBeNull();
      expect(decrypt({})).toBeNull();
      expect(decrypt({ iv: 'test' })).toBeNull();
    });

    test('different encryptions produce different results', () => {
      const message = 'Same message';
      const result1 = encrypt(message);
      const result2 = encrypt(message);

      // IVs should be different
      expect(result1.iv).not.toBe(result2.iv);
      // Data should be different due to different IVs
      expect(result1.data).not.toBe(result2.data);
    });

    test('handles unicode characters', () => {
      const original = 'Hello 👋 World 🌍 日本語';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  // ============================================================
  // HASHING TESTS
  // ============================================================

  describe('hash', () => {
    test('produces consistent output', () => {
      const input = 'test-input';
      const hash1 = hash(input);
      const hash2 = hash(input);
      expect(hash1).toBe(hash2);
    });

    test('produces different output with salt', () => {
      const input = 'test-input';
      const hash1 = hash(input, 'salt1');
      const hash2 = hash(input, 'salt2');
      expect(hash1).not.toBe(hash2);
    });

    test('produces 64 character hex string', () => {
      const result = hash('test');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });
  });

  // ============================================================
  // SECURE TOKEN TESTS
  // ============================================================

  describe('generateSecureToken', () => {
    test('generates token of default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    test('generates token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    test('generates unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });

    test('generates valid hex string', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  // ============================================================
  // JWT BLACKLIST TESTS
  // ============================================================

  describe('Token Blacklist', () => {
    test('blacklists token', () => {
      const token = 'test-token-123';
      blacklistToken(token);
      expect(isTokenBlacklisted(token)).toBe(true);
    });

    test('returns false for non-blacklisted token', () => {
      expect(isTokenBlacklisted('non-existent-token')).toBe(false);
    });

    test('multiple tokens can be blacklisted', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';

      blacklistToken(token1);
      blacklistToken(token2);

      expect(isTokenBlacklisted(token1)).toBe(true);
      expect(isTokenBlacklisted(token2)).toBe(true);
    });
  });

  // ============================================================
  // SENSITIVE DATA MASKING TESTS
  // ============================================================

  describe('maskSensitiveData', () => {
    test('masks password field', () => {
      const input = { username: 'john', password: 'secret123' };
      const result = maskSensitiveData(input);
      expect(result.password).toBe('***MASKED***');
      expect(result.username).toBe('john');
    });

    test('masks multiple sensitive fields', () => {
      const input = {
        token: 'abc123',
        secret: 'xyz789',
        apiKey: 'key123'
      };
      const result = maskSensitiveData(input);
      expect(result.token).toBe('***MASKED***');
      expect(result.secret).toBe('***MASKED***');
      expect(result.apiKey).toBe('***MASKED***');
    });

    test('preserves non-sensitive fields', () => {
      const input = {
        name: 'John',
        email: 'john@example.com',
        password: 'secret'
      };
      const result = maskSensitiveData(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    test('does not modify original object', () => {
      const input = { password: 'secret' };
      maskSensitiveData(input);
      expect(input.password).toBe('secret');
    });
  });

  // ============================================================
  // STRIP SENSITIVE FIELDS TESTS
  // ============================================================

  describe('stripSensitiveFields', () => {
    test('removes password field', () => {
      const user = { id: 1, name: 'John', password: 'secret' };
      const result = stripSensitiveFields(user);
      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe('John');
    });

    test('removes password_hash field', () => {
      const user = { id: 1, password_hash: 'hashed' };
      const result = stripSensitiveFields(user);
      expect(result).not.toHaveProperty('password_hash');
    });

    test('removes reset_token field', () => {
      const user = { id: 1, reset_token: 'token123' };
      const result = stripSensitiveFields(user);
      expect(result).not.toHaveProperty('reset_token');
    });

    test('returns null for null input', () => {
      expect(stripSensitiveFields(null)).toBeNull();
    });

    test('preserves all other fields', () => {
      const user = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        created_at: '2025-01-01',
        password: 'secret'
      };
      const result = stripSensitiveFields(user);
      expect(result).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com',
        created_at: '2025-01-01'
      });
    });
  });
});
