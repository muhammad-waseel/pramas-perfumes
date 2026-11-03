import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Empty, Spinner } from '../components/ui';
import { api, CATEGORY_LABELS, FAMILY_LABELS } from '../api';

const PRICES = [
  ['', '', 'Any price'],
  ['', '2999', 'Under Rs 3,000'],
  ['3000', '4999', 'Rs 3,000 – 4,999'],
  ['5000', '', 'Rs 5,000 and above'],
];

const SORTS = [
  ['featured', 'Featured'],
  ['bestselling', 'Best selling'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Top rated'],
];

const TITLES = { bestseller: 'Bestsellers', new: 'New arrivals', sale: 'On sale', featured: 'Featured' };

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const category = params.get('category') || '';
  const family = params.get('family') || '';
  const q = params.get('q') || '';
  const flag = params.get('flag') || '';
  const sort = params.get('sort') || 'featured';
  const min = params.get('min') || '';
  const max = params.get('max') || '';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    setData(null);
    setError('');
    const qs = new URLSearchParams(params);
    qs.set('limit', '12');
    api(`/products?${qs.toString()}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, val]) => (val ? next.set(k, val) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const toggleList = (key, current, value) => {
    const set = new Set(current ? current.split(',') : []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    update({ [key]: [...set].join(',') });
  };

  const title = q
    ? `Results for “${q}”`
    : TITLES[flag] || (category && !category.includes(',') ? CATEGORY_LABELS[category] : 'All perfumes');
  const activeCount = [category, family, min || max, flag].filter(Boolean).length;

  return (
    <div className="container shop">
      <div className="shop-head">
        <div>
          <p className="eyebrow">Shop</p>
          <h1 data-cy="shop-title">{title}</h1>
          {data && <p className="muted" data-cy="result-count">{data.total} {data.total === 1 ? 'perfume' : 'perfumes'}</p>}
        </div>
        <div className="shop-tools">
          <button type="button" className="btn btn-ghost btn-sm filters-btn" onClick={() => setShowFilters((s) => !s)}>
            Filters {activeCount ? `(${activeCount})` : ''}
          </button>
          <label className="select-wrap">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value })} data-cy="sort-select">
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="shop-body">
        <aside className={`filters ${showFilters ? 'open' : ''}`} data-cy="filters">
          <div className="filter-group">
            <h4>Category</h4>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={category.split(',').includes(k)} onChange={() => toggleList('category', category, k)} data-cy={`filter-category-${k}`} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h4>Scent family</h4>
            {Object.entries(FAMILY_LABELS).map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={family.split(',').includes(k)} onChange={() => toggleList('family', family, k)} data-cy={`filter-family-${k}`} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h4>Price</h4>
            {PRICES.map(([lo, hi, label]) => (
              <label key={label} className="check">
                <input type="radio" name="price" checked={min === lo && max === hi} onChange={() => update({ min: lo, max: hi })} data-cy={`filter-price-${lo || 0}-${hi || 'up'}`} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h4>Offers</h4>
            <label className="check">
              <input type="checkbox" checked={flag === 'sale'} onChange={() => update({ flag: flag === 'sale' ? '' : 'sale' })} data-cy="filter-sale" />
              <span>On sale</span>
            </label>
          </div>
          {(activeCount > 0 || q) && (
            <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams(sort !== 'featured' ? { sort } : {}))} data-cy="clear-filters">
              Clear all filters
            </button>
          )}
        </aside>

        <section className="shop-results">
          {error && <p className="error">{error}</p>}
          {!data && !error && <Spinner />}
          {data && data.products.length === 0 && (
            <Empty title="No perfumes match" text="Try removing a filter or searching for a different note.">
              <button type="button" className="btn btn-dark" onClick={() => setParams(new URLSearchParams())}>
                Show all perfumes
              </button>
            </Empty>
          )}
          {data && data.products.length > 0 && (
            <>
              <div className="grid grid-3">
                {data.products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              {data.pages > 1 && (
                <nav className="pager" aria-label="Pages">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" className={n === page ? 'on' : ''} onClick={() => update({ page: String(n) })} data-cy="page-button">
                      {n}
                    </button>
                  ))}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
