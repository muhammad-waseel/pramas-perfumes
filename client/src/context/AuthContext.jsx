import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  const loadWishlist = useCallback(async () => {
    try {
      const { products } = await api('/auth/wishlist');
      setWishlist(products.map((p) => p._id));
    } catch {
      setWishlist([]);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api('/auth/me')
      .then(({ user: u }) => {
        setUser(u);
        loadWishlist();
      })
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, [loadWishlist]);

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(data.token);
    setUser(data.user);
    loadWishlist();
    return data.user;
  };

  const register = async (form) => {
    const data = await api('/auth/register', { method: 'POST', body: form, auth: false });
    setToken(data.token);
    setUser(data.user);
    setWishlist([]);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setWishlist([]);
  };

  const toggleWishlist = async (productId) => {
    const { wishlist: list, added } = await api(`/auth/wishlist/${productId}`, { method: 'POST' });
    setWishlist(list);
    return added;
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, wishlist, toggleWishlist, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
