import { Link } from "react-router-dom";

export default function NotFoundPage({ user }) {
  const isLoggedIn = Boolean(user);

  return (
    <main className="container centered-wrap">
      <section className="success-card not-found-card">
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist.</p>
        <p className="subtle-copy">
          {isLoggedIn
            ? "You are logged in. Go back to products page."
            : "You are not logged in. Please login to continue."}
        </p>
        <Link to={isLoggedIn ? "/products" : "/login"} className="back-link">
          {isLoggedIn ? "Go to Products" : "Go to Login"}
        </Link>
      </section>
    </main>
  );
}
