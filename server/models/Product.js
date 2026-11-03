const mongoose = require('mongoose');

const CATEGORIES = ['men', 'women', 'unisex', 'attar', 'gift-sets'];
const FAMILIES = ['oud', 'woody', 'floral', 'fresh', 'amber', 'musk', 'citrus', 'spicy'];

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 600, default: '' },
  },
  { timestamps: true }
);

const variantSchema = new mongoose.Schema(
  {
    size: { type: Number, required: true, min: 1 }, // ml
    price: { type: Number, required: true, min: 0 }, // PKR
    compareAt: { type: Number, min: 0 }, // original price when on sale
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, required: true },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true, maxlength: 140, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    family: { type: String, enum: FAMILIES, required: true },
    concentration: { type: String, enum: ['EDP', 'EDT', 'Parfum', 'Attar'], default: 'EDP' },
    notes: {
      top: [String],
      heart: [String],
      base: [String],
    },
    longevity: { type: String, default: '8-10 hours' },
    variants: { type: [variantSchema], validate: [(v) => v.length > 0, 'At least one size is required'] },
    image: { type: String, trim: true, default: '' }, // main product photo URL
    gallery: [{ type: String, trim: true }],
    // Fallback bottle drawing used when there is no photo
    look: {
      shape: { type: String, enum: ['tall', 'round', 'square', 'flacon', 'attar'], default: 'tall' },
      liquid: { type: String, default: '#c9a25f' },
      cap: { type: String, default: '#1b1714' },
      accent: { type: String, default: '#f3e7d3' },
    },
    featured: { type: Boolean, default: false },
    bestseller: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    minPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Cheapest size, stored so the shop can filter and sort by price quickly
productSchema.pre('validate', function setMinPrice() {
  if (this.variants?.length) this.minPrice = Math.min(...this.variants.map((v) => v.price));
});
productSchema.virtual('fromPrice').get(function fromPrice() {
  return this.minPrice;
});
productSchema.virtual('inStock').get(function inStock() {
  return this.variants.some((v) => v.stock > 0);
});
productSchema.set('toJSON', { virtuals: true });

productSchema.methods.recalcRating = function recalcRating() {
  this.numReviews = this.reviews.length;
  this.rating = this.numReviews
    ? Math.round((this.reviews.reduce((s, r) => s + r.rating, 0) / this.numReviews) * 10) / 10
    : 0;
};

productSchema.index({ name: 'text', tagline: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.FAMILIES = FAMILIES;
