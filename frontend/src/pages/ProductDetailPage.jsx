import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export default function ProductDetailPage({ user, setCartCount }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingDetail(true);
    api.getProduct(id)
      .then((data) => {
        setProduct(data.product);
        setQuantity(data.currentQuantity || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDetail(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === "user") {
      api.getCart().then((data) => setCartCount(data.cartCount || 0)).catch(() => {});
    }
  }, [user, setCartCount]);

  const syncQuantity = (nextValue) => {
    const parsed = Number.parseInt(String(nextValue), 10);
    setQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
  };

  const addToCart = async () => {
    if (adding) {
      return;
    }

    setAdding(true);
    try {
      await api.addToCart(id, quantity);
      const cartData = await api.getCart();
      setCartCount(cartData.cartCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const buyNow = async () => {
    if (buying) {
      return;
    }

    setBuying(true);
    try {
      setError("");
      const scriptReady = await ensureRazorpayScript();
      if (!scriptReady) {
        throw new Error("Razorpay SDK failed to load");
      }

      const orderPayload = await api.createBuyNowOrder(id, quantity);

      const razorpayOptions = {
        key: orderPayload.keyId,
        order_id: orderPayload.orderId,
        amount: orderPayload.amount,
        currency: orderPayload.currency,
        handler: async (response) => {
          try {
            await api.verifyBuyNowPayment(id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setCartCount(0);
            navigate("/checkout-success", {
              state: {
                checkoutType: "buy-now",
                itemCount: orderPayload.itemCount,
                totalAmount: orderPayload.totalAmount,
                success: true,
              },
            });
          } catch (verifyError) {
            setError(`Payment verification failed: ${verifyError.message}`);
            setBuying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBuying(false);
          },
        },
        prefill: {
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.on("payment.failed", (event) => {
        const reason = event?.error?.description || "Payment failed";
        setError(reason);
        setBuying(false);
      });
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setBuying(false);
    }
  };

  if (loadingDetail) {
    return (
      <main className="container page-wrap">
        <div className="page-loader">
          <div className="spinner" />
          <p className="subtle-copy">Loading product...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container page-wrap">
        {error ? <p className="error-text">{error}</p> : <p className="empty">Product not found.</p>}
      </main>
    );
  }

  return (
    <main className="container page-wrap">
      <Link to="/products" className="back-link subtle-back">Back to products</Link>
      <section className="detail-layout">
        <div className="detail-image-wrap">
          {product.image ? (
            <img className="detail-image" src={toAssetUrl(product.image)} alt={product.title} />
          ) : (
            <div className="image-fallback detail-fallback">No Image</div>
          )}
        </div>
        <div className="detail-content">
          <h1>{product.title}</h1>
          <p className="price-line large">Rs. {product.price}</p>
          <p><strong>Category:</strong> {product.category}</p>
          <p><strong>Brand:</strong> {product.brand}</p>
          <p><strong>Availability:</strong> {product.availability}</p>
          {Number(product.discount) > 0 && <p><strong>Discount:</strong> {product.discount}% OFF</p>}
          <p className="desc">{product.description || "No description available."}</p>
          <div className="action-stack">
            <div className="inline-form qty-form">
              <label htmlFor="qty">Quantity</label>
              <div className="qty-stepper detail-stepper">
                <button type="button" className="qty-btn" onClick={() => syncQuantity(quantity - 1)}>-</button>
                <input
                  id="qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => syncQuantity(event.target.value)}
                />
                <button type="button" className="qty-btn" onClick={() => syncQuantity(quantity + 1)}>+</button>
              </div>
              <button type="button" onClick={addToCart} disabled={adding || buying}>
                {adding ? "Adding..." : "Add to Cart"}
              </button>
            </div>

            <div className="inline-form qty-form buy-form">
              <button type="button" className="primary-btn" onClick={buyNow} disabled={buying || adding}>
                {buying ? "Opening payment..." : "Buy Now"}
              </button>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>
      </section>
    </main>
  );
}
