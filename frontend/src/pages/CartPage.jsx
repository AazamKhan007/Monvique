import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

export default function CartPage({ setCartCount }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ cartItems: [], totalItems: 0, totalAmount: 0, cartCount: 0 });
  const [error, setError] = useState("");

  const loadCart = async () => {
    try {
      const payload = await api.getCart();
      setData(payload);
      setCartCount(payload.cartCount || 0);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const changeQuantity = async (productId, action) => {
    try {
      const updated = await api.updateCartQty(productId, action);
      setData((prev) => ({
        ...prev,
        cartItems: prev.cartItems.map((item) =>
          item.product._id === productId ? { ...item, quantity: updated.quantity } : item
        ),
        totalItems: updated.totalItems,
        totalAmount: updated.totalAmount,
        cartCount: updated.cartCount,
      }));
      setCartCount(updated.cartCount);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeItem = async (productId) => {
    try {
      await api.removeCartItem(productId);
      loadCart();
    } catch (err) {
      setError(err.message);
    }
  };

  const checkout = async () => {
    try {
      const payload = await api.checkoutCart();
      setCartCount(0);
      navigate("/checkout-success", { state: payload });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="container page-wrap">
      <section className="page-toolbar single-side">
        <h2>Your Cart</h2>
        <p className="subtle-copy">Review quantity and checkout.</p>
      </section>

      {error && <p className="error-text">{error}</p>}

      {!data.cartItems.length ? (
        <div className="empty-cart"><h3>Cart is empty</h3><p>Add products from home page.</p></div>
      ) : (
        <section className="cart-layout">
          <div className="cart-items-block">
            {data.cartItems.map((item) => (
              <article className="cart-item" key={item.product._id}>
                {item.product.image ? (
                  <img src={toAssetUrl(item.product.image)} alt={item.product.title} />
                ) : (
                  <div className="image-fallback cart-fallback">No Image</div>
                )}
                <div className="cart-item-info">
                  <h3>{item.product.title}</h3>
                  <p>{item.product.category} | {item.product.brand}</p>
                  <p className="price-line">Rs. {item.product.price}</p>
                </div>
                <div className="cart-item-actions">
                  <div className="qty-stepper-form">
                    <span className="qty-label">Qty</span>
                    <div className="qty-stepper">
                      <button type="button" className="qty-btn" onClick={() => changeQuantity(item.product._id, "decrement")}>-</button>
                      <span className="qty-view">{item.quantity}</span>
                      <button type="button" className="qty-btn" onClick={() => changeQuantity(item.product._id, "increment")}>+</button>
                    </div>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => removeItem(item.product._id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <div className="summary-row"><span>Total quantity</span><strong>{data.totalItems}</strong></div>
            <div className="summary-row total-row"><span>Payable amount</span><strong>Rs. {data.totalAmount}</strong></div>
            <button type="button" className="primary-btn full-btn" onClick={checkout}>Checkout</button>
          </aside>
        </section>
      )}
    </main>
  );
}
