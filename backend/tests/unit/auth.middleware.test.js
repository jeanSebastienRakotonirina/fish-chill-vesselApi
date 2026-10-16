const jwt = require('jsonwebtoken');
const { signToken, JWT_SECRET } = require('../../src/middleware/auth');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('Auth middleware – signToken', () => {
  test('génère un JWT valide contenant l\'id user', () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const token = signToken(fakeId);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(fakeId);
  });
});

describe('User model', () => {
  test('toPublicJSON n\'expose pas le password', async () => {
    const hash = await bcrypt.hash('secret', 10);
    const user = await User.create({
      email: 'test@cfto.fr',
      password: hash,
      firstName: 'Jean',
      lastName: 'Test',
      role: 'terre',
    });

    const pub = user.toPublicJSON();
    expect(pub.email).toBe('test@cfto.fr');
    expect(pub.password).toBeUndefined();
    expect(pub.role).toBe('terre');
    expect(pub.firstName).toBe('Jean');
  });

  test('email unique', async () => {
    const hash = await bcrypt.hash('x', 10);
    await User.create({
      email: 'dup@cfto.fr',
      password: hash,
      firstName: 'A',
      lastName: 'B',
      role: 'client',
    });

    await expect(
      User.create({
        email: 'dup@cfto.fr',
        password: hash,
        firstName: 'C',
        lastName: 'D',
        role: 'client',
      })
    ).rejects.toThrow();
  });
});
