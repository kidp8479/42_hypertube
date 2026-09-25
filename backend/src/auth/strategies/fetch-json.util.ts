// Shared by the OAuth strategies' userProfile(): fetch a provider API and
// parse JSON, but refuse a non-2xx answer instead of handing an error body
// on as if it were the profile.
export async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${url} responded with HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
