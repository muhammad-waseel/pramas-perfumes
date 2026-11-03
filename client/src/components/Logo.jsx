import { Link } from 'react-router-dom';

// Pramas wordmark: Cinzel capitals with a fine rule and "PERFUMES" set wide underneath.
export default function Logo({ light = false, className = '' }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''} ${className}`} aria-label="Pramas Perfumes home">
      <span className="brand-word">PRAMAS</span>
      <span className="brand-rule" aria-hidden="true">
        <i />
        <span>PERFUMES</span>
        <i />
      </span>
    </Link>
  );
}
