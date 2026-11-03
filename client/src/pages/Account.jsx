import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Empty, Spinner } from '../components/ui';
import { Timeline } from './Track';
import { api, rs } from '../api';
import { useAuth } from '../context/AuthContext';

function AuthForms() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = mode === 'login' ? await login(form.email, form.password) : await register(form);
      const next = params.get('next');
      if (next && next.startsWith('/')) navigate(next);
      else if (u.role === 'admin') navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container section narrow">
      <div className="auth card-panel">
        <div className="tabs" role="tablist">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')} data-cy="tab-login">
            Log in
          </button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')} data-cy="tab-register">
            Create account
          </button>
        </div>
        <form className="form" onSubmit={submit} data-cy="auth-form">
          {mode === 'register' && (
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={set('name')} required autoComplete="name" data-cy="auth-name" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" data-cy="auth-email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              data-cy="auth-password"
            />
          </label>
          {mode === 'register' && (
            <label className="field">
              <span>Mobile number (optional)</span>
              <input value={form.phone} onChange={set('phone')} placeholder="03XX XXXXXXX" autoComplete="tel" />
            </label>
          )}
          {error && (
            <p className="error" data-cy="auth-error">
              {error}
            </p>
          )}
          <button className="btn btn-dark btn-block" disabled={busy} data-cy="auth-submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, ready, logout } = useAuth();
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);

  const load = () =>
    api('/orders/mine')
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]));

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!ready) return <Spinner />;
  if (!user) return <AuthForms />;

  const cancel = async (id) => {
    await api(`/orders/${id}/cancel`, { method: 'POST' });
    load();
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">My account</p>
          <h1 data-cy="account-name">Salaam, {user.name.split(' ')[0]}</h1>
          <p className="muted">{user.email}</p>
        </div>
        <div className="row-gap">
          {user.role === 'admin' && (
            <Link to="/admin" className="btn btn-gold btn-sm">
              Admin panel
            </Link>
          )}
          <Link to="/wishlist" className="btn btn-ghost btn-sm">
            Wishlist
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout} data-cy="logout">
            Log out
          </button>
        </div>
      </div>

      <h3>My orders</h3>
      {!orders ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Empty title="No orders yet" text="When you place an order it will show up here.">
          <Link to="/shop" className="btn btn-dark">
            Start shopping
          </Link>
        </Empty>
      ) : (
        <div className="orders">
          {orders.map((o) => (
            <div key={o._id} className="card-panel order-row" data-cy="my-order">
              <div className="row-between">
                <div>
                  <b>{o.number}</b>
                  <span className="small muted">
                    {' '}
                    · {new Date(o.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })} · {o.items.reduce((s, i) => s + i.qty, 0)} items
                  </span>
                </div>
                <div className="row-gap">
                  <span className={`status status-${o.status}`}>{o.status}</span>
                  <b>{rs(o.total)}</b>
                  <button type="button" className="link-btn" onClick={() => setOpen(open === o._id ? null : o._id)}>
                    {open === o._id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>
              {open === o._id && (
                <div className="order-detail">
                  <Timeline order={o} />
                  <ul className="plain">
                    {o.items.map((i) => (
                      <li key={`${i.product}${i.size}`}>
                        {i.qty} × {i.name} {i.size}ml · {rs(i.price * i.qty)}
                      </li>
                    ))}
                  </ul>
                  <p className="small muted">
                    {o.shipping.address}, {o.shipping.city}
                  </p>
                  {o.status === 'pending' && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(o._id)} data-cy="cancel-order">
                      Cancel order
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
