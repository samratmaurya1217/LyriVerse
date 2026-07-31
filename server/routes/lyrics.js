/* ═══════════════════════════════════════════════════════════════
   Lyrics Routes — Backend API for multi-source lyrics fetching
   ═══════════════════════════════════════════════════════════════ */

import { Router } from 'express';
import { findLyrics, searchLyrics } from '../services/lyricsAggregator.js';

const router = Router();

/**
 * GET /api/lyrics/search?q=query
 * Search LRCLIB for lyrics (used by frontend search UI).
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query' });

    const results = await searchLyrics(q);
    res.json({ results });
  } catch (err) {
    console.error('[Lyrics] Search error:', err.message);
    res.status(500).json({ error: 'Lyrics search failed' });
  }
});

/**
 * GET /api/lyrics/find?track=name&artist=name&album=name&duration=300
 * Find synced lyrics from all sources for a specific track.
 */
router.get('/find', async (req, res) => {
  try {
    const { track, artist, album, duration } = req.query;
    if (!track || !artist) {
      return res.status(400).json({ error: 'Missing track or artist' });
    }

    const result = await findLyrics(
      track,
      artist,
      album || null,
      duration ? parseInt(duration, 10) : null
    );

    if (!result) {
      return res.json({
        found: false,
        source: null,
        lines: [],
        syncedLyrics: null,
        plainLyrics: null,
      });
    }

    res.json({
      found: true,
      source: result.source,
      lines: result.lines,
      syncedLyrics: result.syncedLyrics,
      plainLyrics: result.plainLyrics,
    });
  } catch (err) {
    console.error('[Lyrics] Find error:', err.message);
    res.status(500).json({ error: 'Lyrics fetch failed' });
  }
});

export default router;
