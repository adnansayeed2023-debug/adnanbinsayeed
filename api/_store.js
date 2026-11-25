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

// ---- proposal requests from visitors ----
export async function saveProposal(obj) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const body = JSON.stringify({ id, ...obj });
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, 'proposals'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, 'proposals', id + '.json'), body);
    return id;
  }
  const { put } = await import('@vercel/blob');
  await put(`proposals/${id}.json`, body, { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
  return id;
}

export async function listProposals() {
  if (LOCAL) {
    const dir = path.join(LOCAL, 'proposals');
    let files = [];
    try { files = await fs.readdir(dir); } catch { return []; }
    const out = [];
    for (const f of files) { try { out.push({ ...JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')), ref: f }); } catch {} }
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: 'proposals/', limit: 300 });
  const out = await Promise.all(blobs.map(async b => {
    try { const r = await fetch(b.url, { cache: 'no-store' }); return { ...(await r.json()), ref: b.url }; } catch { return null; }
  }));
  return out.filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export async function deleteProposal(ref) {
  ref = String(ref || '');
  if (LOCAL) {
    if (!/^[\w.-]+\.json$/.test(ref)) throw new Error('bad-ref');
    await fs.unlink(path.join(LOCAL, 'proposals', ref));
    return;
  }
  if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\/proposals\//.test(ref)) throw new Error('bad-ref');
  const { del } = await import('@vercel/blob');
  await del(ref);
}
