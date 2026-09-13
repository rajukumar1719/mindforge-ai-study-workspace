import http from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { HealthResponse, ServerConfig } from './types/index.js';
import { initSocketServer } from './websocket/socket.js';

dotenv.config();

const config: ServerConfig = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};

const app = express();

// Middlewares
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  const healthData: HealthResponse = {
    status: 'ok',
    service: 'syncdraw-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(healthData);
});

// 404 Not Found Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist.',
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]:', err.message);

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

// HTTP Server & WebSocket Server
const httpServer = http.createServer(app);
const io = initSocketServer(httpServer, config.clientUrl);

const server = httpServer.listen(config.port, () => {
  console.log(`[SyncDraw Server] Running in ${config.nodeEnv} mode`);
  console.log(`[SyncDraw Server] Listening on http://localhost:${config.port}`);
  console.log(`[SyncDraw Server] Health check available at http://localhost:${config.port}/health`);
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  console.log(`[SyncDraw Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[SyncDraw Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export { app, httpServer, io };
