const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const products = require('../data/products');

const api = () => request(app);

let n = 0;
async function registerUser(extra = {}) {
  n += 1;
  const body = { name: `Ali ${n}`, email: `ali${n}_${Date.now()}@test.pk`, password: 'secret123', ...extra };
  const res = await api().post('/api/auth/register').send(body);
  return { token: res.body.token, user: res.body.user, body };
}

async function adminToken() {
  const email = `admin${Date.now()}${(n += 1)}@pramas.pk`;
  await User.create({ name: 'Admin', email, password: 'admin123', role: 'admin' });
  const res = await api().post('/api/auth/login').send({ email, password: 'admin123' });
  return res.body.token;
}

async function seedProducts() {
  await Product.insertMany(products);
  return Product.find();
}

const customer = { name: 'Sara Khan', email: 'sara@test.pk', phone: '0300 1234567' };
const shipping = { address: 'House 12, Street 4, DHA Phase 5', city: 'Lahore', province: 'Punjab' };

function line(product, sizeIndex = 0, qty = 1) {
  return { productId: String(product._id), variantId: String(product.variants[sizeIndex]._id), qty };
}

module.exports = { api, registerUser, adminToken, seedProducts, customer, shipping, line };
