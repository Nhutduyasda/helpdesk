export function validateConfiguration(url: string | undefined, key: string | undefined) {
  if (!url || !key || url.includes('YOUR_') || key.includes('REPLACE_'))
    return 'Chưa cấu hình Supabase. Xem hướng dẫn thiết lập môi trường thử nghiệm.';
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
    )
      return 'URL Supabase không hợp lệ.';
    if (key.startsWith('sb_publishable_')) return null;
    // Local CLI may provide a public legacy anon JWT. Never accept privileged keys.
    const encoded = (key.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded)) as { role?: string };
    if (payload.role === 'anon') return null;
  } catch {
    /* The supplied key is not a supported public key. */
  }
  return 'Chỉ dùng publishable key hoặc anon key công khai; không dùng secret/service-role key.';
}
