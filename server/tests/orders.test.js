const db = require('./setup');
const Product = require('../models/Product');
const { api, seedProducts, registerUser, adminToken, customer, shipping, line } = require('./helpers');
const { applyCoupon, computeTotals } = require('../utils/pricing');

let catalog;
const bySlug = (s) => catalog.find((p) => p.slug === s);

beforeAll(() => db.connect('pramas_orders'));
beforeEach(async () => {
  await db.clear();
  catalog = await seedProducts();
});
afterAll(() => db.disconnect());

describe('pricing rules', () => {
  test('percent coupon is capped', () => {
    expect(applyCoupon('welcome10', 30000)).toMatchObject({ code: 'WELCOME10', discount: 1000 });
    expect(applyCoupon('WELCOME10', 3000).discount).toBe(300);
  });

  test('flat coupon needs a minimum subtotal', () => {
    expect(applyCoupon('PRAMAS500', 3000).error).toMatch(/at least/);
    expect(applyCoupon('PRAMAS500', 4000).discount).toBe(500);
    expect(applyCoupon('FAKE', 4000).error).toMatch(/Invalid/);
  });

  test('free shipping from Rs 5,000 after discount, gift wrap adds Rs 300', () => {
    expect(computeTotals({ subtotal: 4000 })).toMatchObject({ shippingFee: 250, total: 4250 });
    expect(computeTotals({ subtotal: 5000 })).toMatchObject({ shippingFee: 0, total: 5000 });
    expect(computeTotals({ subtotal: 5200, couponCode: 'PRAMAS500' })).toMatchObject({ discount: 500, shippingFee: 250, total: 4950 });
    expect(computeTotals({ subtotal: 6000, giftWrap: true })).toMatchObject({ giftWrapFee: 300, total: 6300 });
  });
});

describe('checkout', () => {
  test('quote returns server-side totals', async () => {
    const res = await api()
      .post('/api/orders/quote')
      .send({ items: [line(bySlug('sahil'), 0, 1)], coupon: 'WELCOME10' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subtotal: 2750, discount: 275, shippingFee: 250, total: 2725, coupon: 'WELCOME10' });
  });

  test('quote rejects an invalid coupon', async () => {
    const res = await api().post('/api/orders/quote').send({ items: [line(bySlug('sahil'))], coupon: 'NOPE' });
    expect(res.status).toBe(400);
  });

  test('guest can place a cash-on-delivery order; stock goes down', async () => {
    const oud = bySlug('shahi-oud');
    const res = await api()
      .post('/api/orders')
      .send({ items: [line(oud, 1, 2)], customer, shipping, giftWrap: true });
    expect(res.status).toBe(201);
    const { order } = res.body;
    expect(order.number).toMatch(/^PR-/);
    expect(order.customer.phone).toBe('03001234567');
    expect(order).toMatchObject({ subtotal: 15900, shippingFee: 0, giftWrapFee: 300, total: 16200, status: 'pending', paymentMethod: 'cod' });

    const after = await Product.findById(oud._id);
    expect(after.variants[1].stock).toBe(oud.variants[1].stock - 2);
    expect(after.sold).toBe(oud.sold + 2);
  });

  test('prices sent by the browser are ignored', async () => {
    const res = await api()
      .post('/api/orders')
      .send({ items: [{ ...line(bySlug('kohsar')), price: 1 }], customer, shipping, total: 1 });
    expect(res.body.order.total).toBe(3250 + 250);
  });

  test('validates phone, email and address', async () => {
    const items = [line(bySlug('sahil'))];
    const badPhone = await api().post('/api/orders').send({ items, customer: { ...customer, phone: '12345' }, shipping });
    expect(badPhone.status).toBe(400);
    expect(badPhone.body.message).toMatch(/mobile/);
    const badEmail = await api().post('/api/orders').send({ items, customer: { ...customer, email: 'nope' }, shipping });
    expect(badEmail.status).toBe(400);
    const noCity = await api().post('/api/orders').send({ items, customer, shipping: { address: 'x' } });
    expect(noCity.status).toBe(400);
  });

  test('rejects empty cart, bad quantity and unknown items', async () => {
    expect((await api().post('/api/orders').send({ items: [], customer, shipping })).status).toBe(400);
    expect((await api().post('/api/orders').send({ items: [line(bySlug('sahil'), 0, 0)], customer, shipping })).status).toBe(400);
    expect((await api().post('/api/orders').send({ items: [line(bySlug('sahil'), 0, 11)], customer, shipping })).status).toBe(400);
    const ghost = await api()
      .post('/api/orders')
      .send({ items: [{ productId: '64b000000000000000000000', variantId: '64b000000000000000000001', qty: 1 }], customer, shipping });
    expect(ghost.status).toBe(400);
  });

  test('cannot buy more than is in stock, or a sold-out size', async () => {
    const kohsar = bySlug('kohsar'); // 100ml has 3 left
    const tooMany = await api().post('/api/orders').send({ items: [line(kohsar, 1, 4)], customer, shipping });
    expect(tooMany.status).toBe(409);
    const soldOut = await api().post('/api/orders').send({ items: [line(bySlug('mushk-e-khaas'), 1, 1)], customer, shipping });
    expect(soldOut.status).toBe(409);
  });

  test('two shoppers racing for the last bottles cannot oversell', async () => {
    const kohsar = bySlug('kohsar');
    const send = () => api().post('/api/orders').send({ items: [line(kohsar, 1, 2)], customer, shipping });
    const results = await Promise.all([send(), send()]);
    const ok = results.filter((r) => r.status === 201);
    expect(ok).toHaveLength(1);
    const after = await Product.findById(kohsar._id);
    expect(after.variants[1].stock).toBe(1);
  });
});

