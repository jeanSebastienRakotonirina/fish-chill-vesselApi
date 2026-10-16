const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vessel = require('../../src/models/Vessel');
const Catch = require('../../src/models/Catch');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/middleware/auth');

describe('Catches – filtres query', () => {
  let token, v1, v2;

  beforeEach(async () => {
    const hash = await bcrypt.hash('x', 10);
    const user = await User.create({
      email: `filt-${Date.now()}@t.fr`,
      password: hash,
      firstName: 'F',
      lastName: 'T',
      role: 'terre',
    });
    token = signToken(user._id);

    v1 = await Vessel.create({ name: 'Filter A' });
    v2 = await Vessel.create({ name: 'Filter B' });

    await Catch.create({
      vessel: v1._id,
      species: 'merlu',
      quantityKg: 100,
      catchDate: new Date('2026-01-15'),
    });
    await Catch.create({
      vessel: v1._id,
      species: 'thon',
      quantityKg: 200,
      catchDate: new Date('2026-02-20'),
    });
    await Catch.create({
      vessel: v2._id,
      species: 'merlu',
      quantityKg: 50,
      catchDate: new Date('2026-03-10'),
    });
  });

  test('filtre par vessel', async () => {
    const res = await request(app)
      .get(`/api/catches?vessel=${v1._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filtre par species', async () => {
    const res = await request(app)
      .get('/api/catches?species=merlu')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.every((c) => c.species === 'merlu')).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test('filtre par période', async () => {
    const res = await request(app)
      .get('/api/catches?from=2026-02-01&to=2026-02-28')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].species).toBe('thon');
  });

  test('limit', async () => {
    const res = await request(app)
      .get('/api/catches?limit=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
