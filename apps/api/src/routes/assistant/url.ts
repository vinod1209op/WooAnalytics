import { INTERNAL_API_BASE } from "./config";

export function buildUrl(path: string, params: Record<string, any>) {
  const url = new URL(path, INTERNAL_API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}
