const jwt = require('jsonwebtoken');

// Test JWT generation and verification
const secret = 'your-super-secret-jwt-key';
const payload = { userId: 1, role: 'ADMIN' };

console.log('Generating token...');
const token = jwt.sign(payload, secret, { expiresIn: '24h' });
console.log('Generated token:', token);

console.log('Verifying token...');
try {
  const decoded = jwt.verify(token, secret);
  console.log('Decoded token:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
}
