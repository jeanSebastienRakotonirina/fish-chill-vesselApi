const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vessel = require('../../src/models/Vessel');
const Net = require('../../src/models/Net');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/middleware/auth');

async function authToken() {
  const hash = await bcrypt.hash('demo123', 10);
  const user = await User.create({
    email: 'ai@test.fr',
    password: hash,
    firstName: 'AI',
    lastName: 'Tester',
    role: 'terre',
  });
  return signToken(user._id);
}

describe('AI API – integration', () => {
  let token;

  beforeEach(async () => {
    token = await authToken();
    const v = await Vessel.create({
      name: 'AI Boat',
      type: 'chalutier',
      capacity: { fuel: 20000 },
      currentFuel: 3000,
      isOnline: true,
      lastSyncAt: new Date(),
    });
    await Net.create({ vessel: v._id, identifier: 'N-AI', wearLevel: 88 });
  });

  test('GET /api/ai/insights', async () => {
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeTruthy();
    expect(Array.isArray(res.body.criticalNets)).toBe(true);
    expect(res.body.criticalNets.some((n) => n.identifier === 'N-AI')).toBe(true);
  });

  test('POST /api/ai/chat', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'résumé flotte', lang: 'fr' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(['local', 'groq']).toContain(res.body.source);
  });

  test('POST /api/ai/chat – message trop court', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'a' });

    expect(res.status).toBe(400);
  });

  test('GET /api/ai/insights – 401 sans token', async () => {
    const res = await request(app).get('/api/ai/insights');
    expect(res.status).toBe(401);
  });
});
