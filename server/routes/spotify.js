/* ═══════════════════════════════════════════════════════════════
   Spotify Routes — Backend API endpoints for Spotify integration
   
   All Spotify API calls go through here so the frontend never
   touches client secrets. The frontend only gets access tokens.
   ═══════════════════════════════════════════════════════════════ */

import { Router } from 'express';
import { getAccessToken, spotifyFetch } from '../services/spotifyAuth.js';

const router = Router();

/**
 * GET /api/spotify/token
 * Returns a fresh Spotify access token for the Web Playback SDK.
 * The frontend needs this to initialize the Spotify player.
 */
router.get('/token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error('[Spotify] Token error:', err.message);
    res.status(500).json({
      error: 'Failed to get Spotify token',
      message: err.message,
      hint: 'Make sure your .env file has valid Spotify credentials. Run "node server/getRefreshToken.js" to set up.',
    });
  }
});

/**
 * GET /api/spotify/search?q=query&type=track&limit=10
 * Proxies Spotify search requests.
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'track', limit = 10 } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing search query' });

    const data = await spotifyFetch(
      `v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}&market=IN`
    );

    if (data.error) {
      console.error('[Spotify] Search error:', data.error.message || data.error);
      return res.status(400).json({ error: data.error.message || 'Spotify search failed' });
    }
    
    console.log('[Spotify] Search response:', JSON.stringify(data).substring(0, 200));

    // Simplify the response for the frontend
    const tracks = (data.tracks?.items || []).map((track) => ({
      id: track.id,
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      artistId: track.artists[0]?.id,
      album: track.album?.name || '',
      albumArt: track.album?.images?.[0]?.url || '',
      albumArtSmall: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '',
      duration: Math.round(track.duration_ms / 1000),
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
      popularity: track.popularity,
    }));

    res.json({ tracks });
  } catch (err) {
    console.error('[Spotify] Search error:', err.message);
    res.status(500).json({ error: 'Spotify search failed' });
  }
});

/**
 * GET /api/spotify/top-tracks
 * Fetches default recommendations (New Releases or a popular playlist).
 */
router.get('/top-tracks', async (req, res) => {
  try {
    // We'll fetch popular tracks by searching for the current year
    const data = await spotifyFetch('v1/search?q=year:2024&type=track&limit=15');
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const tracks = (data.tracks?.items || []).map((track) => {
      if (!track) return null;
      return {
        id: track.id,
        uri: track.uri,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        artistId: track.artists[0]?.id,
        album: track.album?.name || '',
        albumArt: track.album?.images?.[0]?.url || '',
        albumArtSmall: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '',
        duration: Math.round(track.duration_ms / 1000),
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
        popularity: track.popularity,
      };
    }).filter(Boolean);

    res.json({ tracks });
  } catch (err) {
    console.error('[Spotify] Top tracks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

/**
 * GET /api/spotify/recommendations?seed_tracks=ID
 * Fetches similar songs to auto-play.
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { seed_tracks } = req.query;
    if (!seed_tracks) return res.status(400).json({ error: 'Missing seed_tracks' });

    const data = await spotifyFetch(`v1/recommendations?seed_tracks=${seed_tracks}&limit=5`);
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const tracks = (data.tracks || []).map((track) => ({
      id: track.id,
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      artistId: track.artists[0]?.id,
      album: track.album?.name || '',
      albumArt: track.album?.images?.[0]?.url || '',
      albumArtSmall: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '',
      duration: Math.round(track.duration_ms / 1000),
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
      popularity: track.popularity,
    }));

    res.json({ tracks });
  } catch (err) {
    console.error('[Spotify] Recommendations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * GET /api/spotify/track/:id
 * Get detailed track info.
 */
router.get('/track/:id', async (req, res) => {
  try {
    const data = await spotifyFetch(`v1/tracks/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('[Spotify] Track error:', err.message);
    res.status(500).json({ error: 'Failed to get track info' });
  }
});

/**
 * GET /api/spotify/me/top-tracks
 * Get user's top tracks (for homepage recommendations).
 */
router.get('/me/top-tracks', async (req, res) => {
  try {
    const data = await spotifyFetch(
      'v1/me/top/tracks?time_range=medium_term&limit=10'
    );
    const tracks = (data.items || []).map((track) => ({
      id: track.id,
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album?.name || '',
      albumArt: track.album?.images?.[0]?.url || '',
      albumArtSmall: track.album?.images?.[2]?.url || '',
      duration: Math.round(track.duration_ms / 1000),
    }));
    res.json({ tracks });
  } catch (err) {
    console.error('[Spotify] Top tracks error:', err.message);
    res.status(500).json({ error: 'Failed to get top tracks' });
  }
});

export default router;
