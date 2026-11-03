import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { Empty, Icon } from '../components/ui';
import { api, CITIES, PROVINCES, rs } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const PHONE_RX = /^(\+92|0)3\d{9}$/;

export default function Checkout() {
  const { items, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', notes: '' });
  const [giftWrap, setGiftWrap] = useState(false);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [quote, setQuote] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || '' }));
  }, [user]);

  const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
  const linesKey = JSON.stringify(lines);

  useEffect(() => {
    if (!items.length) return;
    api('/orders/quote', { method: 'POST', body: { items: lines, coupon, giftWrap } })
      .then((q) => {
        setQuote(q);
        setError('');
      })
      .catch((e) => {
        if (coupon) {
          setCoupon('');
          setCouponMsg(e.message);
        } else setError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, coupon, giftWrap]);

  if (!items.length)
    return (
      <div className="container section">
        <Empty title="Your bag is empty" text="Add a perfume to check out.">
          <Link to="/shop" className="btn btn-dark">
            Shop perfumes
          </Link>
        </Empty>
      </div>
    );

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const applyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const q = await api('/orders/quote', { method: 'POST', body: { items: lines, coupon: code, giftWrap } });
      setCoupon(q.coupon);
      setQuote(q);
      setCouponMsg(`${q.coupon} applied: ${q.couponLabel}`);
    } catch (err) {
      setCouponMsg(err.message);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Please enter a valid email';
    if (!PHONE_RX.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a mobile number like 03001234567';
    if (form.address.trim().length < 8) e.address = 'Please enter your full address';
    if (!form.city) e.city = 'Please choose your city';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError('');
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        body: {
          items: lines,
          coupon,
          giftWrap,
          customer: { name: form.name, email: form.email, phone: form.phone },
          shipping: { address: form.address, city: form.city, province: form.province, postalCode: form.postalCode, notes: form.notes },
        },
      });
      clear();
      navigate(`/order/${order.number}`, { state: { order } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const field = (k, label, props = {}) => (
    <label className={`field ${errors[k] ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input value={form[k]} onChange={set(k)} data-cy={`checkout-${k}`} {...props} />
      {errors[k] && <em className="field-error">{errors[k]}</em>}
    </label>
  );

  return (
    <div className="container checkout">
      <h1>Checkout</h1>
      <form className="checkout-grid" onSubmit={placeOrder} noValidate>
        <div>
          <section className="card-panel">
            <h3>Contact</h3>
            {!user && (
              <p className="small muted">
                Have an account? <Link to="/account?next=/checkout">Log in</Link> to track orders easily. You can also check out as a guest.
              </p>
            )}
            <div className="form-row">
              {field('name', 'Full name', { autoComplete: 'name' })}
              {field('phone', 'Mobile number', { placeholder: '03XX XXXXXXX', autoComplete: 'tel', inputMode: 'tel' })}
            </div>
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          </section>

          <section className="card-panel">
            <h3>Delivery address</h3>
            {field('address', 'House, street and area', { autoComplete: 'street-address', placeholder: 'House 12, Street 4, DHA Phase 5' })}
            <div className="form-row">
              <label className={`field ${errors.city ? 'has-error' : ''}`}>
                <span>City</span>
                <select value={form.city} onChange={set('city')} data-cy="checkout-city">
                  <option value="">Choose city</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {errors.city && <em className="field-error">{errors.city}</em>}
              </label>
              <label className="field">
                <span>Province</span>
                <select value={form.province} onChange={set('province')}>
                  <option value="">Choose province</option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              {field('postalCode', 'Postal code (optional)', { inputMode: 'numeric' })}
              {field('notes', 'Delivery notes (optional)', { placeholder: 'Near the mosque, call before coming' })}
            </div>
          </section>

          <section className="card-panel">
            <h3>Payment</h3>
            <label className="pay-option on">
              <input type="radio" checked readOnly />
              <div>
                <b>Cash on Delivery</b>
                <span className="small muted">Pay in cash when the rider delivers your parcel.</span>
              </div>
              <Icon name="cash" />
            </label>
            <label className="check gift">
              <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} data-cy="gift-wrap" />
              <span>Gift wrap with a handwritten card (+ Rs 300)</span>
            </label>
          </section>
        </div>

        <aside className="summary card-panel" data-cy="order-summary">
          <h3>Order summary</h3>
          {items.map((i) => (
            <div className="sum-line" key={i.key}>
              <div className="sum-img">
                <ProductImage item={i} size={120} />
                <span className="bubble">{i.qty}</span>
              </div>
              <div className="grow">
                <b>{i.name}</b>
                <span className="small muted">{i.size}ml</span>
              </div>
              <span>{rs(i.price * i.qty)}</span>
            </div>
          ))}

          <div className="coupon">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code" data-cy="coupon-input" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={applyCode} data-cy="coupon-apply">
              Apply
            </button>
          </div>
          {couponMsg && (
            <p className={`small ${coupon ? 'ok' : 'error'}`} data-cy="coupon-msg">
              {couponMsg}{' '}
              {coupon && (
                <button type="button" className="link-btn" onClick={() => { setCoupon(''); setCouponMsg(''); setCode(''); }}>
                  Remove
                </button>
              )}
            </p>
          )}

          {quote && (
            <div className="totals">
              <div className="row-between">
                <span>Subtotal</span>
                <span>{rs(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="row-between ok">
                  <span>Discount ({quote.coupon})</span>
                  <span data-cy="discount">− {rs(quote.discount)}</span>
                </div>
              )}
              <div className="row-between">
                <span>Delivery</span>
                <span data-cy="shipping">{quote.shippingFee ? rs(quote.shippingFee) : 'Free'}</span>
              </div>
              {quote.giftWrapFee > 0 && (
                <div className="row-between">
                  <span>Gift wrap</span>
                  <span>{rs(quote.giftWrapFee)}</span>
                </div>
              )}
              <div className="row-between total">
                <span>Total</span>
                <b data-cy="total">{rs(quote.total)}</b>
              </div>
            </div>
          )}
          {error && (
            <p className="error" data-cy="checkout-error">
              {error}
            </p>
          )}
          <button className="btn btn-dark btn-block" disabled={busy || !quote} data-cy="place-order">
            {busy ? 'Placing order…' : `Place order${quote ? ` · ${rs(quote.total)}` : ''}`}
          </button>
          <p className="small muted center">This is a demo store: no real order will be shipped.</p>
        </aside>
      </form>
    </div>
  );
}
