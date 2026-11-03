require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const app = require('./app');
const seed = require('./seed');

const PORT = process.env.PORT || 5000;
const { MONGO_URI, JWT_SECRET } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('Missing required environment variables: MONGO_URI and JWT_SECRET');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { dbName: process.env.MONGO_DB_NAME || undefined })
  .then(async () => {
    console.log('MongoDB connected');
    await seed();
    app.listen(PORT, () => console.log(`Pramas store running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
