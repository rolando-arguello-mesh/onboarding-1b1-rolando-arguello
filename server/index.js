const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// MeshConnect API endpoints will be added here
app.get('/api/mesh/link-token', (req, res) => {
  // TODO: Generate MeshConnect link token
  res.json({ message: 'MeshConnect link token endpoint' });
});

app.post('/api/mesh/accounts', (req, res) => {
  // TODO: Get account information
  res.json({ message: 'Get accounts endpoint' });
});

app.post('/api/mesh/transfer', (req, res) => {
  // TODO: Execute transfer
  res.json({ message: 'Transfer endpoint' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
}); 