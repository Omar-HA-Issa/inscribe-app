import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/upload';
import searchRoutes from './routes/search';
import chatRoutes from './routes/chat';
import authRoutes from './routes/auth';
import documentsRoutes from './routes/documents';
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser())

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'DocuMind Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', searchRoutes);
app.use('/api', chatRoutes);
app.use('/api', documentsRoutes);

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('documents')
      .select('count')
      .limit(1);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Database connection working!',
      data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;