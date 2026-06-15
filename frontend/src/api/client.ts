const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ApiError {
  error: string;
  fields?: Array<{ field: string; message: string }>;
  status: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: { error?: string; fields?: Array<{ field: string; message: string }> };
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText || 'Request failed' };
    }

    const apiError: ApiError = {
      error: body.error || 'An unexpected error occurred',
      fields: body.fields,
      status: response.status,
    };

    throw apiError;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
}

export const apiClient = {
  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(headers),
      credentials: 'include',
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(headers),
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(headers),
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(headers),
      credentials: 'include',
    });
    return handleResponse<T>(response);
  },
};

export default apiClient;
