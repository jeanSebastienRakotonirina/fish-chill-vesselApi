const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { signToken, JWT_SECRET } = require('../../src/middleware/auth');

describe('Auth middleware protect & authorize', () => {
  let terreToken, clientToken, inactiveToken;

  beforeEach(async () => {
    const hash = await bcrypt.hash('demo123', 10);

    const terre = await User.create({
      email: 'terre-mw@test.fr',
      password: hash,
      firstName: 'T',
      lastName: 'E',
      role: 'terre',
    });
    terreToken = signToken(terre._id);

    const client = await User.create({
      email: 'client-mw@test.fr',
      password: hash,
      firstName: 'C',
      lastName: 'L',
      role: 'client',
    });
    clientToken = signToken(client._id);

    const inactive = await User.create({
      email: 'inactive@test.fr',
      password: hash,
      firstName: 'I',
      lastName: 'N',
      role: 'admin',
      isActive: false,
    });
    inactiveToken = signToken(inactive._id);
  });

  test('token expiré / invalide → 401', async () => {
    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });

  test('compte inactif → 401', async () => {
    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', `Bearer ${inactiveToken}`);
    expect(res.status).toBe(401);
  });

  test('sans Bearer prefix → 401', async () => {
    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', terreToken);
    expect(res.status).toBe(401);
  });

  test('client ne peut pas POST nets → 403', async () => {
    const res = await request(app)
      .post('/api/nets')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ identifier: 'X', vessel: '507f1f77bcf86cd799439011', wearLevel: 10 });
    expect(res.status).toBe(403);
  });

  test('terre peut GET vessels → 200', async () => {
    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', `Bearer ${terreToken}`);
    expect(res.status).toBe(200);
  });

  test('token signé avec mauvais secret → 401', async () => {
    const bad = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'wrong-secret');
    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });
});
