/* ═══════════════════════════════════════════════════════════════
   YouTubePlayer — Hidden YouTube IFrame API wrapper
   Plays songs via YouTube with only audio exposed to the user.
   The video iframe is hidden off-screen (1x1px).
   ═══════════════════════════════════════════════════════════════ */

import { emit } from '../utils/eventBus.js';
import { YT_IFRAME_API_URL } from '../utils/constants.js';

let player = null;
let isApiReady = false;
let pendingVideoId = null;
let updateInterval = null;

/* ─── YouTube Player States (from YT.PlayerState) ─────────── */
const STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

/**
 * Initialize the YouTube IFrame API.
 * Loads the API script and sets up the hidden player.
 */
export function init() {
  if (isApiReady) return;

  // YouTube's API calls this global function when ready
  window.onYouTubeIframeAPIReady = () => {
    isApiReady = true;
    createPlayer();
    emit('youtube:api-ready');
  };

  // Load the IFrame API script
  const tag = document.createElement('script');
  tag.src = YT_IFRAME_API_URL;
  document.head.appendChild(tag);
}

/**
 * Create the hidden YT.Player instance.
 */
function createPlayer() {
  player = new window.YT.Player('youtube-player', {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3, // hide annotations
      origin: window.location.origin,
    },
    events: {
      onReady: handleReady,
      onStateChange: handleStateChange,
      onError: handleError,
    },
  });
}

/* ─── Event Handlers ───────────────────────────────────────── */
function handleReady() {
  emit('youtube:ready');

  // If a video was requested before the player was ready, load it now
  if (pendingVideoId) {
    loadVideo(pendingVideoId);
    pendingVideoId = null;
  }
}

function handleStateChange(event) {
  const state = event.data;

  switch (state) {
    case STATE.PLAYING:
      emit('player:playing');
      startTimeUpdates();
      break;

    case STATE.PAUSED:
      emit('player:paused');
      stopTimeUpdates();
      break;

    case STATE.ENDED:
      emit('player:ended');
      stopTimeUpdates();
      break;

    case STATE.BUFFERING:
      emit('player:buffering');
      break;
  }
}

function handleError(event) {
  const errorCodes = {
    2: 'Invalid video ID',
    5: 'HTML5 player error',
    100: 'Video not found or removed',
    101: 'Video not allowed for embedded playback',
    150: 'Video not allowed for embedded playback',
  };

  const message = errorCodes[event.data] || `Unknown error (${event.data})`;
  console.error(`[YouTubePlayer] Error: ${message}`);
  emit('player:error', { code: event.data, message });
}

/* ─── Time Update Loop ─────────────────────────────────────── */
function startTimeUpdates() {
  stopTimeUpdates();
  updateInterval = setInterval(() => {
    if (!player) return;
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    emit('player:time-update', { currentTime, duration });
  }, 100); // 10 updates per second for smooth sync
}

function stopTimeUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

/* ─── Public API ───────────────────────────────────────────── */

/**
 * Load and play a YouTube video by ID.
 * @param {string} videoId - YouTube video ID (e.g., "dQw4w9WgXcQ")
 */
export function loadVideo(videoId) {
  if (!player || !isApiReady) {
    pendingVideoId = videoId;
    return;
  }

  player.loadVideoById(videoId);
  emit('player:loading', { videoId });
}

/**
 * Play the current video.
 */
export function play() {
  if (player) player.playVideo();
}

/**
 * Pause the current video.
 */
export function pause() {
  if (player) player.pauseVideo();
}

/**
 * Toggle play/pause.
 */
export function togglePlayPause() {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === STATE.PLAYING) {
    pause();
  } else {
    play();
  }
}

/**
 * Seek to a specific time in seconds.
 * @param {number} seconds
 */
export function seekTo(seconds) {
  if (player) player.seekTo(seconds, true);
}

/**
 * Set volume (0-100).
 * @param {number} volume
 */
export function setVolume(volume) {
  if (player) player.setVolume(volume);
}

/**
 * Get current playback time in seconds.
 * @returns {number}
 */
export function getCurrentTime() {
  return player ? player.getCurrentTime() : 0;
}

/**
 * Get total duration in seconds.
 * @returns {number}
 */
export function getDuration() {
  return player ? player.getDuration() : 0;
}

/**
 * Check if the player is currently playing.
 * @returns {boolean}
 */
export function isPlaying() {
  return player ? player.getPlayerState() === STATE.PLAYING : false;
}

/**
 * Destroy the player instance and clean up.
 */
export function destroy() {
  stopTimeUpdates();
  if (player) {
    player.destroy();
    player = null;
  }
}

export default {
  init, loadVideo, play, pause, togglePlayPause,
  seekTo, setVolume, getCurrentTime, getDuration,
  isPlaying, destroy,
};
