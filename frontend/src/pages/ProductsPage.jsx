import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

export default function ProductsPage({ user, setCartCount, cartCount, onLoggedOut }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDiscount, setSelectedDiscount] = useState("all");
  const [minPriceLimit, setMinPriceLimit] = useState(0);
  const [maxPriceLimit, setMaxPriceLimit] = useState(0);
  const [selectedMinPrice, setSelectedMinPrice] = useState(0);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [addingByProduct, setAddingByProduct] = useState({});
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const loadProducts = async (search = "") => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts(search);
      setProducts(data.products || []);
      setError("");
    } catch (err) {
      if (err?.status === 401) {
        setError("Session refresh issue. Please wait and try again.");
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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const prices = products
      .map((product) => Number(product.price || 0))
      .filter((price) => Number.isFinite(price));
    const nextMinPrice = prices.length ? Math.min(...prices) : 0;
    const nextMaxPrice = prices.length ? Math.max(...prices) : 0;

    setMinPriceLimit(nextMinPrice);
    setMaxPriceLimit(nextMaxPrice);
    setSelectedMinPrice(nextMinPrice);
    setSelectedMaxPrice(nextMaxPrice);
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      if (product.category) {
        set.add(product.category);
      }
    });
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    const discountLimit = selectedDiscount === "all" ? null : Number(selectedDiscount);

    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const price = Number(product.price || 0);
      const discount = Number(product.discount || 0);
      const matchesPrice = price >= selectedMinPrice && price <= selectedMaxPrice;
      const matchesDiscount = discountLimit === null ? true : discount <= discountLimit;
      return matchesCategory && matchesPrice && matchesDiscount;
    });
  }, [products, selectedCategory, selectedMinPrice, selectedMaxPrice, selectedDiscount]);

  const onSearch = (event) => {
    event.preventDefault();
    loadProducts(query);
  };

  const priceSpan = Math.max(1, maxPriceLimit - minPriceLimit);
  const minThumbPercent = ((selectedMinPrice - minPriceLimit) / priceSpan) * 100;
  const maxThumbPercent = ((selectedMaxPrice - minPriceLimit) / priceSpan) * 100;

  const onMinRangeChange = (value) => {
    const nextValue = Number.parseInt(String(value), 10);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    setSelectedMinPrice(Math.min(nextValue, selectedMaxPrice));
  };

  const onMaxRangeChange = (value) => {
    const nextValue = Number.parseInt(String(value), 10);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    setSelectedMaxPrice(Math.max(nextValue, selectedMinPrice));
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedDiscount("all");
    setSelectedMinPrice(minPriceLimit);
    setSelectedMaxPrice(maxPriceLimit);
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
    if (addingByProduct[id]) {
      return;
    }

    setAddingByProduct((prev) => ({ ...prev, [id]: true }));
    try {
      const qty = normalizeQty(quantities[id] || 1);
      const payload = await api.addToCart(id, qty);
      setCartCount(payload.cartCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingByProduct((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
      setMenuOpen(false);
      onLoggedOut();
      navigate("/login");
    }
  };

  const openHistory = () => {
    setMenuOpen(false);
    navigate("/history");
  };

  const initials = (user?.name || "U").trim().charAt(0).toUpperCase() || "U";

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
          <div className="header-center-controls">
            <form className="inline-form search-form top-search" onSubmit={onSearch}>
              <input
                type="search"
                value={query}
                placeholder="Search products"
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            <select
              className="category-filter-select"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="header-right-block">
            <Link className="cart-link-btn" to="/cart">Cart ({cartCount || 0})</Link>
            <div className="avatar-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="avatar-menu" role="menu">
                  <button type="button" className="avatar-menu-item" onClick={openHistory}>Order History</button>
                  <button type="button" className="avatar-menu-item danger" onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container page-wrap">
        <section className="page-toolbar single-side">
          <h2>Explore Products</h2>
          <p className="subtle-copy">Simple picks for your daily needs.</p>
        </section>

        <section className="products-layout">
          <aside className="filters-panel">
            <h3>Filter Products</h3>
            <div className="filter-block">
              <p className="filter-label">Price Range</p>
              <div className="range-slider" aria-label="Price range slider">
                <div className="range-track" />
                <div
                  className="range-highlight"
                  style={{
                    left: `${minThumbPercent}%`,
                    width: `${Math.max(0, maxThumbPercent - minThumbPercent)}%`,
                  }}
                />
                <input
                  type="range"
                  className="range-input range-input-min"
                  min={minPriceLimit}
                  max={maxPriceLimit}
                  step="1"
                  value={selectedMinPrice}
                  onChange={(event) => onMinRangeChange(event.target.value)}
                  disabled={maxPriceLimit <= minPriceLimit}
                  aria-label="Minimum price"
                />
                <input
                  type="range"
                  className="range-input range-input-max"
                  min={minPriceLimit}
                  max={maxPriceLimit}
                  step="1"
                  value={selectedMaxPrice}
                  onChange={(event) => onMaxRangeChange(event.target.value)}
                  disabled={maxPriceLimit <= minPriceLimit}
                  aria-label="Maximum price"
                />
              </div>
              {/* <div className="range-values">
                <span>Min: Rs. {selectedMinPrice}</span>
                <span>Max: Rs. {selectedMaxPrice}</span>
              </div> */}
              <p className="filter-value"> Rs. {selectedMinPrice} - Rs. {selectedMaxPrice}</p>
            </div>

            <div className="filter-block">
              <p className="filter-label">Discount</p>
              <select
                value={selectedDiscount}
                onChange={(event) => setSelectedDiscount(event.target.value)}
              >
                <option value="all">All Discounts</option>
                <option value="5">Up to 5%</option>
                <option value="10">Up to 10%</option>
                <option value="15">Up to 15%</option>
                <option value="20">Up to 20%</option>
                <option value="25">Up to 25%</option>
              </select>
            </div>

            <button type="button" className="ghost-btn" onClick={resetFilters}>Reset Filters</button>
          </aside>

          <div>
            {error && <p className="error-text">{error}</p>}
            {loadingProducts ? (
              <div className="page-loader">
                <div className="spinner" />
                <p className="subtle-copy">Loading products...</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="empty">No products found for selected filters.</p>
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
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={Boolean(addingByProduct[product._id])}
                        onClick={() => addToCart(product._id)}
                      >
                        {addingByProduct[product._id] ? "Adding..." : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </article>
                ))}
              </section>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
