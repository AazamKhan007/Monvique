import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

export default function ProductsPage({ user, setCartCount, cartCount, onLoggedOut }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = async (search = "") => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts(search);
      setProducts(data.products || []);
      setError("");
    } catch (err) {
      if (err?.status === 401) {
        onLoggedOut();
        navigate("/login", { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();

    if (user?.role === "user") {
      api.getCart().then((data) => {
        setCartCount(data.cartCount || 0);
        const nextQty = {};
        (data.cartItems || []).forEach((item) => {
          nextQty[item.product._id] = item.quantity;
        });
        setQuantities(nextQty);
      }).catch((err) => {
        if (err?.status === 401) {
          setCartCount(0);
        }
      });
    }
  }, [user, setCartCount, onLoggedOut, navigate]);

  const filtered = useMemo(() => products, [products]);

  const onSearch = (event) => {
    event.preventDefault();
    loadProducts(query);
  };

  const normalizeQty = (value) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const setQty = (id, value) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: normalizeQty(value),
    }));
  };

  const changeQty = (id, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, normalizeQty(prev[id] || 1) + delta),
    }));
  };

  const addToCart = async (id) => {
    try {
      const qty = normalizeQty(quantities[id] || 1);
      const payload = await api.addToCart(id, qty);
      setCartCount(payload.cartCount || 0);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((product) => product._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      onLoggedOut();
      navigate("/login");
    }
  };

  if (user?.role === "admin") {
    return (
      <>
        <header className="site-header">
          <div className="container header-row">
            <Link to="/products" className="brand">Monvique</Link>
            <div className="header-right-block">
              <p className="session-note">Admin: <strong>{user?.name || "-"}</strong></p>
              <button type="button" className="ghost-btn" onClick={logout}>Logout</button>
            </div>
          </div>
        </header>

        <main className="container page-wrap">
          <section className="page-toolbar">
            <h2>Product Management</h2>
            <div className="toolbar-actions">
              <form className="inline-form search-form" onSubmit={onSearch}>
                <input
                  type="search"
                  value={query}
                  placeholder="Search by title, category or brand"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button type="submit">Search</button>
              </form>
              <button type="button" onClick={() => navigate("/products/new")}>Add Product</button>
            </div>
          </section>

          {error && <p className="error-text">{error}</p>}
          {filtered.length === 0 && <p className="empty">No products found.</p>}

          <section className="cards-grid">
            {filtered.map((product) => (
              <article className="product-card admin-card" key={product._id}>
                {product.image ? (
                  <img src={toAssetUrl(product.image)} alt={product.title} className="product-image" />
                ) : (
                  <div className="image-fallback">No Image</div>
                )}
                <div className="card-content">
                  <h3>{product.title}</h3>
                  <p className="meta-line"><span>{product.category}</span><span>{product.brand}</span></p>
                  <p className="price-line">Rs. {product.price}</p>
                  <p className="desc">{product.description || "No description"}</p>
                  <div className="status-line">
                    {Number(product.discount) > 0 && (
                      <span className="discount-badge">{product.discount}% OFF</span>
                    )}
                    <span className="availability">{product.availability}</span>
                  </div>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => navigate(`/products/${product._id}/edit`)}>Edit</button>
                  <button type="button" className="danger-btn" onClick={() => deleteProduct(product._id)}>Delete</button>
                </div>
              </article>
            ))}
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-row">
          <Link to="/products" className="brand">Monvique</Link>
          <form className="inline-form search-form top-search" onSubmit={onSearch}>
            <input
              type="search"
              value={query}
              placeholder="Search products"
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <div className="header-right-block">
            <Link className="cart-link-btn" to="/cart">Cart ({cartCount || 0})</Link>
            <p className="session-note"><strong>{user?.name || "Guest"}</strong></p>
            <button type="button" className="ghost-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="container page-wrap">
        <section className="page-toolbar single-side">
          <h2>Explore Products</h2>
          <p className="subtle-copy">Simple picks for your daily needs.</p>
        </section>

        {error && <p className="error-text">{error}</p>}
        {loadingProducts ? (
          <div className="page-loader">
            <div className="spinner" />
            <p className="subtle-copy">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="empty">No products found.</p>
        ) : null}

        {!loadingProducts && (
          <section className="cards-grid">
            {filtered.map((product) => (
            <article className="product-card user-card" key={product._id}>
              <Link to={`/products/${product._id}`} className="card-visual-link">
                {product.image ? (
                  <img src={toAssetUrl(product.image)} alt={product.title} className="product-image" />
                ) : (
                  <div className="image-fallback">No Image</div>
                )}
              </Link>
              <div className="card-content">
                <Link to={`/products/${product._id}`} className="detail-link-title"><h3>{product.title}</h3></Link>
                <p className="meta-line"><span>{product.category}</span><span>{product.brand}</span></p>
                <p className="price-line">Rs. {product.price}</p>
                {Number(product.discount) > 0 && <p className="discount-inline">{product.discount}% OFF</p>}

                <div className="inline-form card-cart-form">
                  <div className="qty-stepper compact-stepper">
                    <button type="button" className="qty-btn" onClick={() => changeQty(product._id, -1)}>-</button>
                    <input
                      type="number"
                      min="1"
                      className="card-qty-input"
                      value={normalizeQty(quantities[product._id] || 1)}
                      onChange={(event) => setQty(product._id, event.target.value)}
                    />
                    <button type="button" className="qty-btn" onClick={() => changeQty(product._id, 1)}>+</button>
                  </div>
                  <button type="button" className="primary-btn" onClick={() => addToCart(product._id)}>Add to Cart</button>
                </div>
              </div>
            </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
