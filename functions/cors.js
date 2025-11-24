// functions/cors.js
const cors = require('cors')({
  origin: [
    'https://feveck-invoice.web.app',
    'https://feveck-invoice.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// CORS handler for HTTP functions
const handleCors = (req, res) => {
  return new Promise((resolve) => {
    cors(req, res, () => {
      resolve();
    });
  });
};

module.exports = { handleCors };