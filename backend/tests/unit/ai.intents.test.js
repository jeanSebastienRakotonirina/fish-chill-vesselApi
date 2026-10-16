const { chat } = require('../../src/services/aiService');
const Vessel = require('../../src/models/Vessel');
const Net = require('../../src/models/Net');

describe('AI chat – intents multilingues', () => {
  beforeEach(async () => {
    const v = await Vessel.create({
      name: 'Intent Boat',
      capacity: { fuel: 10000 },
      currentFuel: 9000,
      isOnline: true,
      lastSyncAt: new Date(),
    });
    await Net.create({ vessel: v._id, identifier: 'OK-NET', wearLevel: 20 });
  });

  test.each([
    ['comment voir la carte ?', /carte|map|flotte/i],
    ['where is the map?', /map|fleet|carte/i],
    ['aide filets', /filet|net|usure/i],
    ['how to see nets?', /net|filet|wear/i],
    ['stats', /stat|espèce|species|jour|day/i],
    ['roles', /r[oô]le|admin|terre|embarque|client/i],
  ])('intent "%s"', async (msg, pattern) => {
    const lang = /[àéèêùç]|comment|aide|filet|rôle/i.test(msg) ? 'fr' : 'en';
    const result = await chat(msg, { lang });
    expect(result.reply).toMatch(pattern);
    expect(result.source).toBe('local');
  });

  test('fuel bas – aucun navire critique', async () => {
    const result = await chat('carburant bas', { lang: 'fr' });
    expect(result.reply).toMatch(/aucun|no vessel/i);
  });

  test('filets à risque – aucun critique', async () => {
    const result = await chat('filets à risque', { lang: 'fr' });
    expect(result.reply).toMatch(/aucun|no net|nominale|good/i);
  });

  test('message inconnu → suggestion d\'aide', async () => {
    const result = await chat('blablabla xyz', { lang: 'fr' });
    expect(result.reply.length).toBeGreaterThan(20);
  });
});
