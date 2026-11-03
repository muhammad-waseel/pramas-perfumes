const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const SORTS = {
  featured: { featured: -1, sold: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  bestselling: { sold: -1 },
  rating: { rating: -1, numReviews: -1 },
  'price-asc': { minPrice: 1 },
  'price-desc': { minPrice: -1 },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/products?category=&family=&q=&min=&max=&sort=&page=&limit=&flag=
router.get('/', async (req, res) => {
  const { category, family, q, min, max, sort = 'featured', flag } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const match = { active: true };
  if (category) match.category = { $in: String(category).split(',') };
  if (family) match.family = { $in: String(family).split(',') };
  if (flag === 'bestseller') match.bestseller = true;
  if (flag === 'new') match.newArrival = true;
  if (flag === 'featured') match.featured = true;
  if (flag === 'sale') match['variants.compareAt'] = { $gt: 0 };
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 60)), 'i');
    match.$or = [{ name: rx }, { tagline: rx }, { family: rx }, { 'notes.top': rx }, { 'notes.heart': rx }, { 'notes.base': rx }];
  }

  if (min || max) {
    match.minPrice = {};
    if (min) match.minPrice.$gte = Number(min);
    if (max) match.minPrice.$lte = Number(max);
  }

  const [products, count] = await Promise.all([
    Product.find(match)
      .select('-reviews')
      .sort({ ...(SORTS[sort] || SORTS.featured), _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(match),
  ]);

  res.json({ products, total: count, page, pages: Math.max(1, Math.ceil(count / limit)) });
});

router.get('/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const related = await Product.find({
    _id: { $ne: product._id },
    active: true,
    $or: [{ family: product.family }, { category: product.category }],
  })
    .select('-reviews')
    .sort({ sold: -1 })
    .limit(4);
  res.json({ product, related });
});

router.post('/:id/reviews', requireAuth, async (req, res) => {
  const product = await Product.findById(req.params.id).catch(() => null);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
  }
  if (product.reviews.some((r) => String(r.user) === String(req.user._id))) {
    return res.status(409).json({ message: 'You have already reviewed this perfume' });
  }
  const bought = await Order.exists({ user: req.user._id, 'items.product': product._id, status: { $ne: 'cancelled' } });
  if (!bought) return res.status(403).json({ message: 'Only customers who ordered this perfume can review it' });

  product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment: req.body?.comment || '' });
  product.recalcRating();
  await product.save();
  res.status(201).json({ rating: product.rating, numReviews: product.numReviews, reviews: product.reviews });
});

module.exports = router;
