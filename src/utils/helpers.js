/* ═══════════════════════════════════════════════════════════════
   Helpers — Utility functions used across the app
   Debounce, throttle, math helpers, formatting, mood detection.
   ═══════════════════════════════════════════════════════════════ */

import { MOOD_KEYWORDS } from './constants.js';

/**
 * Debounce a function — waits until the caller stops calling for `delay` ms.
 * Perfect for search input (don't fire API call on every keystroke).
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function — fires at most once every `limit` ms.
 * Good for scroll handlers, resize, progress updates.
 */
export function throttle(fn, limit = 100) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Linear interpolation between two values.
 * lerp(0, 100, 0.5) → 50
 */
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random number in a range.
 */
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer in a range (inclusive).
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array.
 */
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Format seconds into mm:ss string.
 * formatTime(125) → "2:05"
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Detect the mood/vibe of a song based on its title, artist, and lyrics.
 * Returns one of: 'romantic', 'sad', 'happy', 'peaceful', 'energetic', 'devotional'
 * Falls back to 'romantic' as the most universally pleasant default.
 */
export function detectMood(title = '', artist = '', lyrics = '') {
  const combined = `${title} ${artist} ${lyrics}`.toLowerCase();
  const scores = {};

  // Count keyword hits for each mood
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    scores[mood] = 0;
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        scores[mood] += 1;
      }
    }
  }

  // Find the mood with the highest score
  let bestMood = 'romantic'; // warm default
  let bestScore = 0;

  for (const [mood, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood;
    }
  }

  return bestMood;
}

/**
 * Apply a mood theme to the page (sets CSS variables via data attribute).
 */
export function applyMood(mood) {
  document.body.setAttribute('data-mood', mood);
}

/**
 * Simple hash function for generating consistent values from strings.
 * Used for deterministic randomness (same song → same visual seed).
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Check if the device is likely mobile.
 */
export function isMobile() {
  return window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
}

/**
 * Show a toast notification.
 */
export function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

/**
 * Safely get a value from localStorage.
 */
export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely set a value in localStorage.
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}
