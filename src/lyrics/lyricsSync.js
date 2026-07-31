/* ═══════════════════════════════════════════════════════════════
   LyricsSync — Tracks which lyric line is current during playback
   Binary search for efficiency, emits events on line changes.
   ═══════════════════════════════════════════════════════════════ */

import { emit } from '../utils/eventBus.js';

let lyrics = [];        // Parsed array of { time, text }
let currentIndex = -1;  // Index of the currently active line
let syncOffset = 0;     // User-adjustable offset in seconds

/**
 * Load a new set of parsed lyrics into the sync engine.
 * @param {Array<{time: number, text: string}>} parsedLyrics
 */
export function loadLyrics(parsedLyrics) {
  lyrics = parsedLyrics || [];
  currentIndex = -1;
  emit('lyrics:loaded', { count: lyrics.length });
}

/**
 * Set the sync offset (positive = lyrics appear later, negative = earlier).
 * @param {number} offsetSeconds
 */
export function setSyncOffset(offsetSeconds) {
  syncOffset = offsetSeconds;
  emit('lyrics:offset-changed', { offset: syncOffset });
}

/**
 * Get the current sync offset.
 * @returns {number}
 */
export function getSyncOffset() {
  return syncOffset;
}

/**
 * Update the sync engine with the current playback time.
 * Call this on every animation frame or at regular intervals.
 *
 * @param {number} currentTime - Current playback position in seconds
 */
export function update(currentTime) {
  if (lyrics.length === 0) return;

  const adjustedTime = currentTime + syncOffset;

  // Binary search for the active line
  const newIndex = findCurrentIndex(adjustedTime);

  // Only emit if the line actually changed
  if (newIndex !== currentIndex) {
    currentIndex = newIndex;

    const previous = currentIndex > 0 ? lyrics[currentIndex - 1] : null;
    const current = currentIndex >= 0 ? lyrics[currentIndex] : null;
    const upcoming = currentIndex < lyrics.length - 1 ? lyrics[currentIndex + 1] : null;

    emit('lyrics:line-changed', {
      index: currentIndex,
      previous,
      current,
      upcoming,
      total: lyrics.length,
    });
  }
}

/**
 * Reset the sync engine (e.g., when switching songs).
 */
export function reset() {
  lyrics = [];
  currentIndex = -1;
  syncOffset = 0;
}

/**
 * Get all loaded lyrics.
 * @returns {Array<{time: number, text: string}>}
 */
export function getAllLyrics() {
  return lyrics;
}

/**
 * Get the currently active line index.
 * @returns {number}
 */
export function getCurrentIndex() {
  return currentIndex;
}

/* ─── Binary search: find the last line whose time <= currentTime ── */
function findCurrentIndex(time) {
  if (lyrics.length === 0) return -1;

  // Before the first line
  if (time < lyrics[0].time) return -1;

  // After the last line
  if (time >= lyrics[lyrics.length - 1].time) return lyrics.length - 1;

  // Binary search
  let low = 0;
  let high = lyrics.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (lyrics[mid].time <= time) {
      // Check if next line is beyond current time
      if (mid + 1 < lyrics.length && lyrics[mid + 1].time > time) {
        return mid;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

export default { loadLyrics, setSyncOffset, getSyncOffset, update, reset, getAllLyrics, getCurrentIndex };
