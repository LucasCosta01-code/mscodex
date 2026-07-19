/* Configuração pública do Supabase (anon key é segura no frontend com RLS) */
window.MSCODEX_SUPABASE = {
  url: 'https://yibrbucmucqzbhxzfctt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYnJidWNtdWNxemJoeHpmY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjMyOTcsImV4cCI6MjA5OTk5OTI5N30.30vCnZNi9SomFycii0-egqMd_H7I0QhtTynbmifC7xM',
  whatsapp: '5511960670956',
  adminEmail: 'lucascostapix1@gmail.com',
};

window.mscodexHeaders = function mscodexHeaders(extra = {}) {
  const key = window.MSCODEX_SUPABASE.anonKey;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
};

window.mscodexRpc = async function mscodexRpc(fnName, body = {}) {
  const { url } = window.MSCODEX_SUPABASE;
  const res = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: window.mscodexHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.hint)) ||
      (typeof data === 'string' ? data : 'Erro na API');
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

window.mscodexFetchProducts = async function mscodexFetchProducts() {
  const { url } = window.MSCODEX_SUPABASE;
  const res = await fetch(
    `${url}/rest/v1/products?active=eq.true&select=*&order=created_at.desc`,
    { headers: window.mscodexHeaders() }
  );
  if (!res.ok) throw new Error('Não foi possível carregar os produtos.');
  return res.json();
};

window.mapProduct = function mapProduct(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    requirements: p.requirements || '',
    price: Number(p.price || 0),
    category: p.category || 'Geral',
    tags: Array.isArray(p.tags) ? p.tags : [],
    image: p.image_url || p.image || '',
    image_url: p.image_url || p.image || '',
    featured: Boolean(p.featured),
    active: p.active !== false,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

/** Comprime qualquer imagem no navegador até caber no upload (JPEG). */
window.mscodexCompressImage = async function mscodexCompressImage(file, maxBytes = 1800 * 1024) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Imagem inválida ou corrompida'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    const toBlob = (quality) =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem'))),
          'image/jpeg',
          quality
        );
      });

    let maxSide = Math.min(Math.max(img.width, img.height), 1600);
    let quality = 0.85;
    let blob = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await toBlob(quality);
      if (blob.size <= maxBytes) return blob;

      if (quality > 0.55) quality -= 0.1;
      else maxSide = Math.round(maxSide * 0.75);
    }

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/** Envia imagem para o Storage do Supabase e retorna URL pública. */
window.mscodexUploadProductImage = async function mscodexUploadProductImage(fileOrBlob, filenameHint = 'produto') {
  const { url, anonKey } = window.MSCODEX_SUPABASE;
  const safeName = String(filenameHint || 'produto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'produto';
  const filename = `${Date.now()}-${safeName}.jpg`;
  const endpoint = `${url}/storage/v1/object/product-images/${filename}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: fileOrBlob,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err.message || err.error || '';
    } catch {
      /* ignore */
    }
    throw new Error(detail || 'Falha no upload da imagem');
  }

  return `${url}/storage/v1/object/public/product-images/${filename}`;
};
