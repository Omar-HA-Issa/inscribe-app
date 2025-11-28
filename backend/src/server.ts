import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logger } from './shared/utils/logger';
import { CORS_CONFIG } from './shared/constants/config';
import { errorHandler } from './app/middleware/errorHandler';
import { responseFormatterMiddleware } from './app/middleware/responseFormatter';

import uploadRoutes from './app/routes/upload.routes';
import searchRoutes from './app/routes/search.routes';
import chatRoutes from './app/routes/chat.routes';
import authRoutes from './app/routes/auth.routes';
import documentsRoutes from './app/routes/documents.routes';
import insightsRoutes from './app/routes/insights.routes';
import contradictionsRoutes from './app/routes/validation.routes';

const app = express();

app.use(cookieParser());

// Middleware
app.use(
  cors({
    origin: CORS_CONFIG.ORIGIN,
    credentials: CORS_CONFIG.CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'],
    maxAge: 86400,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(responseFormatterMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Inscribe Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api", authRoutes);
app.use("/api", uploadRoutes);
app.use("/api", searchRoutes);
app.use("/api", chatRoutes);
app.use("/api", documentsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/contradictions', contradictionsRoutes);

app.get("/api/test-db", async (req, res) => {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("documents")
      .select("count")
      .limit(1);

    if (error) throw error;

    res.json({
      success: true,
      message: "Database connection working!",
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
