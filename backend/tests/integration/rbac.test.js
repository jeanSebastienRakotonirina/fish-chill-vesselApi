/**
 * Matrice complète des droits par rôle
 */
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vessel = require('../../src/models/Vessel');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/middleware/auth');

const ROLES = ['admin', 'terre', 'embarque', 'client'];

async function tokens() {
  const hash = await bcrypt.hash('demo123', 10);
  const result = {};
  for (const role of ROLES) {
    const user = await User.create({
      email: `rbac-${role}@test.fr`,
      password: hash,
      firstName: role,
      lastName: 'Test',
      role,
    });
    result[role] = signToken(user._id);
  }
  return result;
}

describe('RBAC – matrice des droits', () => {
  let tok;
  let vesselId;

  beforeEach(async () => {
    tok = await tokens();
    const v = await Vessel.create({ name: 'RBAC Boat', type: 'chalutier' });
    vesselId = v._id;
  });

  // Lecture autorisée pour tous
  test.each(ROLES)('%s peut GET /vessels', async (role) => {
    const res = await request(app)
      .get('/api/vessels')
      .set('Authorization', `Bearer ${tok[role]}`);
    expect(res.status).toBe(200);
  });

  test.each(ROLES)('%s peut GET /catches', async (role) => {
    const res = await request(app)
      .get('/api/catches')
      .set('Authorization', `Bearer ${tok[role]}`);
    expect(res.status).toBe(200);
  });

  test.each(ROLES)('%s peut GET /ai/insights', async (role) => {
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${tok[role]}`);
    expect(res.status).toBe(200);
  });

  // Écriture vessels : admin + terre seulement
  test('admin peut POST /vessels', async () => {
    const res = await request(app)
      .post('/api/vessels')
      .set('Authorization', `Bearer ${tok.admin}`)
      .send({ name: 'Admin Boat' });
    expect(res.status).toBe(201);
  });

  test('terre peut POST /vessels', async () => {
    const res = await request(app)
      .post('/api/vessels')
      .set('Authorization', `Bearer ${tok.terre}`)
      .send({ name: 'Terre Boat' });
    expect(res.status).toBe(201);
  });

  test('embarque ne peut PAS POST /vessels', async () => {
    const res = await request(app)
      .post('/api/vessels')
      .set('Authorization', `Bearer ${tok.embarque}`)
      .send({ name: 'Hack Boat' });
    expect(res.status).toBe(403);
  });

  test('client ne peut PAS POST /vessels', async () => {
    const res = await request(app)
      .post('/api/vessels')
      .set('Authorization', `Bearer ${tok.client}`)
      .send({ name: 'Hack Boat 2' });
    expect(res.status).toBe(403);
  });

  // Écriture catches : admin, terre, embarque
  test.each(['admin', 'terre', 'embarque'])('%s peut POST /catches', async (role) => {
    const res = await request(app)
      .post('/api/catches')
      .set('Authorization', `Bearer ${tok[role]}`)
      .send({
        vessel: vesselId,
        species: 'merlu',
        quantityKg: 10,
        catchDate: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
  });

  test('client ne peut PAS POST /catches', async () => {
    const res = await request(app)
      .post('/api/catches')
      .set('Authorization', `Bearer ${tok.client}`)
      .send({
        vessel: vesselId,
        species: 'merlu',
        quantityKg: 10,
        catchDate: new Date().toISOString(),
      });
    expect(res.status).toBe(403);
  });

  // Écriture nets
  test.each(['admin', 'terre', 'embarque'])('%s peut POST /nets', async (role) => {
    const res = await request(app)
      .post('/api/nets')
      .set('Authorization', `Bearer ${tok[role]}`)
      .send({ vessel: vesselId, identifier: `NET-${role}`, wearLevel: 10 });
    expect(res.status).toBe(201);
  });

  test('client ne peut PAS POST /nets', async () => {
    const res = await request(app)
      .post('/api/nets')
      .set('Authorization', `Bearer ${tok.client}`)
      .send({ vessel: vesselId, identifier: 'NET-CLIENT', wearLevel: 10 });
    expect(res.status).toBe(403);
  });
});
