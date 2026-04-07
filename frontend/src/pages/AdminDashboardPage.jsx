import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button 
          onClick={() => navigate("/")}
          style={{
            padding: "10px 16px",
            background: "var(--line)",
            color: "var(--text)",
            border: "1px solid var(--line)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Back to Home
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
        <button
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users Management
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "analytics" && (
          <React.Suspense fallback={<div>Loading analytics...</div>}>
            <Analytics />
          </React.Suspense>
        )}
        {activeTab === "users" && (
          <React.Suspense fallback={<div>Loading users...</div>}>
            <UsersManagement />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}

function Analytics() {
  const [analytics, setAnalytics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const { api } = await import("../lib/api");
      const data = await api.getAnalytics();
      setAnalytics(data.analytics);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!analytics) return <div className="error">No analytics data available</div>;

  return (
    <div className="analytics-container">
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Users</h3>
          <p className="metric-value">{analytics.totalUsers}</p>
        </div>
        <div className="metric-card">
          <h3>Total Products</h3>
          <p className="metric-value">{analytics.totalProducts}</p>
        </div>
        <div className="metric-card">
          <h3>Total Orders</h3>
          <p className="metric-value">{analytics.totalOrders}</p>
        </div>
        <div className="metric-card highlight">
          <h3>Total Revenue</h3>
          <p className="metric-value">₹{analytics.totalRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="metric-card">
          <h3>Total Items Sold</h3>
          <p className="metric-value">{analytics.totalItemsSold}</p>
        </div>
      </div>

      <div className="inventory-section">
        <h2>Inventory Status</h2>
        <div className="inventory-grid">
          <div className="inventory-card in-stock">
            <h4>In Stock</h4>
            <p className="count">{analytics.inventory.inStockCount}</p>
          </div>
          <div className="inventory-card low-stock">
            <h4>Low Stock</h4>
            <p className="count">{analytics.inventory.lowStockCount}</p>
          </div>
          <div className="inventory-card out-of-stock">
            <h4>Out of Stock</h4>
            <p className="count">{analytics.inventory.outOfStockCount}</p>
          </div>
        </div>
      </div>

      <div className="recent-orders-section">
        <h2>Recent Orders</h2>
        {analytics.recentOrders && analytics.recentOrders.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email</th>
                <th>Order ID</th>
                <th>Total Amount</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentOrders.map((order, idx) => (
                <tr key={`${order.userId || "user"}-${order.orderId || "order"}-${order.date || idx}-${idx}`}>
                  <td>{order.userName}</td>
                  <td>{order.email || "N/A"}</td>
                  <td>{order.orderId || "N/A"}</td>
                  <td>₹{order.totalAmount.toLocaleString("en-IN")}</td>
                  <td>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((item, itemIdx) => (
                        <div key={`${item.productId || item.title || itemIdx}-${itemIdx}`}>
                          {item.title} x {item.quantity}
                        </div>
                      ))
                    ) : (
                      order.totalItems
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No recent orders</p>
        )}
      </div>
    </div>
  );
}

function UsersManagement() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [roleChanging, setRoleChanging] = React.useState({});
  const [deleting, setDeleting] = React.useState({});

  React.useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { api } = await import("../lib/api");
      const data = await api.getAllUsers();
      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      setRoleChanging((prev) => ({ ...prev, [userId]: true }));
      const { api } = await import("../lib/api");
      await api.updateUserRole(userId, newRole);
      
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      setRoleChanging((prev) => ({ ...prev, [userId]: false }));
    } catch (err) {
      alert("Failed to update role: " + err.message);
      setRoleChanging((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      setDeleting((prev) => ({ ...prev, [userId]: true }));
      const { api } = await import("../lib/api");
      await api.deleteUser(userId);
      
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setDeleting((prev) => ({ ...prev, [userId]: false }));
    } catch (err) {
      alert("Failed to delete user: " + err.message);
      setDeleting((prev) => ({ ...prev, [userId]: false }));
    }
  }

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="users-management-container">
      <h2>Users Management ({users.length})</h2>
      
      {users.length === 0 ? (
        <p className="no-data">No users found</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>Change Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="user-row">
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={roleChanging[user.id]}
                    className="role-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={deleting[user.id]}
                    className="btn btn-delete"
                  >
                    {deleting[user.id] ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
