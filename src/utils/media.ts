export function getApiOrigin(): string {
  // Use the same URL as the API base
  const baseUrl = import.meta.env.VITE_API_URL || 'https://modes-supervisor-approach-barbie.trycloudflare.com/api/v1';
  try {
    const parsed = new URL(baseUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'https://modes-supervisor-approach-barbie.trycloudflare.com';
  }
}

export function resolveMediaUrl(url?: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  
  // If already a full URL, return it
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  
  // If it's a path starting with /, prepend the origin
  if (raw.startsWith('/')) {
    return `${getApiOrigin()}${raw}`;
  }
  
  // Otherwise, treat as a relative path
  return `${getApiOrigin()}/${raw}`;
}