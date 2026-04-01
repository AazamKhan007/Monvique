import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

function formatDate(rawValue) {
  if (!rawValue) {
    return "-";
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

export default function OrderHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getOrderHistory()
      .then((payload) => {
        setHistory(payload.history || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container page-wrap">
      <section className="page-top">
        <h2>Your Order History</h2>
        <Link to="/products" className="back-link">Back to Products</Link>
      </section>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <div className="page-loader">
          <div className="spinner" />
          <p className="subtle-copy">Loading order history...</p>
        </div>
      ) : !history.length ? (
        <div className="empty-cart">
          <h3>No orders yet</h3>
          <p>Orders paid successfully will appear here.</p>
        </div>
      ) : (
        <section className="history-list">
          {history.map((order) => (
            <article className="history-card" key={`${order.paymentId}-${order.purchasedAt}`}>
              <div className="history-top-row">
                <h3>{order.checkoutType === "buy-now" ? "Buy Now Order" : "Cart Checkout"}</h3>
                <p className="history-date">{formatDate(order.purchasedAt)}</p>
              </div>

              <div className="history-meta-grid">
                <p><strong>Payment ID:</strong> {order.paymentId}</p>
                <p><strong>Order ID:</strong> {order.orderId || "-"}</p>
                <p><strong>Total items:</strong> {order.totalItems}</p>
                <p><strong>Total paid:</strong> Rs. {order.totalAmount}</p>
              </div>

              <div className="history-items">
                {(order.items || []).map((item, idx) => (
                  <div className="history-item" key={`${order.paymentId}-${item.productId || idx}`}>
                    {item.image ? (
                      <img src={toAssetUrl(item.image)} alt={item.title} className="history-item-image" />
                    ) : (
                      <div className="image-fallback history-item-image">No Image</div>
                    )}

                    <div className="history-item-info">
                      <p className="history-item-title">{item.title}</p>
                      <p>{item.category} | {item.brand}</p>
                      <p>Rs. {item.price} x {item.quantity}</p>
                    </div>

                    <p className="history-line-total">Rs. {item.lineTotal}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
