const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vessel = require('../../src/models/Vessel');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/middleware/auth');

async function createUser(role = 'terre') {
  const hash = await bcrypt.hash('demo123', 10);
  const user = await User.create({
    email: `${role}@test.fr`,
    password: hash,
    firstName: 'T',
    lastName: 'U',
    role,
  });
  return { user, token: signToken(user._id) };
}

describe('Vessels API – integration', () => {
  test('GET /api/vessels – 401 sans auth', async () => {
    const res = await request(app).get('/api/vessels');
    expect(res.status).toBe(401);
  });

  test('GET /api/vessels – liste les navires', async () => {
    const { token } = await createUser('terre');
    await Vessel.create({ name: 'Ker Ys', type: 'chalutier', status: 'en_mer' });
    await Vessel.create({ name: 'Glénan', type: 'senneur', status: 'au_port' });

    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((v) => v.name).sort()).toEqual(['Glénan', 'Ker Ys']);
  });

  test('POST /api/vessels – admin/terre peut créer', async () => {
    const { token } = await createUser('terre');

    const res = await request(app)
      .post('/api/vessels')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nouveau Navire', type: 'chalutier' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Nouveau Navire');
  });

  test('POST /api/vessels – client ne peut pas créer (403)', async () => {
    const { token } = await createUser('client');

    const res = await request(app)
      .post('/api/vessels')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hack', type: 'chalutier' });

    expect(res.status).toBe(403);
  });

  test('GET /api/vessels/:id/dashboard', async () => {
    const { token } = await createUser('admin');
    const vessel = await Vessel.create({
      name: 'Dashboard Boat',
      type: 'chalutier',
      currentFuel: 5000,
      capacity: { fuel: 10000 },
    });

    const res = await request(app)
      .get(`/api/vessels/${vessel._id}/dashboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.vessel.name).toBe('Dashboard Boat');
    expect(res.body.kpis).toBeDefined();
    expect(res.body.kpis.currentFuelLiters).toBe(5000);
  });
});
