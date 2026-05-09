export async function fetchWithApiFallback(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, init);
}
