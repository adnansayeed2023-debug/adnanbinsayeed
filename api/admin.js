// Admin only: check password, save content, upload images.
import crypto from 'node:crypto';
import { readContent, writeContent, backupContent, saveImage } from './_store.js';

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = pw => {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !pw) return false;
  return crypto.timingSafeEqual(sha(pw), sha(real));
};
const LIST_KEYS = ['awards', 'timeline', 'gallery', 'projects'];
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];


export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'no-password-set' });
  const pw = req.headers['x-admin-password'];
  if (!ok(pw)) { await sleep(900); return res.status(401).json({ error: 'wrong-password' }); }
  const body = req.body || {};
  try {
    if (body.action === 'check') return res.status(200).json({ ok: true });
    if (body.action === 'save') {
      const c = body.content;
      if (!c || typeof c !== 'object' || Array.isArray(c)) return res.status(400).json({ error: 'bad-content' });
      const out = { v: 1, savedAt: new Date().toISOString() };
      if (c.texts && typeof c.texts === 'object') {
        out.texts = {};
        for (const l of ['en', 'bn', 'ar']) if (c.texts[l] && typeof c.texts[l] === 'object') out.texts[l] = c.texts[l];
      }
      for (const k of LIST_KEYS) if (Array.isArray(c[k])) out[k] = c[k];
      if (JSON.stringify(out).length > 900000) return res.status(413).json({ error: 'too-big' });
      try { await backupContent(await readContent()); } catch {}
      await writeContent(out);
      return res.status(200).json({ ok: true, savedAt: out.savedAt });
    }
    if (body.action === 'upload') {
      const type = String(body.type || '');
      if (!TYPES.includes(type)) return res.status(400).json({ error: 'bad-type' });
      const buf = Buffer.from(String(body.data || ''), 'base64');
      if (!buf.length || buf.length > 3.5 * 1024 * 1024) return res.status(400).json({ error: 'bad-size' });
      const url = await saveImage(body.name, type, buf);
      return res.status(200).json({ ok: true, url });
    }
    return res.status(400).json({ error: 'bad-action' });
  } catch (e) {
    return res.status(500).json({ error: 'server', detail: String(e && e.message || e).slice(0, 200) });
  }
}
