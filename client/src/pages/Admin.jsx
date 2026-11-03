import { Fragment, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { Empty, Spinner } from '../components/ui';
import { api, CATEGORY_LABELS, FAMILY_LABELS, rs } from '../api';
import { useAuth } from '../context/AuthContext';

const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const ACTION = { confirmed: 'Confirm', shipped: 'Mark shipped', delivered: 'Mark delivered', cancelled: 'Cancel' };

function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api('/admin/stats').then(setS).catch(() => setS({ error: true }));
  }, []);
  if (!s) return <Spinner />;
  if (s.error) return <p className="error">Could not load stats</p>;

  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ d, ...(s.daily.find((x) => x._id === d) || { revenue: 0, orders: 0 }) });
  }
  const peak = Math.max(1, ...days.map((d) => d.revenue));

  return (
    <div className="admin-dash" data-cy="admin-dashboard">
      <div className="kpis">
        <div className="kpi">
          <span>Revenue</span>
          <b data-cy="kpi-revenue">{rs(s.revenue)}</b>
          <small>excluding cancelled orders</small>
        </div>
        <div className="kpi">
          <span>Orders</span>
          <b data-cy="kpi-orders">{s.orders}</b>
          <small>{s.byStatus.pending || 0} waiting for confirmation</small>
        </div>
        <div className="kpi">
          <span>Average order</span>
          <b>{rs(s.orders ? Math.round(s.revenue / s.orders) : 0)}</b>
          <small>per order</small>
        </div>
        <div className="kpi">
          <span>Customers</span>
          <b>{s.customers}</b>
          <small>registered accounts</small>
        </div>
      </div>

      <div className="admin-two">
        <div className="card-panel">
          <h4>Revenue, last 14 days</h4>
          <div className="bars" role="img" aria-label="Daily revenue chart">
            {days.map((d) => (
              <div key={d.d} className="bar-col" title={`${d.d}: ${rs(d.revenue)} from ${d.orders} orders`}>
                <span className="bar" style={{ height: `${(d.revenue / peak) * 100}%` }} />
                <small>{d.d.slice(8)}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="card-panel">
          <h4>Low stock</h4>
          {s.lowStock.length === 0 ? (
            <p className="muted small">All sizes are well stocked.</p>
          ) : (
            <ul className="plain stock-list">
              {s.lowStock.map((l) => (
                <li key={`${l.slug}${l.size}`}>
                  <span>
                    {l.name} {l.size}ml
                  </span>
                  <b className={l.stock === 0 ? 'error' : 'low'}>{l.stock === 0 ? 'Sold out' : `${l.stock} left`}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="admin-two">
        <div className="card-panel">
          <h4>Recent orders</h4>
          <ul className="plain stock-list">
            {s.recent.map((o) => (
              <li key={o._id}>
                <span>
                  <b>{o.number}</b> · {o.customer.name} · {o.shipping.city}
                </span>
                <span className={`status status-${o.status}`}>{o.status}</span>
              </li>
            ))}
            {s.recent.length === 0 && <li className="muted">No orders yet</li>}
          </ul>
        </div>
        <div className="card-panel">
          <h4>Best sellers</h4>
          <ul className="plain stock-list">
            {s.top.map((p) => (
              <li key={p.slug}>
                <span className="row-gap">
                  <ProductImage item={p} size={80} className="thumb" /> {p.name}
                </span>
                <b>{p.sold} sold</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (q) qs.set('q', q);
    api(`/admin/orders?${qs}`).then((d) => setOrders(d.orders));
  };
  useEffect(() => {
    load();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (id, next) => {
    setError('');
    try {
      const { order } = await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: next } });
      setOrders((list) => list.map((o) => (o._id === id ? order : o)));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div data-cy="admin-orders">
      <div className="admin-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="row-gap"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no, name, phone, city" data-cy="admin-order-search" />
          <button className="btn btn-dark btn-sm">Search</button>
        </form>
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-cy="admin-status-filter">
          <option value="">All statuses</option>
          {Object.keys(NEXT).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {!orders ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Empty title="No orders found" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>City</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o._id}>
                  <tr data-cy="admin-order-row">
                    <td>
                      <button type="button" className="link-btn" onClick={() => setOpen(open === o._id ? null : o._id)}>
                        {o.number}
                      </button>
                      <div className="small muted">{new Date(o.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </td>
                    <td>
                      {o.customer.name}
                      <div className="small muted">{o.customer.phone}</div>
                    </td>
                    <td>{o.shipping.city}</td>
                    <td>{rs(o.total)}</td>
                    <td>
                      <span className={`status status-${o.status}`} data-cy="admin-order-status">
                        {o.status}
                      </span>
                    </td>
                    <td className="row-gap">
                      {NEXT[o.status].map((n) => (
                        <button key={n} type="button" className={`btn btn-sm ${n === 'cancelled' ? 'btn-ghost' : 'btn-dark'}`} onClick={() => move(o._id, n)} data-cy={`admin-action-${n}`}>
                          {ACTION[n]}
                        </button>
                      ))}
                    </td>
                  </tr>
                  {open === o._id && (
                    <tr className="detail-row">
                      <td colSpan="6">
                        <div className="order-detail">
                          <ul className="plain">
                            {o.items.map((i) => (
                              <li key={`${i.product}${i.size}`}>
                                {i.qty} × {i.name} {i.size}ml · {rs(i.price * i.qty)}
                              </li>
                            ))}
                          </ul>
                          <p className="small">
                            {o.shipping.address}, {o.shipping.city} {o.shipping.province} · {o.customer.email}
                            {o.shipping.notes && <> · Note: {o.shipping.notes}</>}
                            {o.giftWrap && <> · Gift wrap</>}
                            {o.coupon && <> · Coupon {o.coupon} (−{rs(o.discount)})</>}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const BLANK = {
  name: '',
  tagline: '',
  description: '',
  category: 'unisex',
  family: 'woody',
  concentration: 'EDP',
  longevity: '8-10 hours',
  notes: { top: [], heart: [], base: [] },
  image: '',
  variants: [{ size: 50, price: 2999, stock: 10, sku: '' }],
  look: { shape: 'tall', liquid: '#c9a25f', cap: '#1b1714', accent: '#f3e7d3' },
  featured: false,
  bestseller: false,
  newArrival: true,
  active: true,
};

function ProductEditor({ product, onClose, onSaved }) {
  const [p, setP] = useState(() => JSON.parse(JSON.stringify(product || BLANK)));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const setVariant = (i, k, v) => setP((x) => ({ ...x, variants: x.variants.map((vr, j) => (j === i ? { ...vr, [k]: v } : vr)) }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      ...p,
      variants: p.variants.map((v, i) => ({
        ...v,
        size: Number(v.size),
        price: Number(v.price),
        stock: Number(v.stock),
        compareAt: v.compareAt ? Number(v.compareAt) : undefined,
        sku: v.sku || `PR-${p.name.slice(0, 3).toUpperCase()}-${v.size}-${i}`,
      })),
    };
    try {
      const { product: saved } = product
        ? await api(`/admin/products/${product._id}`, { method: 'PUT', body })
        : await api('/admin/products', { method: 'POST', body });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-wrap" role="dialog" aria-label="Edit product">
      <div className="drawer-backdrop" onClick={onClose} />
      <form className="modal" onSubmit={save} data-cy="product-editor">
        <div className="drawer-head">
          <h3>{product ? `Edit ${product.name}` : 'New perfume'}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="editor-top">
            <div className="editor-photo">
              <ProductImage item={p} size={300} />
            </div>
            <div className="grow">
              <label className="field">
                <span>Name</span>
                <input value={p.name} onChange={(e) => set('name', e.target.value)} required data-cy="editor-name" />
              </label>
              <label className="field">
                <span>Tagline</span>
                <input value={p.tagline} onChange={(e) => set('tagline', e.target.value)} />
              </label>
              <label className="field">
                <span>Photo URL (Unsplash image link)</span>
                <input value={p.image || ''} onChange={(e) => set('image', e.target.value.split('?')[0])} placeholder="https://images.unsplash.com/photo-…" data-cy="editor-image" />
              </label>
            </div>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea rows="3" value={p.description} onChange={(e) => set('description', e.target.value)} />
          </label>
          <div className="form-row three">
            <label className="field">
              <span>Category</span>
              <select value={p.category} onChange={(e) => set('category', e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Family</span>
              <select value={p.family} onChange={(e) => set('family', e.target.value)}>
                {Object.entries(FAMILY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Type</span>
              <select value={p.concentration} onChange={(e) => set('concentration', e.target.value)}>
                {['EDP', 'EDT', 'Parfum', 'Attar'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row three">
            {['top', 'heart', 'base'].map((tier) => (
              <label key={tier} className="field">
                <span>{tier} notes (comma separated)</span>
                <input value={p.notes[tier].join(', ')} onChange={(e) => set('notes', { ...p.notes, [tier]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
              </label>
            ))}
          </div>

          <h4>Sizes, prices and stock</h4>
          {p.variants.map((v, i) => (
            <div className="form-row four" key={v._id || i}>
              <label className="field">
                <span>Size (ml)</span>
                <input type="number" min="1" value={v.size} onChange={(e) => setVariant(i, 'size', e.target.value)} />
              </label>
              <label className="field">
                <span>Price (Rs)</span>
                <input type="number" min="0" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} data-cy="editor-price" />
              </label>
              <label className="field">
                <span>Was (Rs, optional)</span>
                <input type="number" min="0" value={v.compareAt || ''} onChange={(e) => setVariant(i, 'compareAt', e.target.value)} />
              </label>
              <label className="field">
                <span>Stock</span>
                <input type="number" min="0" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} data-cy="editor-stock" />
              </label>
            </div>
          ))}
          <div className="row-gap">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('variants', [...p.variants, { size: 100, price: 4999, stock: 10, sku: '' }])}>
              + Add size
            </button>
            {p.variants.length > 1 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('variants', p.variants.slice(0, -1))}>
                Remove last size
              </button>
            )}
          </div>

          <h4>Fallback bottle drawing (shown when there is no photo)</h4>
          <div className="form-row four">
            <label className="field">
              <span>Shape</span>
              <select value={p.look.shape} onChange={(e) => set('look', { ...p.look, shape: e.target.value })}>
                {['tall', 'round', 'square', 'flacon', 'attar'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {['liquid', 'cap', 'accent'].map((k) => (
              <label key={k} className="field">
                <span>{k} colour</span>
                <input type="color" value={p.look[k]} onChange={(e) => set('look', { ...p.look, [k]: e.target.value })} />
              </label>
            ))}
          </div>

          <div className="row-gap wrap">
            {[
              ['featured', 'Featured'],
              ['bestseller', 'Bestseller'],
              ['newArrival', 'New arrival'],
              ['active', 'Visible in store'],
            ].map(([k, l]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={!!p[k]} onChange={(e) => set(k, e.target.checked)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="drawer-foot row-gap">
          <button className="btn btn-dark" disabled={busy} data-cy="editor-save">
            {busy ? 'Saving…' : 'Save perfume'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Products() {
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null); // product, 'new' or null

  useEffect(() => {
    api('/admin/products').then((d) => setProducts(d.products));
  }, []);

  const onSaved = (saved) => {
    setProducts((list) => (list.some((p) => p._id === saved._id) ? list.map((p) => (p._id === saved._id ? saved : p)) : [saved, ...list]));
    setEditing(null);
  };

  const toggleActive = async (p) => {
    const { product } = await api(`/admin/products/${p._id}`, { method: 'PUT', body: { active: !p.active } });
    onSaved(product);
  };

  if (!products) return <Spinner />;
  return (
    <div data-cy="admin-products">
      <div className="admin-toolbar">
        <span className="muted">{products.length} perfumes</span>
        <button type="button" className="btn btn-dark btn-sm" onClick={() => setEditing('new')} data-cy="add-product">
          + Add perfume
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>Perfume</th>
              <th>Category</th>
              <th>Sizes &amp; stock</th>
              <th>Sold</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className={p.active ? '' : 'inactive'} data-cy="admin-product-row">
                <td>
                  <ProductImage item={p} size={100} className="thumb" />
                </td>
                <td>
                  <b>{p.name}</b>
                  <div className="small muted">{FAMILY_LABELS[p.family]}</div>
                </td>
                <td>{CATEGORY_LABELS[p.category]}</td>
                <td>
                  {p.variants.map((v) => (
                    <div key={v._id} className="small">
                      {v.size}ml · {rs(v.price)} · <span className={v.stock <= 5 ? 'low' : ''}>{v.stock} in stock</span>
                    </div>
                  ))}
                </td>
                <td>{p.sold}</td>
                <td>{p.active ? <span className="status status-delivered">live</span> : <span className="status status-cancelled">hidden</span>}</td>
                <td className="row-gap">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(p)} data-cy="edit-product">
                    Edit
                  </button>
                  <button type="button" className="link-btn" onClick={() => toggleActive(p)}>
                    {p.active ? 'Hide' : 'Show'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}

export default function Admin() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user || user.role !== 'admin')
    return (
      <div className="container section">
        <Empty title="Admins only" text="Log in with the store admin account to manage orders and products.">
          <Link to="/account?next=/admin" className="btn btn-dark">
            Log in
          </Link>
        </Empty>
      </div>
    );

  return (
    <div className="container section admin">
      <div className="section-head">
        <div>
          <p className="eyebrow">Store admin</p>
          <h1>Pramas dashboard</h1>
        </div>
        <nav className="admin-tabs">
          <NavLink to="/admin" end>
            Overview
          </NavLink>
          <NavLink to="/admin/orders" data-cy="admin-tab-orders">
            Orders
          </NavLink>
          <NavLink to="/admin/products" data-cy="admin-tab-products">
            Products
          </NavLink>
        </nav>
      </div>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<Products />} />
      </Routes>
    </div>
  );
}
