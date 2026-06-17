import type { ApiResponse } from '@shared/types';

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  });

  const token = localStorage.getItem('chemical-safety-storage')
    ? JSON.parse(localStorage.getItem('chemical-safety-storage') || '{}').state?.token
    : null;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || `请求失败: ${response.status}`);
  }

  return data.data;
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) => {
    const query = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return request<T>(`${path}${query}`);
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),

  upload: async <T>(path: string, file: File, extra?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', file);
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const token = localStorage.getItem('chemical-safety-storage')
      ? JSON.parse(localStorage.getItem('chemical-safety-storage') || '{}').state?.token
      : null;

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      headers,
    });

    const data = (await response.json()) as ApiResponse<T>;
    if (!response.ok || data.code !== 0) {
      throw new Error(data.message || `上传失败: ${response.status}`);
    }
    return data.data;
  },

  download: async (path: string, filename: string) => {
    const token = localStorage.getItem('chemical-safety-storage')
      ? JSON.parse(localStorage.getItem('chemical-safety-storage') || '{}').state?.token
      : null;

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, { headers });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
