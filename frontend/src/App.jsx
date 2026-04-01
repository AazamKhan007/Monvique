import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import { api } from "./lib/api";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import ProductFormPage from "./pages/ProductFormPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import NotFoundPage from "./pages/NotFoundPage";

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/products" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    api.getMe()
      .then((data) => {
        setUser(data.user);
        if (!data.user) {
          setCartCount(0);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="centered-wrap">
        <div className="app-loading">
          <div className="spinner" />
          <p>Loading your session...</p>
        </div>
      </main>
    );
  }

  const showHeader = Boolean(
    user &&
    location.pathname !== "/login" &&
    location.pathname !== "/signup" &&
    location.pathname !== "/products" &&
    location.pathname !== "/products/new" &&
    !location.pathname.endsWith("/edit")
  );

  return (
    <>
      {showHeader && <Header cartCount={cartCount} user={user} onLoggedOut={() => {
        setUser(null);
        setCartCount(0);
      }} />}
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/products" : "/login"} replace />} />
        <Route path="/login" element={user ? <Navigate to="/products" replace /> : <LoginPage onAuth={setUser} />} />
        <Route path="/signup" element={user ? <Navigate to="/products" replace /> : <SignupPage onAuth={setUser} />} />
        <Route
          path="/products"
          element={(
            <ProtectedRoute user={user}>
              <ProductsPage
                user={user}
                setCartCount={setCartCount}
                cartCount={cartCount}
                onLoggedOut={() => {
                  setUser(null);
                  setCartCount(0);
                }}
              />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/products/:id"
          element={(
            <ProtectedRoute user={user}>
              <ProductDetailPage user={user} setCartCount={setCartCount} />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/products/new"
          element={(
            <AdminRoute user={user}>
              <ProductFormPage mode="create" />
            </AdminRoute>
          )}
        />
        <Route
          path="/products/:id/edit"
          element={(
            <AdminRoute user={user}>
              <ProductFormPage mode="edit" />
            </AdminRoute>
          )}
        />
        <Route
          path="/cart"
          element={(
            <ProtectedRoute user={user}>
              <CartPage setCartCount={setCartCount} />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/checkout-success"
          element={(
            <ProtectedRoute user={user}>
              <CheckoutSuccessPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/history"
          element={(
            <ProtectedRoute user={user}>
              <OrderHistoryPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<NotFoundPage user={user} />} />
      </Routes>
    </>
  );
}
