const express = require('express');
const router = express.Router();

const vesselCtrl = require('../controllers/vesselController');
const catchCtrl = require('../controllers/catchController');
const netCtrl = require('../controllers/netController');
const authCtrl = require('../controllers/authController');
const aiCtrl = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', protect, authCtrl.me);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fish-chill-backend', timestamp: new Date().toISOString() });
});

router.get('/vessels', protect, vesselCtrl.getAll);
router.get('/vessels/external/status', protect, vesselCtrl.externalStatus);
router.get('/vessels/external/search', protect, vesselCtrl.externalSearch);
router.get('/vessels/external/live', protect, vesselCtrl.externalLive);
router.post('/vessels/sync-ais-all', protect, authorize('admin', 'terre'), vesselCtrl.syncAisAll);
router.post('/vessels/external/import', protect, authorize('admin', 'terre', 'embarque'), vesselCtrl.importExternal);

router.get('/vessels/:id', protect, vesselCtrl.getOne);
router.get('/vessels/:id/dashboard', protect, vesselCtrl.dashboard);
router.post('/vessels/:id/sync-ais', protect, authorize('admin', 'terre', 'embarque'), vesselCtrl.syncAis);
router.post('/vessels', protect, authorize('admin', 'terre'), vesselCtrl.create);
router.patch('/vessels/:id', protect, authorize('admin', 'terre', 'embarque'), vesselCtrl.update);

router.get('/catches', protect, catchCtrl.getAll);
router.get('/catches/stats', protect, catchCtrl.stats);
router.post('/catches', protect, authorize('admin', 'terre', 'embarque'), catchCtrl.create);

router.get('/nets', protect, netCtrl.getAll);
router.post('/nets', protect, authorize('admin', 'terre', 'embarque'), netCtrl.create);
router.patch('/nets/:id', protect, authorize('admin', 'terre', 'embarque'), netCtrl.update);
router.post('/nets/:id/alerts/:alertId/ack', protect, authorize('admin', 'terre', 'embarque'), netCtrl.acknowledgeAlert);

router.get('/ai/insights', protect, aiCtrl.insights);
router.post('/ai/chat', protect, aiCtrl.chat);

module.exports = router;