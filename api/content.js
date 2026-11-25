// Public: returns the saved site content (overrides on top of data.js).
import { readContent } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  try {
    const c = await readContent();
    const fresh = req.query && req.query.fresh;
    res.setHeader('Cache-Control', fresh ? 'no-store' : 'public, s-maxage=15, stale-while-revalidate=60');
    return res.status(200).json(c || {});
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({});
  }
}
