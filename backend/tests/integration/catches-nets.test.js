const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vessel = require('../../src/models/Vessel');
const Catch = require('../../src/models/Catch');
const Net = require('../../src/models/Net');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/middleware/auth');

async function tokenFor(role) {
  const hash = await bcrypt.hash('demo123', 10);
  const user = await User.create({
    email: `${role}-${Date.now()}@test.fr`,
    password: hash,
    firstName: 'T',
    lastName: 'U',
    role,
  });
  return signToken(user._id);
}

describe('Catches & Nets API – integration', () => {
  let vessel;

  beforeEach(async () => {
    vessel = await Vessel.create({ name: 'Catch Boat', type: 'chalutier' });
  });

  test('POST /api/catches – embarque peut créer', async () => {
    const token = await tokenFor('embarque');
    const res = await request(app)
      .post('/api/catches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vessel: vessel._id,
        species: 'merlu',
        quantityKg: 120,
        catchDate: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.species).toBe('merlu');
    expect(res.body.quantityKg).toBe(120);
  });

  test('POST /api/catches – client interdit', async () => {
    const token = await tokenFor('client');
    const res = await request(app)
      .post('/api/catches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vessel: vessel._id,
        species: 'thon',
        quantityKg: 50,
        catchDate: new Date().toISOString(),
      });

    expect(res.status).toBe(403);
  });

  test('GET /api/catches/stats', async () => {
    const token = await tokenFor('terre');
    await Catch.create({
      vessel: vessel._id,
      species: 'sardine',
      quantityKg: 200,
      catchDate: new Date(),
    });
    await Catch.create({
      vessel: vessel._id,
      species: 'sardine',
      quantityKg: 100,
      catchDate: new Date(),
    });

    const res = await request(app)
      .get('/api/catches/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.bySpecies).toBeDefined();
    const sardine = res.body.bySpecies.find((s) => s._id === 'sardine');
    expect(sardine.totalKg).toBe(300);
  });

  test('POST net + acknowledge alert', async () => {
    const token = await tokenFor('terre');
    const create = await request(app)
      .post('/api/nets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vessel: vessel._id,
        identifier: 'NET-TEST-1',
        wearLevel: 80,
      });

    expect(create.status).toBe(201);
    expect(create.body.status).toBe('a_inspecter');
    expect(create.body.alerts.length).toBeGreaterThanOrEqual(1);

    const alertId = create.body.alerts[0]._id;
    const ack = await request(app)
      .post(`/api/nets/${create.body._id}/alerts/${alertId}/ack`)
      .set('Authorization', `Bearer ${token}`);

    expect(ack.status).toBe(200);
    const alert = ack.body.alerts.find((a) => a._id === alertId);
    expect(alert.acknowledged).toBe(true);
  });
});
