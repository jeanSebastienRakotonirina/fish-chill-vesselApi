const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('Auth API – integration', () => {
  describe('POST /api/auth/register', () => {
    test('crée un compte et retourne token + user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nouveau@cfto.fr',
          password: 'demo123',
          firstName: 'Marie',
          lastName: 'Dupont',
          role: 'terre',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.email).toBe('nouveau@cfto.fr');
      expect(res.body.user.role).toBe('terre');
      expect(res.body.user.password).toBeUndefined();
    });

    test('rejette email déjà utilisé', async () => {
      const hash = await bcrypt.hash('x', 10);
      await User.create({
        email: 'existe@cfto.fr',
        password: hash,
        firstName: 'A',
        lastName: 'B',
        role: 'client',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existe@cfto.fr',
          password: 'demo123',
          firstName: 'C',
          lastName: 'D',
          role: 'client',
        });

      expect(res.status).toBe(409);
    });

    test('rejette champs manquants', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'x@y.fr' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const hash = await bcrypt.hash('demo123', 10);
      await User.create({
        email: 'login@cfto.fr',
        password: hash,
        firstName: 'Login',
        lastName: 'User',
        role: 'admin',
      });
    });

    test('login OK avec bons identifiants', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@cfto.fr', password: 'demo123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe('admin');
    });

    test('login KO avec mauvais mot de passe', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@cfto.fr', password: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    test('retourne le user avec un token valide', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me@cfto.fr',
          password: 'demo123',
          firstName: 'Me',
          lastName: 'User',
          role: 'embarque',
        });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@cfto.fr');
      expect(res.body.user.role).toBe('embarque');
    });

    test('401 sans token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
