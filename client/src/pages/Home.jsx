import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { photo } from '../components/ProductImage';
import { Icon, Spinner } from '../components/ui';
import { api } from '../api';

const U = 'https://images.unsplash.com/';

const SLIDES = [
  {
    img: `${U}photo-1733660227168-444e3c751a1e`,
    eyebrow: 'The Winter Edit',
    title: 'Warm. Rich. Unforgettable.',
    text: 'Amber, oud and saffron blends that last from morning to midnight.',
    cta: ['Shop the edit', '/shop?family=amber,oud,spicy'],
  },
  {
    img: `${U}photo-1760920250029-36af9369a0bb`,
    eyebrow: 'Up to 15% off',
    title: 'The Sale Is On',
    text: 'Selected eau de parfums at special prices, while stocks last.',
    cta: ['Shop the sale', '/shop?flag=sale'],
  },
  {
    img: `${U}photo-1617839400561-d55457a29da2`,
    eyebrow: 'Signature',
    title: 'Shahi Oud',
    text: 'Our most loved perfume: smoked agarwood, saffron and Taif rose.',
    cta: ['Discover Shahi Oud', '/product/shahi-oud'],
  },
];

const CATEGORIES = [
  ['Men', '/shop?category=men', `${U}photo-1720423514789-15a33e59fc81`],
  ['Women', '/shop?category=women', `${U}photo-1733660227163-01bc46e0d7d7`],
  ['Unisex', '/shop?category=unisex', `${U}photo-1647507653704-bde7f2d6dbf0`],
  ['Attars', '/shop?category=attar', `${U}photo-1738414808975-201966230c59`],
  ['Gift Sets', '/shop?category=gift-sets', `${U}photo-1622618991746-fe6004db3a47`],
];

function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [i]);
  return (
    <section className="slider" aria-roledescription="carousel" data-cy="hero">
      {SLIDES.map((s, n) => (
        <div key={s.title} className={`slide ${n === i ? 'on' : ''}`} aria-hidden={n !== i}>
          <img
            src={photo(s.img, 1800, 760)}
            srcSet={`${photo(s.img, 1000, 760)} 1000w, ${photo(s.img, 1800, 760)} 1800w, ${photo(s.img, 2600, 1100)} 2600w`}
            sizes="100vw"
            alt=""
            loading={n === 0 ? 'eager' : 'lazy'}
          />
          <div className="slide-shade" />
          <div className="container slide-copy">
            <p className="eyebrow">{s.eyebrow}</p>
            <h1>{s.title}</h1>
            <p>{s.text}</p>
            <Link to={s.cta[1]} className="btn btn-light" data-cy={n === 0 ? 'hero-shop' : undefined} tabIndex={n === i ? 0 : -1}>
              {s.cta[0]}
            </Link>
          </div>
        </div>
      ))}
      <button type="button" className="slide-arrow prev" onClick={() => setI((i + SLIDES.length - 1) % SLIDES.length)} aria-label="Previous slide">
        ‹
      </button>
      <button type="button" className="slide-arrow next" onClick={() => setI((i + 1) % SLIDES.length)} aria-label="Next slide">
        ›
      </button>
      <div className="dots">
        {SLIDES.map((s, n) => (
          <button key={s.title} type="button" className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} />
        ))}
      </div>
    </section>
  );
}

function Row({ title, flag, sort = 'bestselling', link }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api(`/products?flag=${flag}&limit=4&sort=${sort}`)
      .then((d) => setItems(d.products))
      .catch(() => setItems([]));
  }, [flag, sort]);
  return (
    <section className="section container">
      <div className="section-title">
        <h2>{title}</h2>
        <Link to={link} className="link-arrow">
          View all <Icon name="arrow" size={15} />
        </Link>
      </div>
      {!items ? <Spinner /> : <div className="grid">{items.map((p) => <ProductCard key={p._id} product={p} />)}</div>}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />

      <section className="usp-bar">
        <div className="container usp-inner">
          {[
            ['truck', 'Free delivery', 'On orders above Rs 5,000'],
            ['cash', 'Cash on Delivery', 'All over Pakistan'],
            ['refresh', '7-day exchange', 'On unopened bottles'],
            ['drop', 'Long lasting', '8 to 12 hours on skin'],
          ].map(([icon, t, s]) => (
            <div key={t} className="usp">
              <Icon name={icon} size={24} />
              <div>
                <b>{t}</b>
                <span>{s}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-title center">
          <h2>Shop by Category</h2>
        </div>
        <div className="cats">
          {CATEGORIES.map(([label, to, img]) => (
            <Link key={label} to={to} className="cat" data-cy="collection-tile">
              <span className="cat-img">
                <img src={photo(img, 400, 500)} alt="" loading="lazy" />
              </span>
              <span className="cat-label">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Row title="Best Sellers" flag="bestseller" link="/shop?flag=bestseller" />

      <section className="section container">
        <div className="split-banners">
          <Link to="/shop?category=attar" className="split">
            <img src={photo(`${U}photo-1608571423539-e951b9b3871e`, 900, 620)} alt="" loading="lazy" />
            <div className="split-copy">
              <p className="eyebrow">Alcohol-free</p>
              <h3>Pure Attars</h3>
              <span className="btn btn-light btn-sm">Shop attars</span>
            </div>
          </Link>
          <Link to="/product/discovery-set" className="split">
            <img src={photo(`${U}photo-1671493229048-4dddd00ca84a`, 900, 620)} alt="" loading="lazy" />
            <div className="split-copy">
              <p className="eyebrow">Can&apos;t decide?</p>
              <h3>Discovery Set</h3>
              <span className="btn btn-light btn-sm">Try five scents</span>
            </div>
          </Link>
        </div>
      </section>

      <Row title="New Arrivals" flag="new" sort="newest" link="/shop?flag=new" />

      <section className="section container">
        <div className="promo">
          <div>
            <p className="eyebrow">Welcome offer</p>
            <h2>10% off your first order</h2>
            <p>
              Use code <b>WELCOME10</b> at checkout, or <b>PRAMAS500</b> for Rs 500 off orders above Rs 4,000.
            </p>
          </div>
          <Link to="/shop" className="btn btn-dark">
            Shop now
          </Link>
        </div>
      </section>

      <Row title="On Sale" flag="sale" link="/shop?flag=sale" />

      <section className="story-band">
        <div className="container story-grid">
          <img src={photo(`${U}photo-1705899853374-d91c048b81d2`, 900, 700)} alt="" loading="lazy" />
          <div>
            <p className="eyebrow">Our story</p>
            <h2>Made for Pakistani weather</h2>
            <p>
              Most perfumes fade by lunchtime in a Lahore June. Ours are blended at higher oil concentrations and rested for six weeks, so
              they bloom in the heat instead of burning off.
            </p>
            <Link to="/about" className="btn btn-outline">
              Read more
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
