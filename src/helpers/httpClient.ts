import * as https from 'https';
import * as http from 'http';
import logger from '../config/logger';

export interface HttpClientOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse {
  statusCode: number;
  body: string;
  headers: Record<string, any>;
}

export interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

class HttpClient {
  private readonly defaultTimeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: HttpClientOptions = {}) {
    this.defaultTimeout = options.timeout || 5000;
    this.defaultHeaders = options.headers || {};
  }

  /**
   * Generic HTTP request
   * @param url - URL to request
   * @param options - Request options
   * @returns Promise with response
   */
  async request(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = this.defaultTimeout,
    } = options;

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port) : parsedUrl.protocol === 'https:' ? 443 : 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'User-Agent': 'notification-service/1.0',
        ...this.defaultHeaders,
        ...headers,
      },
      timeout,
    };

    if (body) {
      const postData = typeof body === 'string' ? body : JSON.stringify(body);
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData).toString(),
      };
    }

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => (responseBody += chunk.toString()));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: responseBody,
            headers: res.headers as Record<string, any>,
          });
        });
      });

      req.on('error', (error) => {
        logger.error('HTTP request failed', { url, error: error.message });
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        const error = new Error(`Request timeout after ${timeout}ms`);
        logger.warn('HTTP request timeout', { url, timeout });
        reject(error);
      });

      if (body) {
        const postData = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(postData);
      }

      req.end();
    });
  }

  async get(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url: string, body: any, options: RequestOptions = {}): Promise<HttpResponse> {
    return this.request(url, { ...options, method: 'POST', body });
  }

  async put(url: string, body: any, options: RequestOptions = {}): Promise<HttpResponse> {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  async delete(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

// Export as singleton
const httpClient = new HttpClient();
export default httpClient;
