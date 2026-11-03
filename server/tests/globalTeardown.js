const fs = require('fs');
const { URI_FILE } = require('./globalSetup');

module.exports = async () => {
  if (globalThis.__MONGO_SERVER__) await globalThis.__MONGO_SERVER__.stop();
  fs.rmSync(URI_FILE, { force: true });
};
