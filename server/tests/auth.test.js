const db = require('./setup');
const User = require('../models/User');
const Product = require('../models/Product');
const seed = require('../seed');
const { api, registerUser, seedProducts } = require('./helpers');

beforeAll(() => db.connect('pramas_auth'));
beforeEach(() => db.clear());
afterAll(() => db.disconnect());

describe('accounts', () => {
  test('register returns a token and never the password', async () => {
    const { token, user } = await registerUser();
    expect(token).toBeTruthy();
    expect(user.role).toBe('customer');
    expect(user.password).toBeUndefined();
    const stored = await User.findById(user.id).select('+password');
    expect(stored.password).not.toBe('secret123');
  });

  test('register validates input and blocks duplicates', async () => {
    expect((await api().post('/api/auth/register').send({ email: 'a@b.pk', password: 'secret123' })).status).toBe(400);
    expect((await api().post('/api/auth/register').send({ name: 'A', email: 'a@b.pk', password: '123' })).status).toBe(400);
    expect((await api().post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'secret123' })).status).toBe(400);
    await api().post('/api/auth/register').send({ name: 'A', email: 'a@b.pk', password: 'secret123' });
    expect((await api().post('/api/auth/register').send({ name: 'B', email: 'A@B.pk', password: 'secret123' })).status).toBe(409);
  });

  test('registering cannot make yourself an admin', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'X', email: 'x@y.pk', password: 'secret123', role: 'admin' });
    expect(res.body.user.role).toBe('customer');
  });

  test('login works with the right password only', async () => {
    const { body } = await registerUser();
    expect((await api().post('/api/auth/login').send({ email: body.email, password: 'wrong' })).status).toBe(401);
    const ok = await api().post('/api/auth/login').send({ email: body.email.toUpperCase(), password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  test('me and profile update need a valid token', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const { token } = await registerUser();
    const res = await api().patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ phone: '03001112222' });
    expect(res.body.user.phone).toBe('03001112222');
  });

  test('wishlist toggles products on and off', async () => {
    const [product] = await seedProducts();
    const { token } = await registerUser();
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const add = await auth(api().post(`/api/auth/wishlist/${product._id}`));
    expect(add.body.added).toBe(true);
    expect((await auth(api().get('/api/auth/wishlist'))).body.products).toHaveLength(1);
    const remove = await auth(api().post(`/api/auth/wishlist/${product._id}`));
    expect(remove.body.added).toBe(false);
    expect((await auth(api().post('/api/auth/wishlist/not-an-id'))).status).toBe(404);
  });
});

describe('seeding', () => {
  test('seeds the catalogue once and creates the admin from env', async () => {
    process.env.ADMIN_EMAIL = 'owner@pramas.pk';
    process.env.ADMIN_PASSWORD = 'owner-pass-1';
    await seed({ log: () => {} });
    await seed({ log: () => {} });
    expect(await Product.countDocuments()).toBe(12);
    const admin = await User.findOne({ email: 'owner@pramas.pk' });
    expect(admin.role).toBe('admin');
    const login = await api().post('/api/auth/login').send({ email: 'owner@pramas.pk', password: 'owner-pass-1' });
    expect(login.body.user.role).toBe('admin');
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
  });
});
