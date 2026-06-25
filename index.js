require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./src/authApi/authRoutes');
const walletRoutes = require('./src/walletApi/walletRoute');
const historyRoutes = require('./src/historyApi/historyRoutes');
const cryptoPriceRoutes = require('./src/cryptoApi/cryptoPriceRoutes');
const adminRoutes = require('./src/adminApi/adminRoutes');
const path = require('path');
const cors = require('cors');
const allowedOrigins = [process.env.FRONTEND_URL_1, process.env.FRONTEND_URL_2];

console.log("Allowed Origins: ", allowedOrigins)

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman, curl)
    console.log("origin ::: ", origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true); // allow this origin
    } else {
      callback(new Error('Not allowed by CORS')); // block other origins
    }
  },
  credentials: true, // allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',       // for JSON requests
    'Authorization',      // for JWT or Bearer tokens
    'Cache-Control',      // for controlling caching
    'X-Requested-With',   // sometimes sent by AJAX requests
    'Accept',             // MIME types the client can handle
    'Origin',             // usually automatically handled, but safe to include
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ]
}));

// Optional: handle preflight OPTIONS requests
// app.options('*', cors());

// ----------------- Middlewares
app.use(express.json());

// ----------------- Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/crypto', cryptoPriceRoutes);
app.use('/api/admin', adminRoutes);

// ----------------- Static file serving
app.use('/icon', express.static(path.join(__dirname, 'src', 'uploadimage', 'icon')));

app.get('/', (req, res) => {
  res.send('Welcome to the Crypto Backend API!');
});

// ----------------- Start server (listen on all interfaces)
const PORT = process.env.PORT || 8000; // ✅ use 1000 or env, not 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://<your-LAN-IP>:${PORT}`);
});
