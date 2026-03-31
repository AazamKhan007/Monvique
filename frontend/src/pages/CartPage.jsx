import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

async function ensureRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CartPage({ setCartCount }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ cartItems: [], totalItems: 0, totalAmount: 0, cartCount: 0 });
  const [error, setError] = useState("");
  const [pendingByProduct, setPendingByProduct] = useState({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
    if (pendingByProduct[productId]) {
      return;
    }

    const targetItem = data.cartItems.find((item) => item.product._id === productId);
    if (!targetItem) {
      return;
    }

    const nextQuantity = action === "decrement"
      ? Math.max(1, targetItem.quantity - 1)
      : targetItem.quantity + 1;
    const quantityDelta = nextQuantity - targetItem.quantity;
    const linePriceDelta = quantityDelta * Number(targetItem.product.price || 0);

    setPendingByProduct((prev) => ({ ...prev, [productId]: true }));

    const previousState = data;
    setData((prev) => ({
      ...prev,
      cartItems: prev.cartItems.map((item) =>
        item.product._id === productId ? { ...item, quantity: nextQuantity } : item
      ),
      totalItems: Math.max(0, prev.totalItems + quantityDelta),
      totalAmount: Math.max(0, prev.totalAmount + linePriceDelta),
    }));

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
      setData(previousState);
    } finally {
      setPendingByProduct((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
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
    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      const scriptReady = await ensureRazorpayScript();
      if (!scriptReady) {
        throw new Error("Razorpay SDK failed to load");
      }

      const orderPayload = await api.createCheckoutOrder();
      const options = {
        key: orderPayload.keyId,
        amount: orderPayload.amount,
        currency: orderPayload.currency,
        name: "Monvique",
        description: `Cart checkout (${orderPayload.itemCount} item${orderPayload.itemCount > 1 ? "s" : ""})`,
        order_id: orderPayload.orderId,
        handler: async (response) => {
          try {
            const verified = await api.verifyCheckoutPayment(response);
            setCartCount(0);
            navigate("/checkout-success", { state: verified });
          } catch (verifyError) {
            setError(verifyError.message || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
          },
        },
        prefill: {},
        theme: {
          color: "#111827",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (event) => {
        const reason = event?.error?.description || "Payment failed";
        setError(reason);
        setCheckoutLoading(false);
      });
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setCheckoutLoading(false);
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
                      <button
                        type="button"
                        className="qty-btn"
                        disabled={Boolean(pendingByProduct[item.product._id])}
                        onClick={() => changeQuantity(item.product._id, "decrement")}
                      >
                        -
                      </button>
                      <span className="qty-view">{item.quantity}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        disabled={Boolean(pendingByProduct[item.product._id])}
                        onClick={() => changeQuantity(item.product._id, "increment")}
                      >
                        +
                      </button>
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
            <button type="button" className="primary-btn full-btn" onClick={checkout} disabled={checkoutLoading}>
              {checkoutLoading ? "Opening payment..." : "Checkout"}
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}
