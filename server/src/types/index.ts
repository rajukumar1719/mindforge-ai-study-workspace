export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  uptime: number;
  timestamp: string;
}

export interface ServerConfig {
  port: number;
  clientUrl: string;
  nodeEnv: string;
}

export * from './collaboration.js';