describe('tracking and my orders', () => {
  test('track an order with number and phone only', async () => {
    const { body } = await api().post('/api/orders').send({ items: [line(bySlug('sahil'))], customer, shipping });
    const ok = await api().get(`/api/orders/track?number=${body.order.number.toLowerCase()}&phone=0300-1234567`);
    expect(ok.status).toBe(200);
    expect(ok.body.order.status).toBe('pending');
    expect(ok.body.order.customer).toBeUndefined(); // no personal data leaks
    const wrongPhone = await api().get(`/api/orders/track?number=${body.order.number}&phone=03111111111`);
    expect(wrongPhone.status).toBe(404);
  });

  test('logged-in customers see their own orders and can cancel pending ones', async () => {
    const { token } = await registerUser();
    const other = await registerUser();
    const sahil = bySlug('sahil');
    const placed = await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [line(sahil, 0, 3)], customer, shipping });

    const mine = await api().get('/api/orders/mine').set('Authorization', `Bearer ${token}`);
    expect(mine.body.orders).toHaveLength(1);
    const theirs = await api().get('/api/orders/mine').set('Authorization', `Bearer ${other.token}`);
    expect(theirs.body.orders).toHaveLength(0);

    const notYours = await api().post(`/api/orders/${placed.body.order._id}/cancel`).set('Authorization', `Bearer ${other.token}`);
    expect(notYours.status).toBe(404);

    const cancel = await api().post(`/api/orders/${placed.body.order._id}/cancel`).set('Authorization', `Bearer ${token}`);
    expect(cancel.body.order.status).toBe('cancelled');
    const after = await Product.findById(sahil._id);
    expect(after.variants[0].stock).toBe(sahil.variants[0].stock); // restocked
  });
});

describe('admin', () => {
  test('customers cannot use admin routes', async () => {
    const { token } = await registerUser();
    expect((await api().get('/api/admin/stats').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    expect((await api().get('/api/admin/stats')).status).toBe(401);
  });

  test('order status follows pending → confirmed → shipped → delivered', async () => {
    const token = await adminToken();
    const { body } = await api().post('/api/orders').send({ items: [line(bySlug('sahil'))], customer, shipping });
    const id = body.order._id;
    const set = (status) => api().patch(`/api/admin/orders/${id}/status`).set('Authorization', `Bearer ${token}`).send({ status });

    expect((await set('delivered')).status).toBe(400); // cannot skip steps
    expect((await set('confirmed')).body.order.status).toBe('confirmed');
    expect((await set('shipped')).body.order.status).toBe('shipped');
    const done = await set('delivered');
    expect(done.body.order.history.map((h) => h.status)).toEqual(['pending', 'confirmed', 'shipped', 'delivered']);
    expect((await set('cancelled')).status).toBe(400);
  });

  test('admin cancelling an order restocks it', async () => {
    const token = await adminToken();
    const oud = bySlug('shahi-oud');
    const { body } = await api().post('/api/orders').send({ items: [line(oud, 0, 2)], customer, shipping });
    await api().patch(`/api/admin/orders/${body.order._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'cancelled' });
    expect((await Product.findById(oud._id)).variants[0].stock).toBe(oud.variants[0].stock);
  });

  test('stats summarise revenue, orders and low stock', async () => {
    const token = await adminToken();
    await api().post('/api/orders').send({ items: [line(bySlug('sahil'), 0, 2)], customer, shipping });
    const res = await api().get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.body.orders).toBe(1);
    expect(res.body.revenue).toBe(5500);
    expect(res.body.byStatus.pending).toBe(1);
    expect(res.body.lowStock.map((l) => l.name)).toEqual(expect.arrayContaining(['Kohsar', 'Mushk-e-Khaas']));
    expect(res.body.daily).toHaveLength(1);
  });

  test('admin can search and filter orders', async () => {
    const token = await adminToken();
    await api().post('/api/orders').send({ items: [line(bySlug('sahil'))], customer, shipping });
    await api().post('/api/orders').send({ items: [line(bySlug('sahil'))], customer, shipping: { ...shipping, city: 'Peshawar' } });
    const res = await api().get('/api/admin/orders?q=peshawar').set('Authorization', `Bearer ${token}`);
    expect(res.body.orders).toHaveLength(1);
    const pending = await api().get('/api/admin/orders?status=pending').set('Authorization', `Bearer ${token}`);
    expect(pending.body.orders).toHaveLength(2);
  });

  test('admin creates, edits and hides a product', async () => {
    const token = await adminToken();
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const created = await auth(api().post('/api/admin/products')).send({
      name: 'Bahar Musk',
      category: 'women',
      family: 'musk',
      variants: [{ size: 50, price: 2999, stock: 10, sku: 'PR-BM-50' }],
    });
    expect(created.status).toBe(201);
    expect(created.body.product.slug).toBe('bahar-musk');

    const noSizes = await auth(api().post('/api/admin/products')).send({ name: 'Empty', category: 'men', family: 'woody', variants: [] });
    expect(noSizes.status).toBe(400);

    const id = created.body.product._id;
    const edited = await auth(api().put(`/api/admin/products/${id}`)).send({ tagline: 'Soft spring musk', featured: true });
    expect(edited.body.product).toMatchObject({ tagline: 'Soft spring musk', featured: true });

    await auth(api().delete(`/api/admin/products/${id}`));
    expect((await api().get('/api/products/bahar-musk')).status).toBe(404);
    const all = await auth(api().get('/api/admin/products'));
    expect(all.body.products.find((p) => p.slug === 'bahar-musk').active).toBe(false);
  });
});
