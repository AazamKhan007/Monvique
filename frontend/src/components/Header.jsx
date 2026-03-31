import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Header({ cartCount = 0, user, onLoggedOut }) {
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await api.logout();
    } finally {
      onLoggedOut();
      navigate("/login");
    }
  };

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/products" className="brand">Monvique</Link>
        <div className="header-right-block">
          {user?.role === "user" && (
            <Link className="cart-link-btn" to="/cart">
              Cart ({cartCount})
            </Link>
          )}
          {user?.role === "admin" && <p className="session-note">Admin: <strong>{user?.name || "-"}</strong></p>}
          <button type="button" className="ghost-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
