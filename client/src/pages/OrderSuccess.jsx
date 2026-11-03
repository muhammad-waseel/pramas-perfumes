import { Link, useLocation, useParams } from 'react-router-dom';
import { Icon } from '../components/ui';
import { rs } from '../api';

export default function OrderSuccess() {
  const { number } = useParams();
  const order = useLocation().state?.order;

  return (
    <div className="container section success" data-cy="order-success">
      <div className="success-icon">
        <Icon name="check" size={34} />
      </div>
      <p className="eyebrow">Order placed</p>
      <h1>Shukriya{order ? `, ${order.customer.name.split(' ')[0]}` : ''}!</h1>
      <p className="lead-dark">
        Your order number is{' '}
        <b className="order-no" data-cy="order-number">
          {number}
        </b>
      </p>
      {order && (
        <div className="card-panel success-card">
          <div className="row-between">
            <span>Items</span>
            <span>{order.items.reduce((s, i) => s + i.qty, 0)}</span>
          </div>
          <div className="row-between">
            <span>Deliver to</span>
            <span>{order.shipping.city}</span>
          </div>
          <div className="row-between">
            <span>Payment</span>
            <span>Cash on Delivery</span>
          </div>
          <div className="row-between total">
            <span>Amount to pay on delivery</span>
            <b data-cy="success-total">{rs(order.total)}</b>
          </div>
        </div>
      )}
      <p className="muted">
        We will call {order ? order.customer.phone : 'you'} to confirm before dispatch. Keep your order number to track the parcel.
      </p>
      <div className="hero-ctas center">
        <Link to={`/track?number=${number}`} className="btn btn-dark">
          Track this order
        </Link>
        <Link to="/shop" className="btn btn-ghost">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
