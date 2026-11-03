const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({ name, email, password, phone: phone || '' });
  res.status(201).json({ token: signToken(user._id), user: user.toPublic() });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.checkPassword(String(password)))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  res.json({ token: signToken(user._id), user: user.toPublic() });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

router.patch('/me', requireAuth, async (req, res) => {
  const { name, phone } = req.body || {};
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// Wishlist
router.get('/wishlist', requireAuth, async (req, res) => {
  const products = await Product.find({ _id: { $in: req.user.wishlist }, active: true }).select('-reviews');
  res.json({ products });
});

router.post('/wishlist/:productId', requireAuth, async (req, res) => {
  const product = await Product.findById(req.params.productId).catch(() => null);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const id = String(product._id);
  const has = req.user.wishlist.some((p) => String(p) === id);
  req.user.wishlist = has ? req.user.wishlist.filter((p) => String(p) !== id) : [...req.user.wishlist, product._id];
  await req.user.save();
  res.json({ wishlist: req.user.wishlist.map(String), added: !has });
});

module.exports = router;
