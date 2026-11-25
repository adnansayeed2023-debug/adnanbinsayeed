// Storage helper: Vercel Blob in production, a local folder when LOCAL_STORE is set (for testing).
import { promises as fs } from 'node:fs';
import path from 'node:path';

const LOCAL = process.env.LOCAL_STORE;
const CONTENT = 'content.json';

export async function readContent() {
  if (LOCAL) {
    try { return JSON.parse(await fs.readFile(path.join(LOCAL, CONTENT), 'utf8')); } catch { return {}; }
  }
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: CONTENT, limit: 5 });
  const b = blobs.find(x => x.pathname === CONTENT);
  if (!b) return {};
  const r = await fetch(b.url + '?v=' + new Date(b.uploadedAt).getTime(), { cache: 'no-store' });
  if (!r.ok) return {};
  return r.json();
}

export async function writeContent(obj) {
  const body = JSON.stringify(obj);
  if (LOCAL) {
    await fs.mkdir(LOCAL, { recursive: true });
    await fs.writeFile(path.join(LOCAL, CONTENT), body);
    return;
  }
  const { put } = await import('@vercel/blob');
  await put(CONTENT, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60, contentType: 'application/json' });
}

export async function backupContent(obj) {
  if (!obj || !Object.keys(obj).length) return;
  const name = 'backups/content-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, 'backups'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, name), JSON.stringify(obj));
    return;
  }
  const { put } = await import('@vercel/blob');
  await put(name, JSON.stringify(obj), { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
}

export async function saveImage(name, type, buf) {
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const safe = (String(name || 'image').replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image').slice(0, 40);
  const file = `uploads/${Date.now()}-${safe}.${ext}`;
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, 'uploads'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, file), buf);
    return '/' + file;
  }
  const { put } = await import('@vercel/blob');
  const b = await put(file, buf, { access: 'public', addRandomSuffix: true, contentType: type });
  return b.url;
}
