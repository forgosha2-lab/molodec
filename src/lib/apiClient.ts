export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<any> {
  const userStr = localStorage.getItem('user');
  const userId = userStr ? JSON.parse(userStr).id : 'player';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

