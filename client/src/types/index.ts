export interface AppConfig {
  serverUrl: string;
  wsUrl: string;
}

export type HealthStatus = 'checking' | 'healthy' | 'unreachable';

export interface HealthData {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
}
