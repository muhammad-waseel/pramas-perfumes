const Product = require('./models/Product');
const User = require('./models/User');
const products = require('./data/products');

// Adds the starter catalogue when the store is empty, and makes sure the admin account exists.
async function seed({ log = console.log } = {}) {
  if ((await Product.estimatedDocumentCount()) === 0) {
    await Product.insertMany(products);
    log(`Seeded ${products.length} products`);
  }
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (!existing) {
      await User.create({ name: 'Store Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
      log('Admin account created');
    } else if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
  }
}

module.exports = seed;

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const mongoose = require('mongoose');
  mongoose
    .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || undefined })
    .then(() => seed())
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
