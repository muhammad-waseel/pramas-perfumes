import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import ProductCard from '../components/ProductCard';
import { Empty, Icon, Price, Spinner, Stars } from '../components/ui';
import { api, CATEGORY_LABELS, FAMILY_LABELS } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function Reviews({ product, onUpdate }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const data = await api(`/products/${product._id}/reviews`, { method: 'POST', body: { rating, comment } });
      onUpdate(data);
      setComment('');
      setMsg('Thank you, your review is live.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="reviews" id="reviews">
      <div className="section-head">
        <div>
          <p className="eyebrow">Reviews</p>
          <h2>
            {product.numReviews ? (
              <>
                {product.rating.toFixed(1)} <Stars value={product.rating} size={18} />{' '}
                <span className="muted small">from {product.numReviews} {product.numReviews === 1 ? 'review' : 'reviews'}</span>
              </>
            ) : (
              'No reviews yet'
            )}
          </h2>
        </div>
      </div>
      <div className="reviews-grid">
        <div>
          {product.reviews.length === 0 && <p className="muted">Bought this perfume? Be the first to share how it wears.</p>}
          {[...product.reviews].reverse().map((r) => (
            <div className="review" key={r._id} data-cy="review">
              <Stars value={r.rating} size={13} />
              <p>{r.comment || <i className="muted">No comment</i>}</p>
              <span className="small muted">
                {r.name} · verified buyer · {new Date(r.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
        <div className="card-panel">
          {user ? (
            <form onSubmit={submit} className="form" data-cy="review-form">
              <h4>Write a review</h4>
              <div className="rating-pick" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                    ★
                  </button>
                ))}
              </div>
              <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How long did it last? Where did you wear it?" maxLength={600} />
              <button className="btn btn-dark" disabled={busy}>
                {busy ? 'Posting…' : 'Post review'}
              </button>
              {msg && <p className="small">{msg}</p>}
              <p className="small muted">Only customers who ordered this perfume can review it.</p>
            </form>
          ) : (
            <p>
              <Link to="/account">Log in</Link> to review perfumes you have ordered.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Product() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('notes');
  const { add, setToast } = useCart();
  const { user, wishlist, toggleWishlist } = useAuth();

  useEffect(() => {
    setData(null);
    setError('');
    setQty(1);
    api(`/products/${slug}`)
      .then((d) => {
        setData(d);
        const first = d.product.variants.find((v) => v.stock > 0) || d.product.variants[0];
        setVariantId(first._id);
        document.title = `${d.product.name} | Pramas Perfumes`;
      })
      .catch((e) => setError(e.status === 404 ? 'notfound' : e.message));
  }, [slug]);

  if (error === 'notfound')
    return (
      <div className="container section">
        <Empty title="Perfume not found" text="It may have been discontinued.">
          <Link to="/shop" className="btn btn-dark">
            Browse all perfumes
          </Link>
        </Empty>
      </div>
    );
  if (error) return <p className="container section error">{error}</p>;
  if (!data) return <Spinner />;

  const { product, related } = data;
  const variant = product.variants.find((v) => v._id === variantId) || product.variants[0];
  const saved = wishlist.includes(product._id);
  const low = variant.stock > 0 && variant.stock <= 5;

  const onHeart = async () => {
    if (!user) return setToast('Log in to save perfumes to your wishlist');
    const added = await toggleWishlist(product._id);
    return setToast(added ? 'Saved to your wishlist' : 'Removed from your wishlist');
  };

  return (
    <>
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <Link to={`/shop?category=${product.category}`}>{CATEGORY_LABELS[product.category]}</Link> / <span>{product.name}</span>
        </nav>
        <div className="pdp">
          <div className="pdp-media">
            <div className="pdp-stage">
              <ProductImage item={product} size={900} eager />
              {variant.compareAt && <span className="badge badge-sale pdp-badge">-{Math.round((1 - variant.price / variant.compareAt) * 100)}%</span>}
            </div>
          </div>
          <div className="pdp-info">
            <p className="eyebrow">
              {FAMILY_LABELS[product.family]} · {CATEGORY_LABELS[product.category]}
            </p>
            <h1 data-cy="product-name">{product.name}</h1>
            <p className="pdp-tagline">{product.tagline}</p>
            {product.numReviews > 0 && (
              <a href="#reviews" className="pdp-rating">
                <Stars value={product.rating} count={product.numReviews} />
              </a>
            )}
            <Price price={variant.price} compareAt={variant.compareAt} className="pdp-price" />
            {variant.compareAt && <span className="save">Save {Math.round((1 - variant.price / variant.compareAt) * 100)}%</span>}

            <div className="pdp-block">
              <span className="label">Size</span>
              <div className="sizes">
                {product.variants.map((v) => (
                  <button
                    type="button"
                    key={v._id}
                    className={`size ${v._id === variant._id ? 'on' : ''}`}
                    onClick={() => {
                      setVariantId(v._id);
                      setQty(1);
                    }}
                    disabled={v.stock === 0}
                    data-cy="size-option"
                  >
                    <b>{v.size}ml</b>
                    <span>{v.stock === 0 ? 'Sold out' : `Rs ${v.price.toLocaleString('en-PK')}`}</span>
                  </button>
                ))}
              </div>
              {low && <p className="low" data-cy="low-stock">Only {variant.stock} left in this size</p>}
            </div>

            <div className="pdp-buy">
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                  <Icon name="minus" size={16} />
                </button>
                <span data-cy="qty">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(10, variant.stock, q + 1))} aria-label="Increase quantity" data-cy="qty-plus">
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <button type="button" className="btn btn-dark btn-grow" disabled={variant.stock === 0} onClick={() => add(product, variant, qty)} data-cy="add-to-cart">
                {variant.stock === 0 ? 'Sold out' : 'Add to bag'}
              </button>
              <button type="button" className={`btn-square ${saved ? 'on' : ''}`} onClick={onHeart} aria-label="Save to wishlist" data-cy="pdp-wishlist">
                <Icon name="heart" />
              </button>
            </div>

            <ul className="pdp-perks">
              <li>
                <Icon name="cash" size={18} /> Cash on Delivery available
              </li>
              <li>
                <Icon name="truck" size={18} /> Delivered in 2–5 working days
              </li>
              <li>
                <Icon name="drop" size={18} /> Lasts {product.longevity} · {product.concentration}
              </li>
            </ul>

            <div className="tabs" role="tablist">
              {[
                ['notes', 'Fragrance notes'],
                ['about', 'Description'],
                ['delivery', 'Delivery & exchange'],
              ].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="tab-body" data-cy="tab-body">
              {tab === 'notes' && (
                <div className="pyramid">
                  {[
                    ['Top', product.notes.top, 'The first 15 minutes'],
                    ['Heart', product.notes.heart, 'From 30 minutes to 3 hours'],
                    ['Base', product.notes.base, 'What stays on your skin all day'],
                  ].map(([label, notes, hint]) => (
                    <div key={label} className="tier">
                      <span className="tier-label">{label}</span>
                      <div>
                        <b>{notes.join(', ')}</b>
                        <span className="small muted">{hint}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'about' && <p>{product.description}</p>}
              {tab === 'delivery' && (
                <p>
                  Free delivery on orders above Rs 5,000, otherwise Rs 250 anywhere in Pakistan. Pay in cash when your parcel arrives. Unopened
                  bottles can be exchanged within 7 days of delivery.
                </p>
              )}
            </div>
          </div>
        </div>

        <Reviews product={product} onUpdate={(r) => setData((d) => ({ ...d, product: { ...d.product, ...r } }))} />
      </div>

      {related.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <div>
              <p className="eyebrow">You may also like</p>
              <h2>Similar scents</h2>
            </div>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
