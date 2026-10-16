const mqtt = require('mqtt');

let client = null;

/**
 * Service MQTT pour la synchronisation navire ↔ siège
 * Les navires publient sur des topics dédiés même avec une connectivité intermittente.
 * Le backend s'abonne et traite les messages dès qu'ils arrivent.
 */
const connectMQTT = () => {
  const broker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';

  client = mqtt.connect(broker, {
    clientId: `fishchill-backend-${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('MQTT connecté au broker');
    // Topics : vessel/{id}/position, vessel/{id}/catch, vessel/{id}/fuel, vessel/{id}/net
    client.subscribe('vessel/+/position');
    client.subscribe('vessel/+/catch');
    client.subscribe('vessel/+/fuel');
    client.subscribe('vessel/+/net');
    client.subscribe('vessel/+/status');
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const [, vesselId, type] = topic.split('/');
      console.log(`[MQTT] ${type} reçu pour navire ${vesselId}`);

      // Traitement asynchrone selon le type
      switch (type) {
        case 'position':
          await handlePosition(vesselId, payload);
          break;
        case 'catch':
          await handleCatch(vesselId, payload);
          break;
        case 'fuel':
          await handleFuel(vesselId, payload);
          break;
        case 'net':
          await handleNet(vesselId, payload);
          break;
        case 'status':
          await handleStatus(vesselId, payload);
          break;
        default:
          console.warn(`Topic non géré: ${topic}`);
      }
    } catch (err) {
      console.error('Erreur traitement MQTT:', err.message);
    }
  });

  client.on('error', (err) => console.error('Erreur MQTT:', err.message));
  client.on('offline', () => console.warn('MQTT offline – reconnexion en cours...'));
};

const handlePosition = async (vesselId, data) => {
  const Vessel = require('../models/Vessel');
  await Vessel.findByIdAndUpdate(vesselId, {
    position: {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      speed: data.speed,
      updatedAt: new Date(data.timestamp || Date.now()),
    },
    isOnline: true,
    lastSyncAt: new Date(),
  });
};

const handleCatch = async (vesselId, data) => {
  const Catch = require('../models/Catch');
  await Catch.create({
    vessel: vesselId,
    species: data.species,
    quantityKg: data.quantityKg,
    quality: data.quality || 'A',
    catchDate: data.catchDate || new Date(),
    position: data.position,
    conservation: data.conservation,
    licenseRef: data.licenseRef,
    syncedFromVessel: true,
  });
};

const handleFuel = async (vesselId, data) => {
  const FuelLog = require('../models/FuelLog');
  const Vessel = require('../models/Vessel');

  await FuelLog.create({
    vessel: vesselId,
    type: data.type,
    quantityLiters: data.quantityLiters,
    remainingLiters: data.remainingLiters,
    position: data.position,
    timestamp: data.timestamp || new Date(),
  });

  if (data.remainingLiters !== undefined) {
    await Vessel.findByIdAndUpdate(vesselId, { currentFuel: data.remainingLiters });
  }
};

const handleNet = async (vesselId, data) => {
  const Net = require('../models/Net');
  if (data._id) {
    await Net.findByIdAndUpdate(data._id, {
      wearLevel: data.wearLevel,
      status: data.status,
      lastInspection: data.lastInspection,
    });
  }
};

const handleStatus = async (vesselId, data) => {
  const Vessel = require('../models/Vessel');
  await Vessel.findByIdAndUpdate(vesselId, {
    status: data.status,
    isOnline: data.isOnline !== false,
    lastSyncAt: new Date(),
  });
};

/** Publier une commande vers un navire (ex: mise à jour config) */
const publishToVessel = (vesselId, topic, payload) => {
  if (!client || !client.connected) {
    console.warn('MQTT non connecté – impossible de publier');
    return;
  }
  client.publish(`vessel/${vesselId}/${topic}`, JSON.stringify(payload), { qos: 1 });
};

module.exports = { connectMQTT, publishToVessel };
