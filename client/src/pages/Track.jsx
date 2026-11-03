import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { api, rs } from '../api';

const STEPS = [
  ['pending', 'Order placed'],
  ['confirmed', 'Confirmed'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
];

export function Timeline({ order }) {
  if (order.status === 'cancelled') return <p className="badge badge-muted">This order was cancelled</p>;
  const reached = STEPS.findIndex(([s]) => s === order.status);
  const when = (s) => order.history?.find((h) => h.status === s)?.at;
  return (
    <ol className="timeline" data-cy="timeline">
      {STEPS.map(([s, label], i) => (
        <li key={s} className={i <= reached ? 'done' : ''}>
          <span className="tl-dot" />
          <b>{label}</b>
          {when(s) && <span className="small muted">{new Date(when(s)).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function Track() {
  const [params] = useSearchParams();
  const [number, setNumber] = useState(params.get('number') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOrder(null);
    try {
      const data = await api(`/orders/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`, { auth: false });
      setOrder(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section narrow">
      <p className="eyebrow">Order tracking</p>
      <h1>Where is my parcel?</h1>
      <p className="muted">Enter the order number from your confirmation and the mobile number you used at checkout.</p>
      <form className="card-panel form" onSubmit={submit} data-cy="track-form">
        <div className="form-row">
          <label className="field">
            <span>Order number</span>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="PR-XXXXXXXX" required data-cy="track-number" />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX" required data-cy="track-phone" />
          </label>
        </div>
        <button className="btn btn-dark" disabled={busy} data-cy="track-submit">
          {busy ? 'Checking…' : 'Track order'}
        </button>
        {error && (
          <p className="error" data-cy="track-error">
            {error}
          </p>
        )}
      </form>

      {order && (
        <div className="card-panel" data-cy="track-result">
          <div className="row-between">
            <h3>{order.number}</h3>
            <span className={`status status-${order.status}`} data-cy="track-status">
              {order.status}
            </span>
          </div>
          <p className="small muted">
            Placed {new Date(order.createdAt).toLocaleDateString('en-PK', { dateStyle: 'long' })} · Delivering to {order.city} · {rs(order.total)} cash on delivery
          </p>
          <Timeline order={order} />
          <div className="mini-items">
            {order.items.map((i) => (
              <div key={`${i.product}${i.size}`} className="mini-item">
                <ProductImage item={i} size={100} className="thumb" />
                <span>
                  {i.qty} × {i.name} {i.size}ml
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
