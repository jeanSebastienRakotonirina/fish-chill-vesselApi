const { getFleetInsights, chat } = require('../../src/services/aiService');
const Vessel = require('../../src/models/Vessel');
const Net = require('../../src/models/Net');
const Catch = require('../../src/models/Catch');

describe('AI service – insights', () => {
  beforeEach(async () => {
    const v = await Vessel.create({
      name: 'Ker Test',
      type: 'chalutier',
      status: 'en_mer',
      isOnline: true,
      capacity: { fuel: 10000 },
      currentFuel: 1500, // 15% → low fuel
      lastSyncAt: new Date(),
    });

    await Net.create({
      vessel: v._id,
      identifier: 'FILET-RISK',
      wearLevel: 85,
    });

    await Catch.create({
      vessel: v._id,
      species: 'merlu',
      quantityKg: 500,
      catchDate: new Date(),
    });
  });

  test('getFleetInsights détecte filets critiques et fuel bas', async () => {
    const insights = await getFleetInsights();

    expect(insights.criticalNets.length).toBeGreaterThanOrEqual(1);
    expect(insights.criticalNets[0].identifier).toBe('FILET-RISK');
    expect(insights.criticalNets[0].wearLevel).toBe(85);

    expect(insights.lowFuel.length).toBeGreaterThanOrEqual(1);
    expect(insights.lowFuel[0].name).toBe('Ker Test');

    expect(insights.summary).toBeTruthy();
    expect(typeof insights.summary).toBe('string');
  });

  test('chat – résumé flotte', async () => {
    const result = await chat('résumé flotte', { lang: 'fr' });
    expect(result.reply).toBeTruthy();
    expect(result.source).toBe('local');
    expect(result.insights).toBeTruthy();
  });

  test('chat – filets à risque', async () => {
    const result = await chat('filets à risque', { lang: 'fr' });
    expect(result.reply).toMatch(/FILET-RISK|85%/);
  });

  test('chat – aide navigation', async () => {
    const result = await chat('comment voir les captures ?', { lang: 'fr' });
    expect(result.reply.toLowerCase()).toMatch(/captur/);
  });

  test('chat – message vide géré côté controller, ici message court', async () => {
    const result = await chat('ok', { lang: 'fr' });
    expect(result.reply).toBeTruthy();
  });
});
