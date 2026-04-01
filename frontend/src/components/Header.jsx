import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Header({ cartCount = 0, user, onLoggedOut }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  const onLogout = async () => {
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
                {user?.role === "user" && (
                  <button type="button" className="avatar-menu-item" onClick={openHistory}>
                    Order History
                  </button>
                )}
                <button type="button" className="avatar-menu-item danger" onClick={onLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
