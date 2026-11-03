import { useState } from 'react';
import Bottle from './Bottle';

// Product photos are served from Unsplash's image CDN, which crops and resizes on the fly.
export const photo = (url, w = 800, h = w) => (url ? `${url}?auto=format&fit=crop&w=${w}&h=${h}&q=80` : '');

export default function ProductImage({ item, size = 600, className = '', alt, eager = false }) {
  const [failed, setFailed] = useState(false);
  if (!item?.image || failed) {
    return (
      <div className={`pimg pimg-fallback ${className}`}>
        <Bottle look={item?.look} name={item?.name} size={Math.min(size * 0.55, 260)} />
      </div>
    );
  }
  return (
    <img
      className={`pimg ${className}`}
      src={photo(item.image, size, size)}
      srcSet={`${photo(item.image, size, size)} 1x, ${photo(item.image, size * 2, size * 2)} 2x`}
      alt={alt || `${item.name} perfume`}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
    />
  );
}
