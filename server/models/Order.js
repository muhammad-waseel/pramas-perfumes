const mongoose = require('mongoose');

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    look: { type: Object },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: { type: [itemSchema], validate: [(v) => v.length > 0, 'Order has no items'] },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },
    shipping: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      province: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, maxlength: 300, default: '' },
    },
    paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
    giftWrap: { type: Boolean, default: false },
    coupon: { type: String, default: '' },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, required: true },
    giftWrapFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    history: [
      {
        status: { type: String, enum: STATUSES },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
