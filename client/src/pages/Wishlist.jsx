import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Empty, Spinner } from '../components/ui';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Wishlist() {
  const { user, ready, wishlist } = useAuth();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (!user) return;
    api('/auth/wishlist')
      .then((d) => setProducts(d.products))
      .catch(() => setProducts([]));
  }, [user, wishlist.length]);

  if (!ready) return <Spinner />;
  if (!user)
    return (
      <div className="container section">
        <Empty title="Save your favourites" text="Log in to keep a wishlist of perfumes you love.">
          <Link to="/account?next=/wishlist" className="btn btn-dark">
            Log in
          </Link>
        </Empty>
      </div>
    );

  return (
    <div className="container section">
      <p className="eyebrow">Wishlist</p>
      <h1>Saved perfumes</h1>
      {!products ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Empty title="Nothing saved yet" text="Tap the heart on any perfume to save it here.">
          <Link to="/shop" className="btn btn-dark">
            Browse perfumes
          </Link>
        </Empty>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
