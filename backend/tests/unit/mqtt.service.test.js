/**
 * Tests unitaires du service MQTT (handlers isolés, sans broker réel)
 */
const mongoose = require('mongoose');
const Vessel = require('../../src/models/Vessel');
const Catch = require('../../src/models/Catch');
const FuelLog = require('../../src/models/FuelLog');
const Net = require('../../src/models/Net');

// On teste la logique des handlers en les réimportant via le module
// Les handlers sont internes – on simule leur comportement via les modèles

describe('MQTT handlers – logique métier', () => {
  let vesselId;

  beforeEach(async () => {
    const v = await Vessel.create({
      name: 'MQTT Boat',
      type: 'chalutier',
      currentFuel: 10000,
      capacity: { fuel: 40000 },
    });
    vesselId = v._id;
  });

  test('position update', async () => {
    await Vessel.findByIdAndUpdate(vesselId, {
      position: {
        lat: 48.0,
        lng: -4.5,
        heading: 180,
        speed: 9,
        updatedAt: new Date(),
      },
      isOnline: true,
      lastSyncAt: new Date(),
    });

    const v = await Vessel.findById(vesselId);
    expect(v.position.lat).toBe(48.0);
    expect(v.position.speed).toBe(9);
    expect(v.isOnline).toBe(true);
  });

  test('catch from vessel', async () => {
    await Catch.create({
      vessel: vesselId,
      species: 'sardine',
      quantityKg: 400,
      catchDate: new Date(),
      syncedFromVessel: true,
      conservation: { method: 'saumure', temperature: -1 },
    });

    const catches = await Catch.find({ vessel: vesselId, syncedFromVessel: true });
    expect(catches).toHaveLength(1);
    expect(catches[0].species).toBe('sardine');
  });

  test('fuel update remaining', async () => {
    await FuelLog.create({
      vessel: vesselId,
      type: 'consommation',
      quantityLiters: 200,
      remainingLiters: 9800,
    });
    await Vessel.findByIdAndUpdate(vesselId, { currentFuel: 9800 });

    const v = await Vessel.findById(vesselId);
    expect(v.currentFuel).toBe(9800);
  });

  test('net wear update', async () => {
    const net = await Net.create({
      vessel: vesselId,
      identifier: 'MQTT-NET',
      wearLevel: 30,
    });

    net.wearLevel = 72;
    await net.save();

    expect(net.status).toBe('a_inspecter');
    expect(net.alerts.some((a) => a.type === 'usure')).toBe(true);
  });
});
