/* ═══════════════════════════════════════════════════════════════
   Get Refresh Token — One-time setup helper
   
   Run this script ONCE to get your Spotify refresh token:
     node server/getRefreshToken.js
   
   It will:
   1. Open a browser window for you to log in to Spotify
   2. After login, it captures the authorization code
   3. Exchanges it for an access token + refresh token
   4. Prints the refresh token — paste it into your .env file
   ═══════════════════════════════════════════════════════════════ */

import 'dotenv/config';
import http from 'http';
import { exec } from 'child_process';
import { platform } from 'os';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:3001/callback';
const SCOPES = [
  'streaming',                    // Web Playback SDK
  'user-read-email',             // Account info
  'user-read-private',           // Account info
  'user-read-playback-state',    // Current playback
  'user-modify-playback-state',  // Control playback
  'user-read-currently-playing', // Currently playing track
  'user-top-read',               // Top tracks
  'user-library-read',           // Saved tracks
].join(' ');

if (!CLIENT_ID || CLIENT_ID === 'your_client_id_here') {
  console.error('\n❌ Missing Spotify credentials!');
  console.error('Please update your .env file with:');
  console.error('  SPOTIFY_CLIENT_ID=your_client_id');
  console.error('  SPOTIFY_CLIENT_SECRET=your_client_secret');
  console.error('\nGet these from: https://developer.spotify.com/dashboard\n');
  process.exit(1);
}

// Build the authorization URL
const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('show_dialog', 'true');

console.log('\n🎵 LyriVerse — Spotify Setup\n');
console.log('Opening browser for Spotify login...\n');

// Open browser
const openCommand = platform() === 'win32' ? 'start'
  : platform() === 'darwin' ? 'open' : 'xdg-open';
exec(`${openCommand} "${authUrl.toString()}"`);

// Start a temporary server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3001`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.end('❌ Authorization denied. Please try again.');
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.end('❌ No authorization code received.');
      server.close();
      process.exit(1);
    }

    // Exchange the code for tokens
    try {
      const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const data = await tokenResponse.json();

      if (data.error) {
        res.end(`❌ Token exchange failed: ${data.error_description}`);
        server.close();
        process.exit(1);
      }

      // Success! Show the refresh token
      const html = `
        <html><body style="font-family:system-ui;padding:40px;max-width:600px;margin:auto;background:#faf8f5">
          <h1>✅ Spotify Connected!</h1>
          <p>Copy the refresh token below and paste it into your <code>.env</code> file:</p>
          <pre style="background:#f0ede8;padding:16px;border-radius:8px;word-break:break-all;font-size:12px">${data.refresh_token}</pre>
          <p>Then update your <code>.env</code> file:</p>
          <pre style="background:#f0ede8;padding:16px;border-radius:8px">SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</pre>
          <p style="color:#888;margin-top:24px">You can close this window now.</p>
        </body></html>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);

      console.log('✅ Success! Your refresh token:\n');
      console.log(data.refresh_token);
      console.log('\nPaste this into your .env file as SPOTIFY_REFRESH_TOKEN');
      console.log('Then restart the server with: npm run dev\n');

      setTimeout(() => { server.close(); process.exit(0); }, 3000);
    } catch (err) {
      res.end(`❌ Error: ${err.message}`);
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3001, () => {
  console.log('Waiting for Spotify callback on http://127.0.0.1:3001/callback ...');
  console.log('If the browser didn\'t open, visit this URL manually:\n');
  console.log(authUrl.toString());
  console.log('');
});
