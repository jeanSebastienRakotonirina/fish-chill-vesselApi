/**
 * Seed de données de démonstration pour Fish&Chill
 * Usage: node src/seed.js (avec MongoDB démarré)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Vessel = require('./models/Vessel');
const Catch = require('./models/Catch');
const Net = require('./models/Net');
const FuelLog = require('./models/FuelLog');
const License = require('./models/License');
const User = require('./models/User');

const vesselsData = [
  {
    name: 'Ker Ys',
    imo: '9876543',
    callSign: 'FXYZ',
    type: 'chalutier',
    status: 'en_mer',
    position: { lat: 47.85, lng: -4.12, heading: 230, speed: 8.5, updatedAt: new Date() },
    capacity: { holds: 120, fuel: 45000 },
    currentFuel: 28500,
    isOnline: true,
    lastSyncAt: new Date(),
  },
  {
    name: 'Breizh Mor',
    imo: '9876544',
    callSign: 'FABC',
    type: 'chalutier',
    status: 'au_port',
    position: { lat: 47.87, lng: -3.92, heading: 0, speed: 0, updatedAt: new Date() },
    capacity: { holds: 95, fuel: 38000 },
    currentFuel: 35200,
    isOnline: false,
    lastSyncAt: new Date(Date.now() - 3600 * 1000 * 12),
  },
  {
    name: 'Glénan',
    imo: '9876545',
    callSign: 'FDEF',
    type: 'senneur',
    status: 'en_mer',
    position: { lat: 47.72, lng: -4.45, heading: 180, speed: 11.2, updatedAt: new Date() },
    capacity: { holds: 150, fuel: 52000 },
    currentFuel: 41000,
    isOnline: true,
    lastSyncAt: new Date(),
  },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fishchill');
  console.log('Connexion MongoDB OK');

  await Promise.all([
    Vessel.deleteMany({}),
    Catch.deleteMany({}),
    Net.deleteMany({}),
    FuelLog.deleteMany({}),
    License.deleteMany({}),
    User.deleteMany({}),
  ]);

  const vessels = await Vessel.insertMany(vesselsData);
  console.log(`${vessels.length} navires créés`);

  // ── Utilisateurs de démo (mot de passe: demo123) ──────────
  const hash = await bcrypt.hash('demo123', 10);
  const users = await User.insertMany([
    {
      email: 'admin@cfto.fr',
      password: hash,
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'admin',
    },
    {
      email: 'terre@cfto.fr',
      password: hash,
      firstName: 'Bruno',
      lastName: 'Martin',
      role: 'terre',
    },
    {
      email: 'embarque@cfto.fr',
      password: hash,
      firstName: 'Claire',
      lastName: 'Le Goff',
      role: 'embarque',
      vessels: [vessels[0]._id],
    },
    {
      email: 'client@externe.fr',
      password: hash,
      firstName: 'David',
      lastName: 'Client',
      role: 'client',
      company: 'Poissonnerie Atlantique',
    },
  ]);
  console.log(`${users.length} utilisateurs créés (mdp: demo123)`);
  console.log('  admin@cfto.fr      → admin');
  console.log('  terre@cfto.fr      → à terre');
  console.log('  embarque@cfto.fr   → embarqué (Ker Ys)');
  console.log('  client@externe.fr  → client externe');

  // Filets
  const nets = [];
  for (const v of vessels) {
    nets.push(
      await Net.create({
        vessel: v._id,
        identifier: `FILET-${v.name.slice(0, 3).toUpperCase()}-01`,
        type: v.type === 'senneur' ? 'senne' : 'chalut',
        lengthM: 80,
        meshSizeMm: 70,
        installDate: new Date('2024-03-15'),
        lastInspection: new Date('2025-09-01'),
        wearLevel: Math.floor(Math.random() * 40) + 20,
      })
    );
    nets.push(
      await Net.create({
        vessel: v._id,
        identifier: `FILET-${v.name.slice(0, 3).toUpperCase()}-02`,
        type: 'chalut',
        lengthM: 60,
        meshSizeMm: 80,
        installDate: new Date('2023-11-20'),
        lastInspection: new Date('2025-06-10'),
        wearLevel: 78,
      })
    );
  }
  console.log(`${nets.length} filets créés`);

  // Captures
  const species = ['merlu', 'baudroie', 'lotte', 'sardine', 'maquereau', 'thon'];
  const catches = [];
  for (const v of vessels) {
    for (let i = 0; i < 8; i++) {
      catches.push({
        vessel: v._id,
        species: species[Math.floor(Math.random() * species.length)],
        quantityKg: Math.floor(Math.random() * 800) + 50,
        quality: ['A', 'A', 'B'][Math.floor(Math.random() * 3)],
        catchDate: new Date(Date.now() - i * 86400000 * (Math.random() * 3 + 1)),
        position: {
          lat: 47.7 + Math.random() * 0.3,
          lng: -4.5 + Math.random() * 0.6,
        },
        conservation: {
          method: 'saumure',
          temperature: -1.5,
          holdId: `C${Math.floor(Math.random() * 4) + 1}`,
        },
        syncedFromVessel: true,
      });
    }
  }
  await Catch.insertMany(catches);
  console.log(`${catches.length} captures créées`);

  // Carburant
  for (const v of vessels) {
    await FuelLog.create({
      vessel: v._id,
      type: 'ravitaillement',
      quantityLiters: 12000,
      remainingLiters: v.currentFuel,
      timestamp: new Date(Date.now() - 5 * 86400000),
    });
    await FuelLog.create({
      vessel: v._id,
      type: 'consommation',
      quantityLiters: 850,
      remainingLiters: v.currentFuel - 200,
      timestamp: new Date(Date.now() - 1 * 86400000),
    });
  }
  console.log('Logs carburant créés');

  // Licences
  for (const v of vessels) {
    await License.create({
      vessel: v._id,
      number: `LIC-${v.imo}-2026`,
      type: 'quota_especes',
      species: ['merlu', 'baudroie'],
      zones: ['VIIIa', 'VIIIb'],
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      quotaKg: 150000,
      usedKg: Math.floor(Math.random() * 40000),
      status: 'active',
    });
  }
  console.log('Licences créées');

  console.log('\n✅ Seed terminé avec succès');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
