/* ═══════════════════════════════════════════════════════════════
   LyricsFetcher — Talks to LRCLIB API for synced lyrics
   Free, no API key, community-driven timestamped lyrics.
   ═══════════════════════════════════════════════════════════════ */

import { LRCLIB_SEARCH, LRCLIB_GET, APP_NAME, APP_VERSION } from '../utils/constants.js';

/* ─── Request headers (LRCLIB requires identification) ────── */
const HEADERS = {
  'Lrclib-Client': `${APP_NAME}/${APP_VERSION}`,
};

/**
 * Search LRCLIB for songs matching a query string.
 * Returns an array of track objects with lyrics metadata.
 *
 * @param {string} query - e.g. "Tere Liye Atif Aslam"
 * @returns {Promise<Array>} Array of { id, trackName, artistName, albumName, duration, syncedLyrics, plainLyrics }
 */
export async function searchLyrics(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${LRCLIB_SEARCH}?q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { headers: HEADERS });

    if (response.status === 429) {
      // Rate limited — wait and retry once
      const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
      await sleep(retryAfter * 1000);
      const retryResponse = await fetch(url, { headers: HEADERS });
      if (!retryResponse.ok) return [];
      return await retryResponse.json();
    }

    if (!response.ok) {
      console.warn(`[LyricsFetcher] Search failed: ${response.status}`);
      return [];
    }

    const results = await response.json();

    // Sort: prefer songs with synced lyrics first
    return results.sort((a, b) => {
      const aHasSynced = a.syncedLyrics ? 1 : 0;
      const bHasSynced = b.syncedLyrics ? 1 : 0;
      return bHasSynced - aHasSynced;
    });
  } catch (err) {
    console.error('[LyricsFetcher] Search error:', err);
    return [];
  }
}

/**
 * Get lyrics for a specific track by name and artist.
 * Returns the full lyrics object including synced (LRC) and plain text.
 *
 * @param {string} trackName
 * @param {string} artistName
 * @param {string} [albumName]
 * @param {number} [duration] - in seconds
 * @returns {Promise<Object|null>}
 */
export async function getLyrics(trackName, artistName, albumName, duration) {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });

    if (albumName) params.set('album_name', albumName);
    if (duration) params.set('duration', Math.round(duration).toString());

    const url = `${LRCLIB_GET}?${params.toString()}`;
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      console.warn(`[LyricsFetcher] Get lyrics failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('[LyricsFetcher] Get lyrics error:', err);
    return null;
  }
}

/**
 * Convenience: search and return the best match with lyrics.
 * Tries the first result that has synced lyrics, falls back to plain.
 *
 * @param {string} query
 * @returns {Promise<Object|null>} Best matching track with lyrics, or null
 */
export async function findBestLyrics(query) {
  const results = await searchLyrics(query);
  if (!results.length) return null;

  // Prefer the first result with synced lyrics
  const synced = results.find((r) => r.syncedLyrics);
  if (synced) return synced;

  // Fall back to the first result with any lyrics
  const withLyrics = results.find((r) => r.plainLyrics);
  return withLyrics || results[0];
}

/* ─── Internal helpers ─────────────────────────────────────── */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
