const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { restock } = require('./orders');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

router.get('/stats', async (req, res) => {
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const [orders, customers, products, recent] = await Promise.all([
    Order.find().select('total status createdAt').lean(),
    User.countDocuments({ role: 'customer' }),
    Product.find().select('name slug sold look image variants active').lean(),
    Order.find().sort({ createdAt: -1 }).limit(6),
  ]);

  const live = orders.filter((o) => o.status !== 'cancelled');
  const byStatus = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  const days = {};
  for (const o of live) {
    if (new Date(o.createdAt).getTime() < since) continue;
    const day = new Date(o.createdAt).toISOString().slice(0, 10);
    days[day] = days[day] || { _id: day, revenue: 0, orders: 0 };
    days[day].revenue += o.total;
    days[day].orders += 1;
  }

  const lowStock = products
    .filter((p) => p.active)
    .flatMap((p) => p.variants.filter((v) => v.stock <= 5).map((v) => ({ name: p.name, slug: p.slug, size: v.size, stock: v.stock })))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  const top = [...products]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map(({ name, slug, sold, look, image }) => ({ name, slug, sold, look, image }));

  res.json({
    revenue: live.reduce((s, o) => s + o.total, 0),
    orders: live.length,
    byStatus,
    customers,
    lowStock,
    recent,
    top,
    daily: Object.values(days).sort((a, b) => a._id.localeCompare(b._id)),
  });
});

// Products
router.get('/products', async (req, res) => {
  const products = await Product.find().select('-reviews').sort({ createdAt: -1 });
  res.json({ products });
});

router.post('/products', async (req, res) => {
  const body = { ...req.body };
  body.slug = slugify(body.slug || body.name || '');
  if (!body.slug) return res.status(400).json({ message: 'Name is required' });
  const product = await Product.create(body);
  res.status(201).json({ product });
});

router.put('/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).catch(() => null);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const allowed = ['name', 'tagline', 'description', 'category', 'family', 'concentration', 'notes', 'longevity', 'variants', 'look', 'image', 'gallery', 'featured', 'bestseller', 'newArrival', 'active'];
  for (const key of allowed) if (req.body[key] !== undefined) product[key] = req.body[key];
  if (req.body.slug) product.slug = slugify(req.body.slug);
  await product.save();
  res.json({ product });
});

router.delete('/products/:id', async (req, res) => {
  // Soft delete keeps old orders intact
  const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true }).catch(() => null);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
});

// Orders
router.get('/orders', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ number: rx }, { 'customer.name': rx }, { 'customer.phone': rx }, { 'shipping.city': rx }];
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ orders });
});

router.patch('/orders/:id/status', async (req, res) => {
  const order = await Order.findById(req.params.id).catch(() => null);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const { status } = req.body || {};
  if (!NEXT[order.status].includes(status)) {
    return res.status(400).json({ message: `Cannot move an order from ${order.status} to ${status}` });
  }
  if (status === 'cancelled') await restock(order);
  order.status = status;
  order.history.push({ status });
  await order.save();
  res.json({ order });
});

module.exports = router;
