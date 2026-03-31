import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

export default function ProductDetailPage({ user, setCartCount }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProduct(id)
      .then((data) => {
        setProduct(data.product);
        setQuantity(data.currentQuantity || 1);
      })
      .catch((err) => setError(err.message));
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
    try {
      await api.addToCart(id, quantity);
      const cartData = await api.getCart();
      setCartCount(cartData.cartCount || 0);
    } catch (err) {
      setError(err.message);
    }
  };

  const buyNow = async () => {
    try {
      setError("");
      const orderPayload = await api.createBuyNowOrder(id, quantity);

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

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
          }
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
      razorpay.open();
    } catch (err) {
      setError(err.message);
    }
  };
  if (!product) {
    return (
      <main className="container page-wrap">
        {error ? <p className="error-text">{error}</p> : <p>Loading...</p>}
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
              <button type="button" onClick={addToCart}>Add to Cart</button>
            </div>

            <div className="inline-form qty-form buy-form">
              <button type="button" className="primary-btn" onClick={buyNow}>Buy Now</button>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>
      </section>
    </main>
  );
}
