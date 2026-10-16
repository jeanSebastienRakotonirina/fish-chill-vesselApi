const Net = require('../../src/models/Net');
const Vessel = require('../../src/models/Vessel');
const mongoose = require('mongoose');

describe('Net model – alertes usure', () => {
  let vesselId;

  beforeEach(async () => {
    const v = await Vessel.create({ name: 'Test Boat', type: 'chalutier' });
    vesselId = v._id;
  });

  test('usure < 70% → status operationnel, pas d\'alerte', async () => {
    const net = await Net.create({
      vessel: vesselId,
      identifier: 'F-01',
      wearLevel: 40,
    });
    expect(net.status).toBe('operationnel');
    expect(net.alerts.filter((a) => !a.acknowledged)).toHaveLength(0);
  });

  test('usure >= 70% → status a_inspecter + alerte usure', async () => {
    const net = await Net.create({
      vessel: vesselId,
      identifier: 'F-02',
      wearLevel: 75,
    });
    expect(net.status).toBe('a_inspecter');
    const alerts = net.alerts.filter((a) => a.type === 'usure' && !a.acknowledged);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].message).toMatch(/75%/);
  });

  test('usure >= 90% → status a_remplacer', async () => {
    const net = await Net.create({
      vessel: vesselId,
      identifier: 'F-03',
      wearLevel: 95,
    });
    expect(net.status).toBe('a_remplacer');
  });

  test('mise à jour wearLevel déclenche le hook pre-save', async () => {
    const net = await Net.create({
      vessel: vesselId,
      identifier: 'F-04',
      wearLevel: 20,
    });
    expect(net.status).toBe('operationnel');

    net.wearLevel = 80;
    await net.save();
    expect(net.status).toBe('a_inspecter');
  });
});
