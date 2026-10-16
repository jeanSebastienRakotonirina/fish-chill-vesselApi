const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vessel = require('../../src/models/Vessel');
const Catch = require('../../src/models/Catch');
const Net = require('../../src/models/Net');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/middleware/auth');

async function adminToken() {
  const hash = await bcrypt.hash('demo123', 10);
  const user = await User.create({
    email: `admin-crud-${Date.now()}@test.fr`,
    password: hash,
    firstName: 'A',
    lastName: 'D',
    role: 'admin',
  });
  return signToken(user._id);
}

describe('Vessels CRUD complet', () => {
  let token;

  beforeEach(async () => {
    token = await adminToken();
  });

  test('GET /vessels/:id – 404 si inconnu', async () => {
    const res = await request(app)
      .get('/api/vessels/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('GET /vessels/:id – retourne le navire', async () => {
    const v = await Vessel.create({ name: 'Detail Boat', imo: '111' });
    const res = await request(app)
      .get(`/api/vessels/${v._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Detail Boat');
    expect(res.body.imo).toBe('111');
  });

  test('PATCH /vessels/:id – met à jour le statut', async () => {
    const v = await Vessel.create({ name: 'Patch Boat', status: 'au_port' });
    const res = await request(app)
      .patch(`/api/vessels/${v._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'en_mer', isOnline: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('en_mer');
    expect(res.body.isOnline).toBe(true);
  });

  test('dashboard inclut captures et filets', async () => {
    const v = await Vessel.create({
      name: 'Dash Full',
      currentFuel: 8000,
      capacity: { fuel: 20000 },
    });
    await Catch.create({
      vessel: v._id,
      species: 'lotte',
      quantityKg: 300,
      catchDate: new Date(),
    });
    await Net.create({ vessel: v._id, identifier: 'DF-01', wearLevel: 50 });

    const res = await request(app)
      .get(`/api/vessels/${v._id}/dashboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis.totalCatchKg).toBe(300);
    expect(res.body.kpis.activeNets).toBe(1);
    expect(res.body.recentCatches).toHaveLength(1);
    expect(res.body.nets).toHaveLength(1);
    expect(res.body.kpis.fuelPercent).toBe(40);
  });
});
