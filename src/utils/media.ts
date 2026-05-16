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

export function resolveMediaUrl(url?: string): string | undefined {
  const raw = (url || '').trim();
  if (!raw) return undefined;
  
  // If already a full URL, check if it's a localhost URL
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // If it's a localhost URL, replace it with the current origin
    if (raw.includes('localhost') || raw.includes('127.0.0.1')) {
      return `${getApiOrigin()}${raw.substring(raw.indexOf('/uploads'))}`;
    }
    return raw;
  }
  
  // If it's a path starting with /, prepend the origin
  if (raw.startsWith('/')) {
    return `${getApiOrigin()}${raw}`;
  }
  
  // Otherwise, treat as a relative path
  return `${getApiOrigin()}/${raw}`;
}