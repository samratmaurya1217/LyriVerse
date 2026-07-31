/* ═══════════════════════════════════════════════════════════════
   LyriVerse — Express Backend Server
   
   Handles:
   • Spotify OAuth token management (secrets stay server-side)
   • Spotify search/track API proxying
   • Multi-source lyrics aggregation (LRCLIB + heuristic)
   
   The frontend (Vite) connects via /api/* proxy in development.
   In production, this server also serves the built frontend.
   ═══════════════════════════════════════════════════════════════ */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import spotifyRoutes from './routes/spotify.js';
import lyricsRoutes from './routes/lyrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3001;

const app = express();

/* ─── Middleware ────────────────────────────────────────────── */
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

/* ─── API Routes ───────────────────────────────────────────── */
app.use('/api/spotify', spotifyRoutes);
app.use('/api/lyrics', lyricsRoutes);

/* ─── Health Check ─────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LyriVerse Backend',
    timestamp: new Date().toISOString(),
    spotifyConfigured: !!(
      process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_ID !== 'your_client_id_here'
    ),
  });
});

/* ─── Serve Frontend in Production ─────────────────────────── */
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(distPath, 'index.html'));
  }
});

/* ─── Start Server ─────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('');
  console.log('  🎵 LyriVerse Backend Server');
  console.log(`  ➜  Running on: http://localhost:${PORT}`);
  console.log(`  ➜  Health:     http://localhost:${PORT}/api/health`);

  const spotifyOk = process.env.SPOTIFY_CLIENT_ID &&
                    process.env.SPOTIFY_CLIENT_ID !== 'your_client_id_here';
  if (spotifyOk) {
    console.log('  ✅ Spotify credentials configured');
  } else {
    console.log('  ⚠️  Spotify not configured — update .env file');
    console.log('     Run: node server/getRefreshToken.js');
  }
  console.log('');
});
