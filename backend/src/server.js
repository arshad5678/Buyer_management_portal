import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import buyerRoutes from './routes/buyerRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Trust Render's load balancer so req.secure is true behind HTTPS termination
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = `disconnected (${error.message})`;
  }

  res.status(200).json({
    status: 'success',
    message: 'Buyer Management Portal Backend API is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/buyers', buyerRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.originalUrl} - endpoint not found`
  });
});

app.use(errorHandler);

const startServer = (port) => {
  const server = app.listen(port, async () => {
    console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    await testConnection();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${port} is in use. Falling back to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[Server Error]', err);
    }
  });
};

startServer(Number(PORT));

export default app;
