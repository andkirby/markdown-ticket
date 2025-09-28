export interface CounterConfig {
  enabled: boolean;
  endpoint: string;
  api_key?: string;
  timeout?: number;
}

export interface CounterResponse {
  ticketId: string;
  nextNumber: number;
  projectId: string;
}

export interface CounterError {
  error: string;
  code: string;
}
