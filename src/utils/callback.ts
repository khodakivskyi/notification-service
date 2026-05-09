import { httpClient } from '../helpers/index.js';
import logger from '../config/logger.js';

export interface CallbackResponse {
  statusCode: number;
  body: string;
  headers: Record<string, any>;
}

export interface CallbackOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Call webhook callback
 * @param callbackUrl - URL to call
 * @param data - Data to send
 * @param options - Optional callback options
 * @returns Promise with response
 */
export async function callCallback(
  callbackUrl: string,
  data: any,
  options: CallbackOptions = {},
): Promise<CallbackResponse> {
  try {
    const response = await httpClient.post(callbackUrl, data, options);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      logger.info('Callback executed successfully', {
        url: callbackUrl,
        statusCode: response.statusCode,
      });
    } else {
      logger.warn('Callback returned non-2xx status', {
        url: callbackUrl,
        statusCode: response.statusCode,
      });
    }

    return response;
  } catch (error: any) {
    logger.error('Callback failed', { url: callbackUrl, error: error.message });
    throw error;
  }
}
