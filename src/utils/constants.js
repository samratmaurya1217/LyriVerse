/* ═══════════════════════════════════════════════════════════════
   Constants — API URLs, config values, defaults
   Single source of truth for magic numbers and external URLs.
   ═══════════════════════════════════════════════════════════════ */

/* ─── API Endpoints ────────────────────────────────────────── */
export const LRCLIB_BASE = 'https://lrclib.net';
export const LRCLIB_SEARCH = `${LRCLIB_BASE}/api/search`;
export const LRCLIB_GET = `${LRCLIB_BASE}/api/get`;

/* ─── App Identity (required by LRCLIB) ────────────────────── */
export const APP_NAME = 'LyriVerse';
export const APP_VERSION = '1.0.0';
export const USER_AGENT = `${APP_NAME}/${APP_VERSION} (https://lyriverse.app)`;

/* ─── YouTube ──────────────────────────────────────────────── */
export const YT_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
export const YT_SEARCH_URL = 'https://www.youtube.com/results';

/* ─── Player Defaults ──────────────────────────────────────── */
export const DEFAULT_VOLUME = 80; // 0-100
export const SYNC_OFFSET_STEP = 0.3; // seconds per click
export const MAX_SYNC_OFFSET = 10; // seconds

/* ─── Visual Defaults ──────────────────────────────────────── */
export const PARTICLE_COUNT = 200;
export const PARTICLE_COUNT_MOBILE = 80;

/* ─── Mood Keywords — used to auto-detect song mood ────────── */
export const MOOD_KEYWORDS = {
  romantic: [
    'love', 'pyaar', 'ishq', 'dil', 'heart', 'kiss', 'hug', 'romance',
    'baby', 'darling', 'jaana', 'mehbooba', 'chahun', 'tere liye',
    'sanam', 'jaan', 'honeymoon', 'valentine',
  ],
  sad: [
    'sad', 'cry', 'tears', 'alone', 'lonely', 'pain', 'hurt', 'broken',
    'tanhai', 'judai', 'alvida', 'bewafa', 'dard', 'rona', 'aansu',
    'tanha', 'bichhad', 'judaa', 'farewell', 'goodbye',
  ],
  happy: [
    'happy', 'dance', 'party', 'celebrate', 'joy', 'fun', 'masti',
    'nachle', 'dhoom', 'badtameez', 'sunny', 'smile', 'khushi',
    'balle', 'enjoy', 'awesome',
  ],
  peaceful: [
    'peace', 'calm', 'nature', 'sky', 'rain', 'breeze', 'ocean',
    'sufi', 'classical', 'meditate', 'soulful', 'baarish', 'hawayein',
    'aasman', 'chandni', 'shaam', 'subah',
  ],
  energetic: [
    'rock', 'pump', 'fire', 'power', 'energy', 'fight', 'strength',
    'dhinka', 'malhari', 'ziddi', 'rebel', 'josh', 'junoon',
    'desi', 'swag', 'bass',
  ],
  devotional: [
    'bhajan', 'prayer', 'god', 'temple', 'devotion', 'spiritual',
    'krishna', 'rama', 'shiva', 'allah', 'waheguru', 'bhakti',
    'mandir', 'pooja', 'aarti', 'kirtan',
  ],
};

/* ─── Theme Color Palettes (for Three.js scene) ───────────── */
export const MOOD_COLORS = {
  romantic: {
    primary: 0xd4816b,
    secondary: 0xc06080,
    background: 0xfdf6f4,
    particles: [0xd4816b, 0xe8a0b4, 0xc06080, 0xf0c0b0],
    fog: 0xfdf6f4,
  },
  sad: {
    primary: 0x7e95b8,
    secondary: 0x9a8cb8,
    background: 0xf0f2f8,
    particles: [0x7e95b8, 0xa0b4c8, 0x9a8cb8, 0xb8c4d8],
    fog: 0xf0f2f8,
  },
  happy: {
    primary: 0xd4a054,
    secondary: 0xe8864c,
    background: 0xfcf6ee,
    particles: [0xd4a054, 0xf0c060, 0xe8864c, 0xf8d888],
    fog: 0xfcf6ee,
  },
  peaceful: {
    primary: 0x7a9e7e,
    secondary: 0x6b8f80,
    background: 0xf2f6f2,
    particles: [0x7a9e7e, 0xa8c4a0, 0x6b8f80, 0xc0dcc0],
    fog: 0xf2f6f2,
  },
  energetic: {
    primary: 0xe06070,
    secondary: 0xd04888,
    background: 0xfdf4f5,
    particles: [0xe06070, 0xf08080, 0xd04888, 0xf0a0a0],
    fog: 0xfdf4f5,
  },
  devotional: {
    primary: 0xc89840,
    secondary: 0xb87830,
    background: 0xfaf6ec,
    particles: [0xc89840, 0xe0b860, 0xb87830, 0xf0d080],
    fog: 0xfaf6ec,
  },
};

/* ─── Animation Modes ──────────────────────────────────────── */
export const ANIMATION_MODES = ['float', 'karaoke', 'rain', 'spiral'];

/* ─── Local Storage Keys ──────────────────────────────────── */
export const LS_KEYS = {
  VOLUME: 'lyriverse_volume',
  MOOD: 'lyriverse_mood',
  ANIM_MODE: 'lyriverse_anim_mode',
  SYNC_OFFSETS: 'lyriverse_sync_offsets',
};
