// All money is in whole Pakistani Rupees (PKR). Totals are always computed on the server.
const SHIPPING_FEE = 250;
const FREE_SHIPPING_FROM = 5000;
const GIFT_WRAP_FEE = 300;

const COUPONS = {
  WELCOME10: { type: 'percent', value: 10, max: 1000, minSubtotal: 0, label: '10% off your first order' },
  PRAMAS500: { type: 'flat', value: 500, minSubtotal: 4000, label: 'Rs 500 off orders above Rs 4,000' },
};

function applyCoupon(code, subtotal) {
  if (!code) return { code: '', discount: 0 };
  const key = String(code).trim().toUpperCase();
  const coupon = COUPONS[key];
  if (!coupon) return { error: 'Invalid coupon code' };
  if (subtotal < coupon.minSubtotal) {
    return { error: `This code needs a subtotal of at least Rs ${coupon.minSubtotal.toLocaleString('en-PK')}` };
  }
  let discount = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.max) discount = Math.min(discount, coupon.max);
  discount = Math.min(discount, subtotal);
  return { code: key, discount, label: coupon.label };
}

function computeTotals({ subtotal, couponCode, giftWrap }) {
  const coupon = applyCoupon(couponCode, subtotal);
  if (coupon.error) return { error: coupon.error };
  const afterDiscount = subtotal - coupon.discount;
  const shippingFee = afterDiscount >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_FEE;
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;
  return {
    subtotal,
    coupon: coupon.code,
    discount: coupon.discount,
    shippingFee,
    giftWrapFee,
    total: afterDiscount + shippingFee + giftWrapFee,
  };
}

module.exports = { SHIPPING_FEE, FREE_SHIPPING_FROM, GIFT_WRAP_FEE, COUPONS, applyCoupon, computeTotals };
