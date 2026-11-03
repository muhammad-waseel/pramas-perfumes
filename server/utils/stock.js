const Product = require('../models/Product');

// Changes stock for one size using optimistic locking: the write only succeeds if nobody else
// changed the product since we read it, so two shoppers can never buy the same last bottle.
// delta < 0 reserves stock (fails if not enough left), delta > 0 puts it back.
async function adjustStock(productId, variantId, delta, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    const product = await Product.findById(productId).select('variants sold __v').lean();
    if (!product) return false;
    const idx = product.variants.findIndex((v) => String(v._id) === String(variantId));
    if (idx === -1) return false;
    const stock = product.variants[idx].stock + delta;
    if (stock < 0) return false;
    const r = await Product.updateOne(
      { _id: productId, __v: product.__v },
      { $set: { [`variants.${idx}.stock`]: stock, sold: Math.max(0, (product.sold || 0) - delta) }, $inc: { __v: 1 } }
    );
    if (r.modifiedCount === 1) return true;
  }
  return false;
}

module.exports = { adjustStock };
