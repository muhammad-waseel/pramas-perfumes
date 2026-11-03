// Starts one in-memory MongoDB for the whole test run unless MONGO_URI_TEST is provided.
// The URI is shared with the test files through a small temp file.
const fs = require('fs');
const os = require('os');
const path = require('path');

const URI_FILE = path.join(os.tmpdir(), 'pramas-test-mongo-uri');

module.exports = async () => {
  let uri = process.env.MONGO_URI_TEST || process.env.TEST_GLOBAL_URI;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const server = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION || '8.0.4' } });
    globalThis.__MONGO_SERVER__ = server;
    uri = server.getUri();
  }
  fs.writeFileSync(URI_FILE, uri.replace(/\/$/, ''));
};

module.exports.URI_FILE = URI_FILE;
