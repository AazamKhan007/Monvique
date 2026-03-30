const express = require("express");
const path = require("path");
const session = require("express-session");
const methodOverride = require("method-override");
const cors = require("cors");

const { connectMongoDb } = require("./connection");
const { attachCurrentUser } = require("./middleware/auth");
const productRouter = require("./routes/product");
const userRouter = require("./routes/user");

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "crud-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
  })
);
app.use(attachCurrentUser);

app.use("/api/user", userRouter);
app.use("/api/product", productRouter);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

connectMongoDb(process.env.MONGO_URL || "mongodb://localhost:27017/Amazon")
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect MongoDB:", error);
  });
