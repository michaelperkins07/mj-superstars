// ============================================================
// MJ's Superstars Backend - Jest Global Setup
// ============================================================

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes in hex
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/mj_test';
  process.env.ANTHROPIC_API_KEY = 'test-api-key';

  console.log('\n🧪 Test environment initialized\n');
};
