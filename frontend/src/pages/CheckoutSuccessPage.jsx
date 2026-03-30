import { Link, useLocation, useNavigate } from "react-router-dom";

export default function CheckoutSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  if (!data) {
    navigate("/products", { replace: true });
    return null;
  }

  const label = data.checkoutType === "buy-now" ? "Buy now completed" : "Checkout completed";

  return (
    <main className="container centered-wrap">
      <section className="success-card">
        <h2>{label}</h2>
        <p>Items: <strong>{data.itemCount}</strong></p>
        <p>Total paid: <strong>Rs. {data.totalAmount}</strong></p>
        <Link to="/products" className="back-link">Continue Shopping</Link>
      </section>
    </main>
  );
}
