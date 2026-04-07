import AdminProductsPage from "./AdminProductsPage";
import UserProductsPage from "./UserProductsPage";

export default function ProductsPage({ user, setCartCount, cartCount, onLoggedOut }) {
  if (user?.role === "admin") {
    return <AdminProductsPage user={user} onLoggedOut={onLoggedOut} />;
  }

  return (
    <UserProductsPage
      user={user}
      setCartCount={setCartCount}
      cartCount={cartCount}
      onLoggedOut={onLoggedOut}
    />
  );
}
