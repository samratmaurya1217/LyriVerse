/* ═══════════════════════════════════════════════════════════════
   PlayerControls — Bottom bar UI for playback control
   Play/pause, seek, volume, theme/mode toggles, sync offset.
   Now powered by Spotify Web Playback SDK.
   ═══════════════════════════════════════════════════════════════ */

import { on, emit } from '../utils/eventBus.js';
import { formatTime, showToast, storageGet, storageSet } from '../utils/helpers.js';
import { DEFAULT_VOLUME, SYNC_OFFSET_STEP, MAX_SYNC_OFFSET, LS_KEYS, ANIMATION_MODES } from '../utils/constants.js';
import * as spotifyPlayer from '../audio/spotifyPlayer.js';
import { setSyncOffset, getSyncOffset } from '../lyrics/lyricsSync.js';

/* ─── DOM References ───────────────────────────────────────── */
const controlsEl = document.getElementById('player-controls');
const songTitleEl = document.getElementById('player-song-title');
const artistEl = document.getElementById('player-artist');
const timeCurrent = document.getElementById('player-time-current');
const timeTotal = document.getElementById('player-time-total');
const progressBar = document.getElementById('player-progress');
const progressFill = document.getElementById('player-progress-fill');
const btnPlayPause = document.getElementById('btn-play-pause');
const iconPlay = btnPlayPause.querySelector('.icon-play');
const iconPause = btnPlayPause.querySelector('.icon-pause');
const btnBack = document.getElementById('btn-back');
const btnTheme = document.getElementById('btn-theme');
const btnMode = document.getElementById('btn-mode');
const btnVolume = document.getElementById('btn-volume');
const volumeSlider = document.getElementById('volume-slider');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnSyncMinus = document.getElementById('btn-sync-minus');
const btnSyncPlus = document.getElementById('btn-sync-plus');
const syncValueEl = document.getElementById('sync-value');

let isPlaying = false;
let currentModeIndex = 0;
let cachedDuration = 0;

/**
 * Initialize player controls: event listeners + event bus subscriptions.
 */
export function init() {
  // ── Button clicks ──
  btnPlayPause.addEventListener('click', () => spotifyPlayer.togglePlayPause());

  btnBack.addEventListener('click', () => emit('ui:back-to-search'));

  btnTheme.addEventListener('click', () => {
    emit('ui:cycle-theme');
    showToast('Theme changed ✨');
  });

  btnMode.addEventListener('click', () => {
    currentModeIndex = (currentModeIndex + 1) % ANIMATION_MODES.length;
    const mode = ANIMATION_MODES[currentModeIndex];
    emit('ui:change-mode', { mode });
    showToast(`Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
  });

  btnVolume.addEventListener('click', () => {
    const isMuted = volumeSlider.value === '0';
    const newVol = isMuted ? storageGet(LS_KEYS.VOLUME, DEFAULT_VOLUME) : 0;
    volumeSlider.value = newVol;
    spotifyPlayer.setVolume(newVol);
    updateVolumeIcon(newVol);
  });

  volumeSlider.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    spotifyPlayer.setVolume(vol);
    storageSet(LS_KEYS.VOLUME, vol);
    updateVolumeIcon(vol);
  });

  btnFullscreen.addEventListener('click', toggleFullscreen);

  // ── Sync offset ──
  btnSyncMinus.addEventListener('click', () => adjustOffset(-SYNC_OFFSET_STEP));
  btnSyncPlus.addEventListener('click', () => adjustOffset(SYNC_OFFSET_STEP));

  // ── Progress bar seek ──
  progressBar.addEventListener('click', handleSeek);

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', handleKeyboard);

  // ── Event bus subscriptions ──
  on('player:playing', () => setPlayState(true));
  on('player:paused', () => setPlayState(false));
  on('player:ended', () => setPlayState(false));

  on('player:time-update', ({ currentTime, duration }) => {
    cachedDuration = duration;
    updateProgress(currentTime, duration);
  });

  // Restore saved volume
  const savedVol = storageGet(LS_KEYS.VOLUME, DEFAULT_VOLUME);
  volumeSlider.value = savedVol;
  updateVolumeIcon(savedVol);
}

/**
 * Show the player controls bar.
 */
export function show() {
  controlsEl.classList.remove('hidden');
}

/**
 * Hide the player controls bar.
 */
export function hide() {
  controlsEl.classList.add('hidden');
}

/**
 * Update the displayed song info.
 */
export function setSongInfo(title, artist) {
  songTitleEl.textContent = title || '—';
  artistEl.textContent = artist || '—';
  document.title = `${title} — ${artist} | LyriVerse`;
}

/* ─── Internal Helpers ─────────────────────────────────────── */

function setPlayState(playing) {
  isPlaying = playing;
  iconPlay.classList.toggle('hidden', playing);
  iconPause.classList.toggle('hidden', !playing);
}

function updateProgress(currentTime, duration) {
  if (!duration) return;
  const pct = (currentTime / duration) * 100;
  progressFill.style.width = `${pct}%`;
  timeCurrent.textContent = formatTime(currentTime);
  timeTotal.textContent = formatTime(duration);
}

function handleSeek(e) {
  const rect = progressBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  if (cachedDuration) {
    spotifyPlayer.seekTo(pct * cachedDuration);
  }
}

function adjustOffset(delta) {
  const current = getSyncOffset();
  const newOffset = Math.max(-MAX_SYNC_OFFSET, Math.min(MAX_SYNC_OFFSET, current + delta));
  setSyncOffset(newOffset);
  syncValueEl.textContent = `${newOffset >= 0 ? '+' : ''}${newOffset.toFixed(1)}s`;
}

function updateVolumeIcon(vol) {
  const iconOn = btnVolume.querySelector('.icon-vol-on');
  const iconOff = btnVolume.querySelector('.icon-vol-off');
  iconOn.classList.toggle('hidden', vol === 0);
  iconOff.classList.toggle('hidden', vol > 0);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return;

  switch (e.key) {
    case ' ':
      e.preventDefault();
      spotifyPlayer.togglePlayPause();
      break;
    case 'ArrowRight':
      spotifyPlayer.getCurrentTime().then((t) => spotifyPlayer.seekTo(t + 5));
      break;
    case 'ArrowLeft':
      spotifyPlayer.getCurrentTime().then((t) => spotifyPlayer.seekTo(Math.max(0, t - 5)));
      break;
    case '+':
    case '=':
      adjustOffset(SYNC_OFFSET_STEP);
      break;
    case '-':
    case '_':
      adjustOffset(-SYNC_OFFSET_STEP);
      break;
    case 't':
    case 'T':
      emit('ui:cycle-theme');
      showToast('Theme changed ✨');
      break;
    case 'm':
    case 'M':
      currentModeIndex = (currentModeIndex + 1) % ANIMATION_MODES.length;
      emit('ui:change-mode', { mode: ANIMATION_MODES[currentModeIndex] });
      showToast(`Mode: ${ANIMATION_MODES[currentModeIndex]}`);
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 'Escape':
      emit('ui:back-to-search');
      break;
  }
}

export default { init, show, hide, setSongInfo };
