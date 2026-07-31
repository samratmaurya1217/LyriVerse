/* ═══════════════════════════════════════════════════════════════
   LyriVerse — Main Application Entry Point
   
   Orchestrates: Search → Spotify Play → Lyrics Sync → 3D Visuals
   
   Architecture:
   • Frontend ← /api/* → Express Backend ← → Spotify API / LRCLIB
   • Spotify Web Playback SDK for audio (Premium required)
   • Three.js + particles for immersive 3D lyrics visualization
   ═══════════════════════════════════════════════════════════════ */

import './style.css';

import { on, emit } from './utils/eventBus.js';
import { detectMood, applyMood, showToast, storageGet } from './utils/helpers.js';
import { parseLRC, estimateTimings, lyricsToPlainText } from './lyrics/lrcParser.js';
import { loadLyrics, update as updateLyricsSync } from './lyrics/lyricsSync.js';
import { findLyrics } from './search/searchAPI.js';
import * as spotifyPlayer from './audio/spotifyPlayer.js';
import * as searchUI from './search/searchUI.js';
import * as playerControls from './audio/playerControls.js';
import * as sceneSetup from './visuals/sceneSetup.js';
import * as particles from './visuals/particles.js';
import * as backgrounds from './visuals/backgrounds.js';
import * as lyrics3D from './visuals/lyrics3D.js';
import { LS_KEYS, DEFAULT_VOLUME } from './utils/constants.js';

/* ─── DOM References ───────────────────────────────────────── */
const loadingScreen = document.getElementById('loading-screen');
const lyricsOverlay = document.getElementById('lyrics-overlay');
const lyricsPrevious = document.getElementById('lyrics-previous');
const lyricsCurrent = document.getElementById('lyrics-current');
const lyricsUpcoming = document.getElementById('lyrics-upcoming');

/* ─── App State ────────────────────────────────────────────── */
let currentSong = null;
let currentMood = 'romantic';
const MOOD_CYCLE = ['romantic', 'sad', 'happy', 'peaceful', 'energetic', 'devotional'];
let moodCycleIndex = 0;

/* ═══════════════════════════════════════════════════════════════
   BOOT SEQUENCE
   ═══════════════════════════════════════════════════════════════ */
async function boot() {
  console.log('🎵 LyriVerse starting...');

  // 1. Initialize Three.js scene (behind everything)
  sceneSetup.init();
  particles.init();
  backgrounds.init();
  lyrics3D.init();

  // 2. Initialize Spotify player (gets token from backend)
  spotifyPlayer.init();

  // 3. Initialize UI modules
  searchUI.init();
  playerControls.init();

  // 4. Wire up event bus connections
  wireUpEvents();

  // 5. Apply default mood
  applyMood('romantic');

  // 6. Restore saved volume
  const savedVol = storageGet(LS_KEYS.VOLUME, DEFAULT_VOLUME);
  on('player:ready', () => {
    spotifyPlayer.setVolume(savedVol);
    console.log('🎵 Spotify player ready');
  });

  // 7. Dismiss loading screen
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => loadingScreen.remove(), 1000);
  }, 2200);

  console.log('🎵 LyriVerse ready!');
}

/* ═══════════════════════════════════════════════════════════════
   EVENT WIRING — Connects all modules via the event bus
   ═══════════════════════════════════════════════════════════════ */
