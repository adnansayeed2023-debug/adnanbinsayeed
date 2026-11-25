// Public: visitors ask for a customized project proposal. Saved for the admin inbox.
import { saveProposal } from './_store.js';

const ORIGINS = ['https://adnanbinsayeed.vercel.app', 'https://adnanbinsayeed.netlify.app'];
const s = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = req.body || {};
  // simple bot checks: hidden field must be empty, and the form must have been open a few seconds
  if (b.website) return res.status(200).json({ ok: true });
  const openedMs = Number(b.t) || 0;
  if (!openedMs || Date.now() - openedMs < 3000) return res.status(400).json({ error: 'too-fast' });
  const name = s(b.name, 80), email = s(b.email, 120), phone = s(b.phone, 30);
  const msg = String(b.msg == null ? '' : b.msg).trim().slice(0, 3000);
  if (name.length < 2) return res.status(400).json({ error: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'email' });
  if (msg.length < 10) return res.status(400).json({ error: 'msg' });
  try {
    await saveProposal({
      at: new Date().toISOString(), name, email, phone,
      type: s(b.type, 60), budget: s(b.budget, 60), time: s(b.time, 60), msg,
      lang: s(b.lang, 4), from: s(origin, 60)
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'server' });
  }
}
