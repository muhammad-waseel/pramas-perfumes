const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function loadUser(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(payload.sub);
}

async function requireAuth(req, res, next) {
  try {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ message: 'Please log in to continue' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired, please log in again' });
  }
}

// Attaches req.user when a valid token is sent, but never blocks the request.
async function optionalAuth(req, res, next) {
  try {
    req.user = (await loadUser(req)) || null;
  } catch {
    req.user = null;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  return next();
}

module.exports = { signToken, requireAuth, optionalAuth, requireAdmin };
