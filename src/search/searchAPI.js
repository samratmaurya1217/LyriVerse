/* ═══════════════════════════════════════════════════════════════
   SearchAPI — Frontend search that talks to our backend
   
   All API calls go to our Express backend (/api/*), which handles
   Spotify auth and LRCLIB fetching server-side (no CORS issues).
   ═══════════════════════════════════════════════════════════════ */

export async function getTopTracks() {
  try {
    const res = await fetch('/api/spotify/top-tracks');
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.warn('[SearchAPI] Failed to get top tracks:', err.message);
    return [];
  }
}

/**
 * Search for songs using Spotify (via our backend).
 * Returns Spotify track results with album art, duration, etc.
 * 
 * @param {string} query - Search input (e.g., "Tere Liye Atif Aslam")
 * @returns {Promise<Array>} Array of track objects
 */
export async function searchSongs(query) {
  if (!query || query.trim().length < 2) return await getTopTracks();

  try {
    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.error) {
      console.warn('[SearchAPI] Spotify search error:', data.error);
      // Fallback to LRCLIB search if Spotify is not configured
      return await searchLRCLIBFallback(query);
    }

    return data.tracks || [];
  } catch (err) {
    console.warn('[SearchAPI] Backend unreachable, falling back to LRCLIB:', err.message);
    return await searchLRCLIBFallback(query);
  }
}

export async function getRecommendations(seedTrackId) {
  try {
    const res = await fetch(`/api/spotify/recommendations?seed_tracks=${seedTrackId}`);
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.warn('[SearchAPI] Failed to get recommendations:', err.message);
    return [];
  }
}

/**
 * Search for lyrics for a specific track.
 * Returns synced lyrics (timestamped) if available, otherwise plain with estimated timing.
 * 
 * @param {string} trackName
 * @param {string} artistName
 * @param {string} [albumName]
 * @param {number} [duration] - Song duration in seconds
 * @returns {Promise<Object>} { found, source, lines[], syncedLyrics, plainLyrics }
 */
export async function findLyrics(trackName, artistName, albumName, duration) {
  try {
    const params = new URLSearchParams({
      track: trackName,
      artist: artistName,
    });
    if (albumName) params.set('album', albumName);
    if (duration) params.set('duration', Math.round(duration).toString());

    const res = await fetch(`/api/lyrics/find?${params}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[SearchAPI] Lyrics fetch error:', err.message);
    return { found: false, lines: [], source: null };
  }
}

/**
 * Fallback: Search LRCLIB directly if Spotify backend is not available.
 * This is a degraded mode (no Spotify playback, but lyrics still work).
 */
async function searchLRCLIBFallback(query) {
  try {
    const res = await fetch(`/api/lyrics/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    // Map LRCLIB format to our unified format
    return (data.results || []).slice(0, 15).map((track) => ({
      id: track.id,
      uri: null, // No Spotify URI — can't play
      title: track.trackName || 'Unknown Title',
      artist: track.artistName || 'Unknown Artist',
      album: track.albumName || '',
      albumArt: '', // No album art from LRCLIB
      albumArtSmall: '',
      duration: track.duration || 0,
      durationMs: (track.duration || 0) * 1000,
      hasSyncedLyrics: !!track.syncedLyrics,
      hasPlainLyrics: !!track.plainLyrics,
      // Store lyrics directly in the result for fallback mode
      _syncedLyrics: track.syncedLyrics,
      _plainLyrics: track.plainLyrics,
    }));
  } catch (err) {
    console.error('[SearchAPI] LRCLIB fallback failed:', err.message);
    return [];
  }
}

export default { searchSongs, findLyrics, getTopTracks, getRecommendations };
