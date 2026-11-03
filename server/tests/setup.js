const fs = require('fs');
const mongoose = require('mongoose');
const { URI_FILE } = require('./globalSetup');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.ORDER_RATE_LIMIT = '10000';


async function connect(dbName) {
  const base = fs.readFileSync(URI_FILE, 'utf8').trim();
  const uri = `${base.replace(/\/$/, '')}/${dbName}`;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
}

module.exports = { connect, clear, disconnect };
