const db = require('./setup');
const { api, seedProducts, registerUser } = require('./helpers');

beforeAll(() => db.connect('pramas_catalog'));
beforeEach(async () => {
  await db.clear();
  await seedProducts();
});
afterAll(() => db.disconnect());

describe('health and config', () => {
  test('health reports db connected', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('connected');
  });

  test('config exposes shipping rules and coupons', async () => {
    const res = await api().get('/api/config');
    expect(res.body.freeShippingFrom).toBe(5000);
    expect(res.body.coupons.map((c) => c.code)).toContain('WELCOME10');
  });

  test('unknown api route returns 404 json', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
  });
});

describe('product listing', () => {
  test('lists active products with pagination info', async () => {
    const res = await api().get('/api/products?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(5);
    expect(res.body.total).toBe(12);
    expect(res.body.pages).toBe(3);
    expect(res.body.products[0].reviews).toBeUndefined();
  });

  test('filters by category', async () => {
    const res = await api().get('/api/products?category=attar');
    expect(res.body.products.length).toBe(2);
    expect(res.body.products.every((p) => p.category === 'attar')).toBe(true);
  });

  test('filters by several families', async () => {
    const res = await api().get('/api/products?family=fresh,citrus');
    expect(res.body.products.map((p) => p.slug).sort()).toEqual(['narangi-bagh', 'sahil']);
  });

  test('filters by price range on the cheapest size', async () => {
    const res = await api().get('/api/products?min=3000&max=3500&limit=48');
    expect(res.body.products.length).toBeGreaterThan(0);
    res.body.products.forEach((p) => {
      expect(p.fromPrice).toBeGreaterThanOrEqual(3000);
      expect(p.fromPrice).toBeLessThanOrEqual(3500);
    });
  });

  test('searches by name and by note', async () => {
    const byName = await api().get('/api/products?q=kohsar');
    expect(byName.body.products[0].slug).toBe('kohsar');
    const byNote = await api().get('/api/products?q=saffron');
    expect(byNote.body.products.map((p) => p.slug)).toEqual(expect.arrayContaining(['shahi-oud', 'zafran-leather']));
  });

  test('search input with regex characters is safe', async () => {
    const res = await api().get('/api/products?q=(oud');
    expect(res.status).toBe(200);
  });

  test('sorts by price ascending and descending', async () => {
    const asc = await api().get('/api/products?sort=price-asc&limit=48');
    const prices = asc.body.products.map((p) => p.fromPrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const desc = await api().get('/api/products?sort=price-desc&limit=1');
    expect(desc.body.products[0].fromPrice).toBe(Math.max(...prices));
  });

  test('flags: sale, new and bestseller', async () => {
    const sale = await api().get('/api/products?flag=sale');
    expect(sale.body.products.every((p) => p.variants.some((v) => v.compareAt > 0))).toBe(true);
    const fresh = await api().get('/api/products?flag=new');
    expect(fresh.body.products.every((p) => p.newArrival)).toBe(true);
    const best = await api().get('/api/products?flag=bestseller');
    expect(best.body.products.every((p) => p.bestseller)).toBe(true);
  });

  test('reports stock status', async () => {
    const res = await api().get('/api/products?q=mushk');
    expect(res.body.products[0].inStock).toBe(true); // 6ml still in stock, 12ml sold out
  });
});

describe('product detail and reviews', () => {
  test('returns product by slug with related products', async () => {
    const res = await api().get('/api/products/shahi-oud');
    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe('Shahi Oud');
    expect(res.body.product.fromPrice).toBe(4950);
    expect(res.body.related.length).toBeGreaterThan(0);
    expect(res.body.related.find((p) => p.slug === 'shahi-oud')).toBeUndefined();
  });

  test('404 for unknown slug', async () => {
    const res = await api().get('/api/products/not-a-perfume');
    expect(res.status).toBe(404);
  });

  test('review requires login', async () => {
    const { body } = await api().get('/api/products/kohsar');
    const res = await api().post(`/api/products/${body.product._id}/reviews`).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  test('only buyers can review, once each', async () => {
    const { token } = await registerUser();
    const { body } = await api().get('/api/products/kohsar');
    const p = body.product;

    const before = await api().post(`/api/products/${p._id}/reviews`).set('Authorization', `Bearer ${token}`).send({ rating: 5 });
    expect(before.status).toBe(403);

    await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: p._id, variantId: p.variants[0]._id, qty: 1 }],
        customer: { name: 'Ali', email: 'ali@test.pk', phone: '03001234567' },
        shipping: { address: 'Street 1', city: 'Karachi' },
      });

    const bad = await api().post(`/api/products/${p._id}/reviews`).set('Authorization', `Bearer ${token}`).send({ rating: 9 });
    expect(bad.status).toBe(400);

    const ok = await api()
      .post(`/api/products/${p._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Fresh and long lasting' });
    expect(ok.status).toBe(201);
    expect(ok.body.rating).toBe(4);
    expect(ok.body.numReviews).toBe(1);

    const again = await api().post(`/api/products/${p._id}/reviews`).set('Authorization', `Bearer ${token}`).send({ rating: 3 });
    expect(again.status).toBe(409);
  });
});
