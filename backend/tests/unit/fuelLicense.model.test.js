const FuelLog = require('../../src/models/FuelLog');
const License = require('../../src/models/License');
const Vessel = require('../../src/models/Vessel');

describe('FuelLog model', () => {
  let vesselId;

  beforeEach(async () => {
    const v = await Vessel.create({ name: 'Fuel Vessel' });
    vesselId = v._id;
  });

  test('log consommation', async () => {
    const log = await FuelLog.create({
      vessel: vesselId,
      type: 'consommation',
      quantityLiters: 500,
      remainingLiters: 10000,
    });
    expect(log.type).toBe('consommation');
    expect(log.quantityLiters).toBe(500);
  });

  test('log ravitaillement', async () => {
    const log = await FuelLog.create({
      vessel: vesselId,
      type: 'ravitaillement',
      quantityLiters: 12000,
      remainingLiters: 45000,
    });
    expect(log.type).toBe('ravitaillement');
  });

  test('type invalide rejeté', async () => {
    await expect(
      FuelLog.create({ vessel: vesselId, type: 'vol', quantityLiters: 1 })
    ).rejects.toThrow();
  });
});

describe('License model', () => {
  let vesselId;

  beforeEach(async () => {
    const v = await Vessel.create({ name: 'Lic Vessel' });
    vesselId = v._id;
  });

  test('crée une licence avec quota', async () => {
    const lic = await License.create({
      vessel: vesselId,
      number: 'LIC-2026-001',
      type: 'quota_especes',
      species: ['merlu', 'baudroie'],
      zones: ['VIIIa'],
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      quotaKg: 100000,
      usedKg: 15000,
      status: 'active',
    });
    expect(lic.number).toBe('LIC-2026-001');
    expect(lic.usedKg).toBe(15000);
    expect(lic.status).toBe('active');
  });

  test('number unique', async () => {
    await License.create({ number: 'LIC-DUP', quotaKg: 1 });
    await expect(License.create({ number: 'LIC-DUP' })).rejects.toThrow();
  });
});
