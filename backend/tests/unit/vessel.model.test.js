const Vessel = require('../../src/models/Vessel');

describe('Vessel model', () => {
  test('crée un navire avec valeurs par défaut', async () => {
    const v = await Vessel.create({ name: 'Test Vessel' });
    expect(v.name).toBe('Test Vessel');
    expect(v.type).toBe('chalutier');
    expect(v.status).toBe('au_port');
    expect(v.isOnline).toBe(false);
    expect(v.currentFuel).toBe(0);
  });

  test('name unique', async () => {
    await Vessel.create({ name: 'Unique Boat' });
    await expect(Vessel.create({ name: 'Unique Boat' })).rejects.toThrow();
  });

  test('accepte position GPS et capacité', async () => {
    const v = await Vessel.create({
      name: 'GPS Boat',
      position: { lat: 47.85, lng: -4.1, heading: 90, speed: 10, updatedAt: new Date() },
      capacity: { holds: 100, fuel: 40000 },
      currentFuel: 20000,
      status: 'en_mer',
      isOnline: true,
    });
    expect(v.position.lat).toBe(47.85);
    expect(v.capacity.fuel).toBe(40000);
    expect(v.status).toBe('en_mer');
  });

  test('enum status invalide rejeté', async () => {
    await expect(
      Vessel.create({ name: 'Bad Status', status: 'flying' })
    ).rejects.toThrow();
  });
});
