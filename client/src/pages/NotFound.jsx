import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container section">
      <Empty title="Page not found" text="The page you are looking for has evaporated.">
        <Link to="/" className="btn btn-dark">
          Back to home
        </Link>
      </Empty>
    </div>
  );
}
