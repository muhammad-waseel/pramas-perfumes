const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const { COUPONS, SHIPPING_FEE, FREE_SHIPPING_FROM, GIFT_WRAP_FEE } = require('./utils/pricing');

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'font-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
      },
    },
  })
);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 100),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'local',
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.get('/api/config', (req, res) => {
  res.json({
    shippingFee: SHIPPING_FEE,
    freeShippingFrom: FREE_SHIPPING_FROM,
    giftWrapFee: GIFT_WRAP_FEE,
    coupons: Object.entries(COUPONS).map(([code, c]) => ({ code, label: c.label })),
  });
});
app.use('/api/products', productRoutes);
app.use('/api/orders', rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.ORDER_RATE_LIMIT || 60) }), orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Serve the built React client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate value' });
  if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_ERRORS) console.error(err);
  return res.status(500).json({ message: 'Something went wrong' });
});

module.exports = app;
