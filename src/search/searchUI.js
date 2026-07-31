/* ═══════════════════════════════════════════════════════════════
   SearchUI — Search bar, results display, song selection
   Shows Spotify results with album art, or LRCLIB fallback results.
   ═══════════════════════════════════════════════════════════════ */

import { emit } from '../utils/eventBus.js';
import { debounce, formatTime } from '../utils/helpers.js';
import { searchSongs } from '../search/searchAPI.js';

/* ─── DOM References ───────────────────────────────────────── */
const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchSpinner = document.getElementById('search-spinner');
const searchResults = document.getElementById('search-results');

/**
 * Initialize search UI event listeners.
 */
export function init() {
  const debouncedSearch = debounce(handleSearch, 400);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      // Fetch top tracks if empty
      showSpinner(true);
      debouncedSearch('');
      return;
    }
    showSpinner(true);
    debouncedSearch(query);
  });
  
  // Initial load
  handleSearch('');

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        showSpinner(true);
        handleSearch(query);
      }
    }
  });

  searchInput.focus();
}

/**
 * Show the search overlay.
 */
export function show() {
  searchOverlay.classList.add('visible');
  setTimeout(() => searchInput.focus(), 100);
}

/**
 * Hide the search overlay.
 */
export function hide() {
  searchOverlay.classList.remove('visible');
}

/* ─── Search Handler ───────────────────────────────────────── */
async function handleSearch(query) {
  try {
    const results = await searchSongs(query);
    renderResults(results);
  } catch (err) {
    console.error('[SearchUI] Search error:', err);
    renderNoResults('Something went wrong. Please try again.');
  } finally {
    showSpinner(false);
  }
}

/* ─── Render Results ───────────────────────────────────────── */
function renderResults(results) {
  searchResults.innerHTML = '';

  if (results.length === 0) {
    renderNoResults('No songs found. Try a different search.');
    return;
  }

  for (const song of results) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const durationStr = song.duration ? formatTime(song.duration) : '';
    const hasSpotify = !!song.uri;

    // Album art or fallback icon
    const artHtml = song.albumArtSmall
      ? `<img class="result-art" src="${song.albumArtSmall}" alt="" loading="lazy" />`
      : `<div class="result-icon">🎵</div>`;

    // Badge
    let badgeClass = 'spotify';
    let badgeText = '♫ Spotify';
    if (!hasSpotify) {
      badgeClass = song.hasSyncedLyrics ? 'synced' : 'plain';
      badgeText = song.hasSyncedLyrics ? 'Synced' : 'Lyrics';
    }

    item.innerHTML = `
      ${artHtml}
      <div class="result-info">
        <div class="result-title">${escapeHtml(song.title)}</div>
        <div class="result-artist">${escapeHtml(song.artist)}${song.album ? ` · ${escapeHtml(song.album)}` : ''}${durationStr ? ` · ${durationStr}` : ''}</div>
      </div>
      <span class="result-badge ${badgeClass}">${badgeText}</span>
    `;

    item.addEventListener('click', () => emit('song:selected', song));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        emit('song:selected', song);
      }
    });

    searchResults.appendChild(item);
  }
}

function renderNoResults(message) {
  searchResults.innerHTML = `<div class="search-no-results">${message}</div>`;
}

function clearResults() {
  searchResults.innerHTML = '';
}

/* ─── Helpers ──────────────────────────────────────────────── */
function showSpinner(show) {
  searchSpinner.classList.toggle('active', show);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default { init, show, hide };
