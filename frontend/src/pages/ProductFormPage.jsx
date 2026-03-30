import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, toAssetUrl } from "../lib/api";

const initialState = {
  title: "",
  description: "",
  category: "",
  brand: "",
  price: "",
  discount: "0",
  availability: "",
};

export default function ProductFormPage({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [imageFile, setImageFile] = useState(null);
  const [currentImage, setCurrentImage] = useState("");
  const [error, setError] = useState("");

  const isEdit = mode === "edit";
  const heading = useMemo(() => (isEdit ? "Edit Product" : "Add New Product"), [isEdit]);

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    api.getProduct(id)
      .then((data) => {
        const product = data.product;
        setForm({
          title: product.title || "",
          description: product.description || "",
          category: product.category || "",
          brand: product.brand || "",
          price: String(product.price ?? ""),
          discount: String(product.discount ?? 0),
          availability: product.availability || "",
        });
        setCurrentImage(product.image || "");
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("description", form.description);
      payload.append("category", form.category);
      payload.append("brand", form.brand);
      payload.append("availability", form.availability);
      payload.append("discount", form.discount);
      payload.append("price", form.price);
      if (imageFile) {
        payload.append("image", imageFile);
      }

      if (isEdit) {
        await api.updateProduct(id, payload);
      } else {
        await api.createProduct(payload);
      }

      navigate("/products");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="form-container">
      <div className="page-top">
        <h2>{heading}</h2>
        <Link to="/products" className="back-link">Back to Home</Link>
      </div>

      <form onSubmit={onSubmit} className="product-form">
        <input
          type="text"
          placeholder="Product title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="Product description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="text"
          placeholder="Product category"
          required
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          type="text"
          placeholder="Product brand"
          required
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
        />
        <label htmlFor="availability">Availability:</label>
        <select
          id="availability"
          required
          value={form.availability}
          onChange={(e) => setForm({ ...form, availability: e.target.value })}
        >
          <option value="">Select Availability</option>
          <option value="In Stock">In Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Low Stock">Low Stock</option>
        </select>
        <input
          type="number"
          min="0"
          max="100"
          required
          placeholder="Discount (%)"
          value={form.discount}
          onChange={(e) => setForm({ ...form, discount: e.target.value })}
        />
        <input
          type="number"
          required
          placeholder="Product price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        {isEdit && currentImage && (
          <>
            <p className="current-image-label">Current image:</p>
            <img src={toAssetUrl(currentImage)} alt={form.title || "Product"} className="form-image-preview" />
          </>
        )}

        <label htmlFor="image">{isEdit ? "Upload new image (optional)" : "Upload product image"}</label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />

        {error && <p className="error-text">{error}</p>}
        <button type="submit">{isEdit ? "Update Product" : "Add Product"}</button>
      </form>
    </div>
  );
}
