// Branches API
import { getDb, COLLECTIONS, queryToArray } from '../_lib/firebase.js';
import { verifyToken, corsHeaders, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await verifyToken(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = getDb();

    const branchesSnapshot = await db.collection(COLLECTIONS.BRANCHES).get();
    const branches = queryToArray(branchesSnapshot);

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
}
