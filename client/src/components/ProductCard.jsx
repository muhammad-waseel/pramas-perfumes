import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';
import { Icon, Price, Stars } from './ui';
import { CATEGORY_LABELS } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { user, wishlist, toggleWishlist } = useAuth();
  const { add, setToast } = useCart();
  const sorted = [...product.variants].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const variant = sorted.find((v) => v.stock > 0) || cheapest;
  const saved = wishlist.includes(product._id);
  const off = cheapest.compareAt ? Math.round((1 - cheapest.price / cheapest.compareAt) * 100) : 0;

  const onHeart = async (e) => {
    e.preventDefault();
    if (!user) {
      setToast('Log in to save perfumes to your wishlist');
      return;
    }
    const added = await toggleWishlist(product._id);
    setToast(added ? `${product.name} saved to your wishlist` : `${product.name} removed from your wishlist`);
  };

  return (
    <article className="card" data-cy="product-card">
      <Link to={`/product/${product.slug}`} className="card-media" aria-label={product.name}>
        <ProductImage item={product} size={500} />
        <div className="card-badges">
          {off > 0 && <span className="badge badge-sale">-{off}%</span>}
          {product.newArrival && <span className="badge badge-dark">New</span>}
          {!product.inStock && <span className="badge badge-muted">Sold out</span>}
        </div>
        <button type="button" className={`card-heart ${saved ? 'on' : ''}`} onClick={onHeart} aria-label="Save to wishlist" data-cy="wishlist-toggle">
          <Icon name="heart" size={17} />
        </button>
      </Link>
      <div className="card-body">
        <p className="card-meta">
          {CATEGORY_LABELS[product.category]} · {product.concentration}
        </p>
        <h3 className="card-title">
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.numReviews > 0 && <Stars value={product.rating} count={product.numReviews} size={12} />}
        <div className="card-price">
          {product.variants.length > 1 && <span className="from">From</span>}
          <Price price={cheapest.price} compareAt={cheapest.compareAt} />
        </div>
        <button
          type="button"
          className="btn btn-dark btn-block btn-cart"
          disabled={!product.inStock}
          onClick={() => {
            add(product, variant, 1);
          }}
          aria-label={`Add ${product.name} ${variant.size}ml to cart`}
          data-cy="quick-add"
        >
          {product.inStock ? 'Add to cart' : 'Sold out'}
        </button>
      </div>
    </article>
  );
}
