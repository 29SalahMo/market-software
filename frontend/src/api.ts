const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function getApiBase(): string {
  return API_BASE;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const url = `${API_BASE}${path}`;
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  };
  if (token) {
    (finalHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
  });

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    const message = (data as any)?.error?.message ?? 'Unexpected error';
    throw new Error(message);
  }

  return data as T;
}