function wireUpEvents() {

  /* ── Song Selected (from search) ── */
  on('song:selected', (data) => emit('ui:play-song', { song: data }));

  on('player:ended', async () => {
    console.log('[App] Track ended. Auto-playing next...');
    showToast('Loading next track...');
    if (currentSong && currentSong.id) {
      import('./search/searchAPI.js').then(async (api) => {
        const tracks = await api.getRecommendations(currentSong.id);
        if (tracks.length > 0) {
          // Find first track that isn't the same as current
          const nextTrack = tracks.find(t => t.id !== currentSong.id) || tracks[0];
          emit('ui:play-song', { song: nextTrack });
        } else {
          showToast('No more tracks found.');
        }
      });
    }
  });

  // Play a specific song
  on('ui:play-song', async ({ song }) => {
    currentSong = song;
    console.log(`[App] Song selected: ${song.title} — ${song.artist}`);

    // Show player UI
    searchUI.hide();
    playerControls.show();
    playerControls.setSongInfo(song.title, song.artist);
    lyricsOverlay.classList.remove('hidden');

    // Clear previous lyrics display
    lyricsPrevious.textContent = '';
    lyricsCurrent.textContent = '🎵 Loading lyrics...';
    lyricsUpcoming.textContent = '';

    // ── Fetch lyrics from backend (multiple sources) ──
    const lyricsData = await findLyrics(
      song.title,
      song.artist,
      song.album,
      song.duration
    );

    let parsedLines = [];

    if (lyricsData.found && lyricsData.lines && lyricsData.lines.length > 0) {
      parsedLines = lyricsData.lines;
      console.log(`[App] Found ${parsedLines.length} lyrics lines (source: ${lyricsData.source})`);

      if (lyricsData.source === 'heuristic') {
        showToast('Using estimated timing (no synced lyrics available)');
      } else {
        showToast(`Synced lyrics loaded from ${lyricsData.source} ✨`);
      }
    } else if (song._syncedLyrics) {
      // Fallback: LRCLIB data was embedded in the search result (no backend)
      parsedLines = parseLRC(song._syncedLyrics);
      console.log(`[App] Using embedded synced lyrics (${parsedLines.length} lines)`);
    } else if (song._plainLyrics) {
      parsedLines = estimateTimings(song._plainLyrics, song.duration || 240);
      console.log(`[App] Using embedded plain lyrics with estimated timing`);
      showToast('Using estimated timing');
    } else {
      lyricsCurrent.textContent = '♫ No lyrics available — enjoy the music ♫';
    }

    // Load lyrics into sync engine
    loadLyrics(parsedLines);

    // Detect mood and apply theme
    const allText = parsedLines.map((l) => l.text).join(' ');
    const mood = detectMood(song.title, song.artist, allText);
    setMoodTheme(mood);
    console.log(`[App] Detected mood: ${mood}`);
    
    // Extract album art color
    import('./utils/colorExtractor.js').then(module => {
      module.extractAlbumColor(song.albumArtSmall || song.albumArt);
    });

    // ── Play via Spotify ──
    if (song.uri && spotifyPlayer.isPlayerReady()) {
      lyricsCurrent.textContent = '♫ Starting playback... ♫';
      spotifyPlayer.playTrack(song.uri);
    } else if (song.uri) {
      lyricsCurrent.textContent = '♫ Waiting for Spotify player... ♫';
      showToast('Spotify player is connecting...', 3000);
      // Wait for player to be ready, then play
      const unsub = on('player:ready', () => {
        spotifyPlayer.playTrack(song.uri);
        lyricsCurrent.textContent = '♫';
        unsub();
      });
    } else {
      const fallbackText = parsedLines.length > 0 ? parsedLines[0].text : '♫ Lyrics only (Spotify not configured) ♫';
      emit('lyrics:line-changed', {
        previous: null,
        current: { text: fallbackText },
        upcoming: null
      });
      showToast('Spotify not configured — showing lyrics only', 4000);
    }
  });

  /* ── Player Time Updates → Lyrics Sync ── */
  on('player:time-update', ({ currentTime }) => {
    updateLyricsSync(currentTime);
  });

  /* ── Lyrics Line Changed → Update Display ── */
  on('lyrics:line-changed', ({ previous, current, upcoming }) => {
    lyricsPrevious.textContent = previous?.text || '';
    lyricsCurrent.textContent = current?.text || '';
    lyricsUpcoming.textContent = upcoming?.text || '';

    // Re-trigger the appear animation
    lyricsCurrent.style.animation = 'none';
    lyricsCurrent.offsetHeight; // force reflow
    lyricsCurrent.style.animation = 'lyric-appear 0.45s var(--ease-spring)';
  });

  /* ── Player State Events ── */
  on('player:playing', () => {
    lyricsCurrent.textContent = lyricsCurrent.textContent || '♫';
  });

  on('player:ended', () => {
    lyricsCurrent.textContent = '♫ Song ended ♫';
    lyricsPrevious.textContent = '';
    lyricsUpcoming.textContent = '';
  });

  on('player:error', ({ message }) => {
    lyricsCurrent.textContent = '⚠ ' + message;
    showToast(`Error: ${message}`, 5000);
  });

  on('player:auth-error', ({ message }) => {
    showToast(message, 8000);
    console.warn('[App] Spotify auth error:', message);
  });

  /* ── UI Actions ── */
  on('ui:back-to-search', () => {
    spotifyPlayer.pause();
    playerControls.hide();
    lyricsOverlay.classList.add('hidden');
    searchUI.show();
    document.title = 'LyriVerse — Immersive 3D Lyrics Visualizer';
  });

  on('ui:cycle-theme', () => {
    moodCycleIndex = (moodCycleIndex + 1) % MOOD_CYCLE.length;
    const mood = MOOD_CYCLE[moodCycleIndex];
    setMoodTheme(mood);
  });
}

/* ─── Mood Theme Application ──────────────────────────────── */
function setMoodTheme(mood) {
  currentMood = mood;
  applyMood(mood);           // CSS variables
  sceneSetup.setMood(mood);  // Three.js scene colors
  emit('mood:changed', { mood }); // particles, backgrounds, etc.
}

/* ═══════════════════════════════════════════════════════════════
   START THE APP
   ═══════════════════════════════════════════════════════════════ */
boot();
