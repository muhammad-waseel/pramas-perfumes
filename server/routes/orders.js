const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { computeTotals, applyCoupon } = require('../utils/pricing');
const { adjustStock } = require('../utils/stock');

const router = express.Router();

const PHONE_RX = /^(\+92|0)3\d{9}$/;
const normalisePhone = (p) => String(p || '').replace(/[\s-]/g, '');

function orderNumber() {
  return `PR-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

// Resolve cart lines against the database so prices and stock come from the server, never the browser.
async function priceCart(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return { error: 'Your cart is empty' };
  if (lines.length > 30) return { error: 'Too many items in one order' };
  const ids = lines.map((l) => l.productId).filter((id) => mongoose.isValidObjectId(id));
  const products = await Product.find({ _id: { $in: ids }, active: true });
  const items = [];
  for (const line of lines) {
    const qty = parseInt(line.qty, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return { error: 'Quantity must be between 1 and 10' };
    const product = products.find((p) => String(p._id) === String(line.productId));
    const variant = product?.variants.id(line.variantId);
    if (!product || !variant) return { error: 'One of the items in your cart is no longer available' };
    if (variant.stock < qty) {
      return { error: `Only ${variant.stock} left of ${product.name} ${variant.size}ml`, code: 'OUT_OF_STOCK' };
    }
    items.push({ product: product._id, variant: variant._id, name: product.name, size: variant.size, price: variant.price, qty, look: product.look, image: product.image });
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  return { items, subtotal };
}

// Preview totals for the checkout page (coupon check, shipping)
router.post('/quote', async (req, res) => {
  const cart = await priceCart(req.body?.items);
  if (cart.error) return res.status(400).json({ message: cart.error });
  const totals = computeTotals({ subtotal: cart.subtotal, couponCode: req.body?.coupon, giftWrap: !!req.body?.giftWrap });
  if (totals.error) return res.status(400).json({ message: totals.error });
  res.json({ items: cart.items, ...totals, couponLabel: applyCoupon(totals.coupon, cart.subtotal).label || '' });
});

router.post('/', optionalAuth, async (req, res) => {
  const { items, customer = {}, shipping = {}, coupon, giftWrap } = req.body || {};
  const phone = normalisePhone(customer.phone);
  if (!customer.name || !customer.email || !phone) return res.status(400).json({ message: 'Name, email and phone are required' });
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) return res.status(400).json({ message: 'Please enter a valid email' });
  if (!PHONE_RX.test(phone)) return res.status(400).json({ message: 'Please enter a valid Pakistani mobile number, e.g. 03001234567' });
  if (!shipping.address || !shipping.city) return res.status(400).json({ message: 'Address and city are required' });

  const cart = await priceCart(items);
  if (cart.error) return res.status(cart.code === 'OUT_OF_STOCK' ? 409 : 400).json({ message: cart.error });
  const totals = computeTotals({ subtotal: cart.subtotal, couponCode: coupon, giftWrap: !!giftWrap });
  if (totals.error) return res.status(400).json({ message: totals.error });

  // Reserve stock atomically; roll back if any line fails (e.g. two shoppers buying the last bottle).
  const reserved = [];
  for (const item of cart.items) {
    const ok = await adjustStock(item.product, item.variant, -item.qty);
    if (!ok) {
      for (const x of reserved) await adjustStock(x.product, x.variant, x.qty);
      return res.status(409).json({ message: `Sorry, ${item.name} ${item.size}ml just sold out` });
    }
    reserved.push(item);
  }

  const order = await Order.create({
    number: orderNumber(),
    user: req.user?._id,
    items: cart.items,
    customer: { name: customer.name, email: customer.email, phone },
    shipping,
    giftWrap: !!giftWrap,
    coupon: totals.coupon,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shippingFee: totals.shippingFee,
    giftWrapFee: totals.giftWrapFee,
    total: totals.total,
    history: [{ status: 'pending' }],
  });
  res.status(201).json({ order });
});

router.get('/mine', requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// Public tracking: needs both the order number and the phone used at checkout.
router.get('/track', async (req, res) => {
  const number = String(req.query.number || '').trim().toUpperCase();
  const phone = normalisePhone(req.query.phone);
  if (!number || !phone) return res.status(400).json({ message: 'Order number and phone are required' });
  const order = await Order.findOne({ number, 'customer.phone': phone });
  if (!order) return res.status(404).json({ message: 'No order found with these details' });
  res.json({
    order: {
      number: order.number,
      status: order.status,
      history: order.history,
      items: order.items,
      total: order.total,
      city: order.shipping.city,
      createdAt: order.createdAt,
    },
  });
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).catch(() => null);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'pending') return res.status(400).json({ message: 'Only pending orders can be cancelled' });
  await restock(order);
  order.status = 'cancelled';
  order.history.push({ status: 'cancelled' });
  await order.save();
  res.json({ order });
});

async function restock(order) {
  for (const i of order.items) await adjustStock(i.product, i.variant, i.qty);
}

module.exports = router;
module.exports.restock = restock;
