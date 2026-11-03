import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import ProductImage from './ProductImage';
import { Icon } from './ui';
import { rs } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const NAV = [
  ['/', 'Home'],
  ['/shop', 'Shop All'],
  ['/shop?flag=new', 'New Arrivals'],
  ['/shop?category=men', 'Men'],
  ['/shop?category=women', 'Women'],
  ['/shop?category=unisex', 'Unisex'],
  ['/shop?category=attar', 'Attars'],
  ['/shop?category=gift-sets', 'Gift Sets'],
  ['/shop?flag=sale', 'Sale'],
  ['/track', 'Track Order'],
];

const MESSAGES = [
  'Free delivery on orders above Rs 5,000',
  'Cash on Delivery all over Pakistan',
  'Get 10% off your first order with code WELCOME10',
];

export function Header() {
  const { count, setOpen } = useCart();
  const { user, wishlist } = useAuth();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname + location.search;

  useEffect(() => {
    setMenu(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const t = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
    setQ('');
  };

  return (
    <>
      <div className="announce" aria-live="polite">
        <span key={msg} className="announce-msg">{MESSAGES[msg]}</span>
      </div>
      <header className="header">
        <div className="container header-main">
          <div className="header-left">
            <button type="button" className="icon-btn menu-btn" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu} data-cy="menu-button">
              <Icon name="menu" />
            </button>
            <form className="header-search" onSubmit={submit} role="search">
              <Icon name="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes, notes…" aria-label="Search" data-cy="search-input" />
            </form>
          </div>
          <Logo />
          <div className="header-icons">
            <Link to="/account" className="icon-btn" aria-label="Account" data-cy="account-link">
              <Icon name="user" />
            </Link>
            <Link to="/wishlist" className="icon-btn hide-sm" aria-label="Wishlist">
              <Icon name="heart" />
              {wishlist.length > 0 && <span className="bubble">{wishlist.length}</span>}
            </Link>
            <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Shopping bag" data-cy="cart-button">
              <Icon name="bag" />
              {count > 0 && (
                <span className="bubble" data-cy="cart-count">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          <div className="container nav-inner">
            {NAV.map(([to, label]) => (
              <Link key={to} to={to} className={`${current === to ? 'active' : ''} ${label === 'Sale' ? 'nav-sale' : ''}`}>
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </div>
        </nav>
      </header>
      <Sidebar open={menu} onClose={() => setMenu(false)} q={q} setQ={setQ} submit={submit} current={current} />
    </>
  );
}

function Sidebar({ open, onClose, q, setQ, submit, current }) {
  const { user, logout } = useAuth();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const link = (to, label, extra = '') => (
    <Link key={to + label} to={to} className={`side-link ${current === to ? 'active' : ''} ${extra}`} onClick={onClose}>
      {label}
      <Icon name="arrow" size={14} />
    </Link>
  );

  return (
    <div className={`side-wrap ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="side" role="dialog" aria-label="Menu" data-cy="sidebar">
        <div className="side-head">
          <Logo />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>
        <form
          className="side-search"
          onSubmit={(e) => {
            submit(e);
            onClose();
          }}
          role="search"
        >
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes, notes…" aria-label="Search" />
        </form>
        <nav className="side-body">
          <p className="side-label">Shop</p>
          {NAV.filter(([to]) => to !== '/track').map(([to, label]) => link(to, label, label === 'Sale' ? 'nav-sale' : ''))}
          <p className="side-label">My account</p>
          {link('/account', user ? `My orders (${user.name.split(' ')[0]})` : 'Log in / Create account')}
          {link('/wishlist', 'Wishlist')}
          {link('/track', 'Track your order')}
          {user?.role === 'admin' && link('/admin', 'Admin panel')}
          <p className="side-label">Pramas</p>
          {link('/about', 'Our story')}
          {link('/about', 'Delivery & exchanges')}
          {user && (
            <button
              type="button"
              className="side-link link-plain"
              onClick={() => {
                logout();
                onClose();
              }}
            >
              Log out
            </button>
          )}
        </nav>
        <div className="side-foot">
          <span>
            <Icon name="cash" size={16} /> Cash on Delivery
          </span>
          <span>
            <Icon name="truck" size={16} /> Free delivery over Rs 5,000
          </span>
        </div>
      </aside>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo light />
          <p className="muted-light">Long-lasting eau de parfums and alcohol-free attars, blended for Pakistani weather and delivered to your door.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop?category=men">For Him</Link>
          <Link to="/shop?category=women">For Her</Link>
          <Link to="/shop?category=unisex">Unisex</Link>
          <Link to="/shop?category=attar">Attars</Link>
          <Link to="/shop?category=gift-sets">Gift Sets</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/track">Track your order</Link>
          <Link to="/account">My account</Link>
          <Link to="/about">Delivery &amp; exchanges</Link>
          <Link to="/about">Our story</Link>
        </div>
        <div>
          <h4>We deliver to</h4>
          <p className="muted-light">Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar and 100+ more cities. 2–5 working days.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Pramas Perfumes</span>
        <span className="demo-note" data-cy="demo-note">
          Demo store built as a portfolio project by Muhammad Waseel. Orders are not shipped and no payment is taken. Product photos from Unsplash.
        </span>
      </div>
    </footer>
  );
}

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, subtotal, count } = useCart();
  const navigate = useNavigate();
  const free = 5000;
  const left = Math.max(0, free - subtotal);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  return (
    <div className={`drawer-wrap ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} />
      <aside className="drawer" role="dialog" aria-label="Shopping bag" data-cy="cart-drawer">
        <div className="drawer-head">
          <h3>Your bag ({count})</h3>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close bag">
            <Icon name="close" />
          </button>
        </div>
        {items.length > 0 && (
          <div className="ship-meter">
            <p>{left > 0 ? <>Add <b>{rs(left)}</b> more for free delivery</> : <>You have unlocked <b>free delivery</b></>}</p>
            <div className="meter">
              <span style={{ width: `${Math.min(100, (subtotal / free) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <p>Your bag is empty.</p>
              <button type="button" className="btn btn-dark" onClick={() => { setOpen(false); navigate('/shop'); }}>
                Start shopping
              </button>
            </div>
          ) : (
            items.map((i) => (
              <div className="line" key={i.key} data-cy="cart-line">
                <div className="line-img">
                  <ProductImage item={i} size={160} />
                </div>
                <div className="line-info">
                  <Link to={`/product/${i.slug}`} onClick={() => setOpen(false)} className="line-name">
                    {i.name}
                  </Link>
                  <span className="line-size">{i.size}ml</span>
                  <div className="qty qty-sm">
                    <button type="button" onClick={() => (i.qty === 1 ? remove(i.key) : setQty(i.key, i.qty - 1))} aria-label="Decrease">
                      <Icon name="minus" size={14} />
                    </button>
                    <span data-cy="line-qty">{i.qty}</span>
                    <button type="button" onClick={() => setQty(i.key, i.qty + 1)} disabled={i.qty >= Math.min(10, i.stock)} aria-label="Increase">
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                </div>
                <div className="line-right">
                  <span>{rs(i.price * i.qty)}</span>
                  <button type="button" className="link-btn" onClick={() => remove(i.key)} data-cy="line-remove">
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="row-between">
              <span>Subtotal</span>
              <b data-cy="cart-subtotal">{rs(subtotal)}</b>
            </div>
            <p className="small muted">Delivery and discounts are worked out at checkout.</p>
            <button type="button" className="btn btn-dark btn-block" onClick={() => { setOpen(false); navigate('/checkout'); }} data-cy="checkout-button">
              Checkout · Cash on Delivery
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(false)}>
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className="toast" role="status" data-cy="toast">
      {toast}
    </div>
  );
}

export function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
