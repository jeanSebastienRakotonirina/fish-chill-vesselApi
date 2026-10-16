const app = require('./app');
const connectDB = require('./config/db');
const { connectMQTT } = require('./services/mqttService');

const PORT = process.env.PORT || 3001;

const start = async () => {
  await connectDB();
  if (process.env.NODE_ENV !== 'test') {
    connectMQTT();
  }

  app.listen(PORT, () => {
    console.log(`Fish&Chill backend démarré sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  });
};

if (require.main === module) {
  start();
}

module.exports = app;
