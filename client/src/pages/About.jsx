import { Link } from 'react-router-dom';
import ProductImage, { photo } from '../components/ProductImage';

export default function About() {
  return (
    <div className="container section about">
      <div className="about-hero">
        <div>
          <p className="eyebrow">Our story</p>
          <h1>Perfume, the way it is worn here.</h1>
          <p className="lead-dark">
            Pramas began with a simple frustration: beautiful perfumes that vanished within an hour in Karachi humidity. So we blend for
            our climate, with richer oils, longer maceration and notes that bloom in the heat instead of burning off.
          </p>
        </div>
        <img className="about-img" src={photo('https://images.unsplash.com/photo-1705899844877-81bb0a0665c1', 700, 800)} alt="" />
      </div>

      <div className="about-grid">
        <div className="card-panel">
          <h3>Delivery</h3>
          <p>We deliver to every city in Pakistan in 2–5 working days. Delivery is free on orders above Rs 5,000, otherwise Rs 250.</p>
        </div>
        <div className="card-panel">
          <h3>Cash on Delivery</h3>
          <p>Pay the rider in cash when your parcel arrives. We call to confirm every order before it is dispatched.</p>
        </div>
        <div className="card-panel">
          <h3>Exchanges</h3>
          <p>Unopened bottles can be exchanged within 7 days of delivery. Contact us with your order number to arrange it.</p>
        </div>
        <div className="card-panel">
          <h3>Attars</h3>
          <p>Our attars are alcohol-free perfume oils, suitable for daily and prayer wear. Apply a little to the wrists and neck.</p>
        </div>
      </div>

      <div className="card-panel demo-box">
        <h3>About this website</h3>
        <p>
          Pramas Perfumes is a demo store built by Muhammad Waseel as a full-stack portfolio project (React, Node.js, Express, MongoDB). It
          works end to end: catalogue, cart, coupons, cash-on-delivery checkout, accounts, order tracking and an admin panel. Orders placed
          here are not shipped and no payment is taken.
        </p>
        <Link to="/shop" className="btn btn-dark">
          Explore the store
        </Link>
      </div>
    </div>
  );
}
