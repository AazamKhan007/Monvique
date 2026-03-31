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
const FRONTEND_ORIGINS = [
  ...(process.env.FRONTEND_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
  ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN.trim()] : []),
  "http://localhost:5173",
];
const ALLOWED_ORIGINS = [...new Set(FRONTEND_ORIGINS)];
const isProduction = process.env.NODE_ENV === "production";

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  const isExactMatch = ALLOWED_ORIGINS.includes(origin);
  if (isExactMatch) {
    return true;
  }

  // Allow Vercel preview/prod domains without listing each generated URL.
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked CORS origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
if (isProduction) {
  app.set("trust proxy", 1);
}
app.use(
  session({
    secret: process.env.SESSION_SECRET || "crud-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
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
