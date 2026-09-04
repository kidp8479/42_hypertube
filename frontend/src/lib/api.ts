const NO_CONTENT = 204;

export async function apiFetch(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (response.status === NO_CONTENT) {
    return undefined;
  }
  return await response.json();
}
