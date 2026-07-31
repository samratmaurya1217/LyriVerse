/* ═══════════════════════════════════════════════════════════════
   Spotify Player — Web Playback SDK integration
   
   Uses Spotify's Web Playback SDK for high-quality audio playback.
   Requires Spotify Premium. Gets token from our backend (/api/spotify/token).
   
   The SDK creates a virtual "device" in your Spotify account that
   plays music directly in the browser — no hidden iframes needed.
   ═══════════════════════════════════════════════════════════════ */

import { emit } from '../utils/eventBus.js';

let player = null;
let deviceId = null;
let accessToken = null;
let updateInterval = null;
let isReady = false;

/**
 * Initialize the Spotify Web Playback SDK.
 * Loads the SDK script and creates a player instance.
 */
export async function init() {
  // Fetch access token from our backend
  try {
    const res = await fetch('/api/spotify/token');
    const data = await res.json();

    if (data.error) {
      console.warn('[SpotifyPlayer] Backend token error:', data.message);
      emit('player:auth-error', { message: data.hint || data.message });
      return;
    }

    accessToken = data.access_token;
  } catch (err) {
    console.warn('[SpotifyPlayer] Cannot reach backend:', err.message);
    emit('player:auth-error', {
      message: 'Backend server not running. Start it with: npm run dev:backend',
    });
    return;
  }

  // Wait for the SDK to be ready
  window.onSpotifyWebPlaybackSDKReady = () => {
    createPlayer();
  };

  // Load the Spotify Web Playback SDK script
  await loadSDKScript();
}

/**
 * Load the Spotify SDK script tag.
 */
function loadSDKScript() {
  return new Promise((resolve) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

/**
 * Create the Spotify player instance.
 */
function createPlayer() {
  player = new window.Spotify.Player({
    name: 'LyriVerse Player',
    getOAuthToken: async (cb) => {
      // Refresh the token from our backend each time Spotify asks
      try {
        const res = await fetch('/api/spotify/token');
        const data = await res.json();
        if (data.access_token) {
          accessToken = data.access_token;
          cb(data.access_token);
        }
      } catch (err) {
        console.error('[SpotifyPlayer] Token refresh failed:', err);
        cb(accessToken); // Use cached token as fallback
      }
    },
    volume: 0.8,
  });

  /* ── Player Events ── */
  player.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    isReady = true;
    console.log('[SpotifyPlayer] Ready with device ID:', device_id);
    emit('player:ready', { deviceId: device_id });
  });

  player.addListener('not_ready', ({ device_id }) => {
    console.warn('[SpotifyPlayer] Device went offline:', device_id);
    isReady = false;
  });

  let lastTrackId = null;

  player.addListener('player_state_changed', (state) => {
    if (!state) return;

    const { paused, position, duration, track_window } = state;
    const currentTrack = track_window?.current_track;
    
    // Detect track end
    if (paused && position === 0 && lastTrackId && (!currentTrack || currentTrack.id !== lastTrackId)) {
      emit('player:ended');
    }
    
    if (currentTrack) lastTrackId = currentTrack.id;

    if (paused) {
      emit('player:paused');
      stopTimeUpdates();
    } else {
      emit('player:playing', {
        track: currentTrack ? {
          id: currentTrack.id,
          title: currentTrack.name,
          artist: currentTrack.artists.map((a) => a.name).join(', '),
          album: currentTrack.album.name,
          albumArt: currentTrack.album.images[0]?.url,
        } : null,
      });
      startTimeUpdates();
    }

    emit('player:state', { paused, position, duration });
  });

  player.addListener('initialization_error', ({ message }) => {
    console.error('[SpotifyPlayer] Init error:', message);
    emit('player:error', { message: `Spotify init failed: ${message}` });
  });

  player.addListener('authentication_error', ({ message }) => {
    console.error('[SpotifyPlayer] Auth error:', message);
    emit('player:auth-error', { message });
  });

  player.addListener('account_error', ({ message }) => {
    console.error('[SpotifyPlayer] Account error:', message);
    emit('player:error', { message: 'Spotify Premium is required for playback.' });
  });

  player.addListener('playback_error', ({ message }) => {
    console.error('[SpotifyPlayer] Playback error:', message);
    emit('player:error', { message });
  });

  // Connect the player
  player.connect().then((success) => {
    if (success) {
      console.log('[SpotifyPlayer] Connected to Spotify');
    } else {
      console.error('[SpotifyPlayer] Failed to connect');
    }
  });
}

/* ─── Time Update Loop ─────────────────────────────────────── */
function startTimeUpdates() {
  stopTimeUpdates();
  updateInterval = setInterval(async () => {
    if (!player) return;
    const state = await player.getCurrentState();
    if (!state) return;

    emit('player:time-update', {
      currentTime: state.position / 1000,      // Convert ms → seconds
      duration: state.duration / 1000,
    });
  }, 100); // 10 updates/sec for smooth lyrics sync
}

function stopTimeUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

/* ─── Public API ───────────────────────────────────────────── */

/**
 * Play a track by its Spotify URI (e.g., "spotify:track:xxxxx").
 * @param {string} spotifyUri - Spotify URI
 */
export async function playTrack(spotifyUri) {
  if (!deviceId || !accessToken) {
    console.error('[SpotifyPlayer] Not ready to play');
    return;
  }

  try {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [spotifyUri],
      }),
    });
    emit('player:loading', { uri: spotifyUri });
  } catch (err) {
    console.error('[SpotifyPlayer] Play error:', err);
    emit('player:error', { message: 'Failed to start playback' });
  }
}

/**
 * Resume playback.
 */
export function play() {
  if (player) player.resume();
}

/**
 * Pause playback.
 */
export function pause() {
  if (player) player.pause();
}

/**
 * Toggle play/pause.
 */
export function togglePlayPause() {
  if (player) player.togglePlay();
}

/**
 * Seek to a position in seconds.
 * @param {number} seconds
 */
export function seekTo(seconds) {
  if (player) player.seek(seconds * 1000); // SDK uses milliseconds
}

/**
 * Set volume (0-100).
 * @param {number} volume
 */
export function setVolume(volume) {
  if (player) player.setVolume(volume / 100);
}

/**
 * Get current playback time in seconds.
 * @returns {Promise<number>}
 */
export async function getCurrentTime() {
  if (!player) return 0;
  const state = await player.getCurrentState();
  return state ? state.position / 1000 : 0;
}

/**
 * Get total duration in seconds.
 * @returns {Promise<number>}
 */
export async function getDuration() {
  if (!player) return 0;
  const state = await player.getCurrentState();
  return state ? state.duration / 1000 : 0;
}

/**
 * Check if the player is currently playing.
 * @returns {Promise<boolean>}
 */
export async function isPlaying() {
  if (!player) return false;
  const state = await player.getCurrentState();
  return state ? !state.paused : false;
}

/**
 * Check if the player is ready.
 * @returns {boolean}
 */
export function isPlayerReady() {
  return isReady;
}

/**
 * Destroy the player instance and clean up.
 */
export function destroy() {
  stopTimeUpdates();
  if (player) {
    player.disconnect();
    player = null;
  }
}

export default {
  init, playTrack, play, pause, togglePlayPause,
  seekTo, setVolume, getCurrentTime, getDuration,
  isPlaying, isPlayerReady, destroy,
};
