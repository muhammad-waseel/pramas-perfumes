const TOKEN_KEY = 'pramas_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong, please try again');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;

export const CATEGORY_LABELS = {
  men: 'For Him',
  women: 'For Her',
  unisex: 'Unisex',
  attar: 'Attars',
  'gift-sets': 'Gift Sets',
};

export const FAMILY_LABELS = {
  oud: 'Oud',
  woody: 'Woody',
  floral: 'Floral',
  fresh: 'Fresh',
  amber: 'Amber',
  musk: 'Musk',
  citrus: 'Citrus',
  spicy: 'Spicy & Leather',
};

export const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Sukkur', 'Mardan', 'Gujrat', 'Sahiwal', 'Okara', 'Other',
];

export const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Kashmir'];
