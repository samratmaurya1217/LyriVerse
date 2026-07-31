/* ═══════════════════════════════════════════════════════════════
   Lyrics Aggregator — Fetches lyrics from MULTIPLE sources
   
   Sources (tried in order of quality):
   1. LRCLIB — Best for synced (timestamped) lyrics, free, no key
   2. Spotify Lyrics — If available through the Spotify API
   3. Heuristic Timing — If only plain lyrics, we estimate timings
   
   The aggregator tries each source and returns the best result.
   ═══════════════════════════════════════════════════════════════ */

const LRCLIB_BASE = 'https://lrclib.net';
const APP_USER_AGENT = 'LyriVerse/1.0.0 (https://lyriverse.app)';

/**
 * Search for synced lyrics across all available sources.
 * Returns the best available lyrics with timing information.
 * 
 * @param {string} trackName - Song title
 * @param {string} artistName - Artist name
 * @param {string} [albumName] - Album name (improves accuracy)
 * @param {number} [durationSec] - Song duration in seconds
 * @returns {Promise<Object>} { syncedLyrics, plainLyrics, source, lines[] }
 */
export async function findLyrics(trackName, artistName, albumName, durationSec) {
  console.log(`[LyricsAggregator] Searching: "${trackName}" by ${artistName}`);

  // ── Source 1: LRCLIB (synced lyrics) ──
  const lrcResult = await tryLRCLIB(trackName, artistName, albumName, durationSec);
  if (lrcResult && lrcResult.syncedLyrics) {
    console.log('[LyricsAggregator] Found synced lyrics from LRCLIB');
    return {
      syncedLyrics: lrcResult.syncedLyrics,
      plainLyrics: lrcResult.plainLyrics,
      source: 'lrclib',
      lines: parseLRC(lrcResult.syncedLyrics),
    };
  }

  // ── Source 2: LRCLIB search (broader match) ──
  const lrcSearchResult = await tryLRCLIBSearch(trackName, artistName);
  if (lrcSearchResult && lrcSearchResult.syncedLyrics) {
    console.log('[LyricsAggregator] Found synced lyrics from LRCLIB search');
    return {
      syncedLyrics: lrcSearchResult.syncedLyrics,
      plainLyrics: lrcSearchResult.plainLyrics,
      source: 'lrclib-search',
      lines: parseLRC(lrcSearchResult.syncedLyrics),
    };
  }

  // ── Source 3: Plain lyrics with heuristic timing ──
  const plainLyrics = lrcResult?.plainLyrics || lrcSearchResult?.plainLyrics;
  if (plainLyrics) {
    console.log('[LyricsAggregator] Using plain lyrics with heuristic timing');
    const lines = estimateTimingsHeuristic(plainLyrics, durationSec || 240);
    return {
      syncedLyrics: null,
      plainLyrics,
      source: 'heuristic',
      lines,
    };
  }

  console.log('[LyricsAggregator] No lyrics found from any source');
  return null;
}

/**
 * Search LRCLIB for lyrics across multiple tracks.
 * Returns an array of results for the search UI.
 */
export async function searchLyrics(query) {
  try {
    const url = `${LRCLIB_BASE}/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT },
    });

    if (!response.ok) return [];
    const results = await response.json();

    // Sort: synced lyrics first
    return results.sort((a, b) => {
      const aScore = a.syncedLyrics ? 2 : a.plainLyrics ? 1 : 0;
      const bScore = b.syncedLyrics ? 2 : b.plainLyrics ? 1 : 0;
      return bScore - aScore;
    });
  } catch (err) {
    console.error('[LyricsAggregator] LRCLIB search error:', err.message);
    return [];
  }
}


/* ═══════════════════════════════════════════════════════
   LRCLIB — Primary Source
   ═══════════════════════════════════════════════════════ */

async function tryLRCLIB(trackName, artistName, albumName, durationSec) {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    if (albumName) params.set('album_name', albumName);
    if (durationSec) params.set('duration', Math.round(durationSec).toString());

    const url = `${LRCLIB_BASE}/api/get?${params}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('[LRCLIB] Direct get failed:', err.message);
    return null;
  }
}

async function tryLRCLIBSearch(trackName, artistName) {
  try {
    const query = `${trackName} ${artistName}`;
    const url = `${LRCLIB_BASE}/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT },
    });

    if (!response.ok) return null;
    const results = await response.json();

    // Return the first result with synced lyrics
    const synced = results.find((r) => r.syncedLyrics);
    if (synced) return synced;

    // Fall back to any result with lyrics
    return results.find((r) => r.plainLyrics) || null;
  } catch (err) {
    console.warn('[LRCLIB] Search failed:', err.message);
    return null;
  }
}


/* ═══════════════════════════════════════════════════════
   LRC PARSER — Timestamps → Array
   ═══════════════════════════════════════════════════════ */

function parseLRC(lrcString) {
  if (!lrcString) return [];

  const lines = lrcString.split('\n');
  const result = [];
  const regex = /\[(\d{1,3}):(\d{2})(?:[.:])(\d{2,3})?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^\[[a-z]{2}:/.test(trimmed)) continue;

    const timestamps = [];
    let match;
    regex.lastIndex = 0;

    while ((match = regex.exec(trimmed)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        ms = match[3].length === 3
          ? parseInt(match[3], 10) / 1000
          : parseInt(match[3], 10) / 100;
      }
      timestamps.push(mins * 60 + secs + ms);
    }

    if (timestamps.length === 0) continue;

    const text = trimmed.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{2,3})?\]/g, '').trim();

    for (const time of timestamps) {
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}


/* ═══════════════════════════════════════════════════════
   HEURISTIC TIMING — Smart estimation for plain lyrics
   
   Uses syllable counting and natural phrasing to create
   more human-feeling timings than even distribution.
   ═══════════════════════════════════════════════════════ */

function estimateTimingsHeuristic(plainLyrics, totalDuration) {
  const lines = plainLyrics
    .split('\n')
    .map((l) => l.trim());

  // Don't filter empty lines — they represent musical breaks
  if (lines.length === 0) return [];

  const startPad = 8;   // seconds before first lyric
  const endPad = 12;    // seconds after last lyric
  const usable = Math.max(totalDuration - startPad - endPad, lines.length * 2);

  // Calculate "weight" for each line based on syllable count
  const weights = lines.map((line) => {
    if (!line) return 1.5; // empty line = musical break (gets extra time)
    const syllables = countSyllables(line);
    return Math.max(syllables * 0.4, 1); // minimum weight of 1
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const result = [];
  let currentTime = startPad;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      result.push({
        time: Math.round(currentTime * 100) / 100,
        text: lines[i],
      });
    }
    currentTime += (weights[i] / totalWeight) * usable;
  }

  return result;
}

/**
 * Rough syllable counter for Hindi/English text.
 * Not perfect, but good enough for timing heuristics.
 */
function countSyllables(text) {
  if (!text) return 1;
  const cleaned = text.toLowerCase().replace(/[^a-z\s]/g, '');
  const words = cleaned.split(/\s+/).filter(Boolean);

  let total = 0;
  for (const word of words) {
    // Count vowel groups as syllables
    const vowelGroups = word.match(/[aeiouy]+/g);
    total += vowelGroups ? vowelGroups.length : 1;
  }

  // For Hindi romanized text, also count based on word length
  const hindiEstimate = text.split(/\s+/).filter(Boolean).length;
  return Math.max(total, hindiEstimate);
}
