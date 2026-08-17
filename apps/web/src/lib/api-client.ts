const BASE_URL = '/api/v1';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T }> {
  const { method = 'GET', headers = {}, body } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw { response: { data: error } };
  }

  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
