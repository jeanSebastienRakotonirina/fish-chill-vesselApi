const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { signToken } = require('../src/middleware/auth');

async function createTestUser(overrides = {}) {
  const hash = await bcrypt.hash(overrides.password || 'demo123', 10);
  const user = await User.create({
    email: overrides.email || `user-${Date.now()}@test.fr`,
    password: hash,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'terre',
    ...overrides,
    password: hash,
  });
  return { user, token: signToken(user._id) };
}

module.exports = { createTestUser };
