const Catch = require('../../src/models/Catch');
const Vessel = require('../../src/models/Vessel');

describe('Catch model', () => {
  let vesselId;

  beforeEach(async () => {
    const v = await Vessel.create({ name: 'Catch Vessel' });
    vesselId = v._id;
  });

  test('crée une capture complète', async () => {
    const c = await Catch.create({
      vessel: vesselId,
      species: 'merlu',
      quantityKg: 250,
      quality: 'A',
      catchDate: new Date(),
      position: { lat: 47.8, lng: -4.2 },
      conservation: { method: 'saumure', temperature: -1.5, holdId: 'C1' },
      syncedFromVessel: true,
    });
    expect(c.species).toBe('merlu');
    expect(c.quantityKg).toBe(250);
    expect(c.conservation.method).toBe('saumure');
    expect(c.syncedFromVessel).toBe(true);
  });

  test('quality par défaut A', async () => {
    const c = await Catch.create({
      vessel: vesselId,
      species: 'thon',
      quantityKg: 50,
      catchDate: new Date(),
    });
    expect(c.quality).toBe('A');
  });

  test('champs obligatoires manquants → erreur', async () => {
    await expect(
      Catch.create({ vessel: vesselId, species: 'merlu' })
    ).rejects.toThrow();
  });
});
