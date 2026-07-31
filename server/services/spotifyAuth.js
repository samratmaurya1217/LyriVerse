/* ═══════════════════════════════════════════════════════════════
   Spotify Auth Service — Token management for Spotify API
   
   Handles the OAuth refresh flow so the frontend never touches
   secrets. Tokens auto-refresh when expired.
   ═══════════════════════════════════════════════════════════════ */

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get a valid Spotify access token.
 * Uses the refresh token from .env to get a fresh access token.
 * Caches the token and auto-refreshes when expired.
 * 
 * @returns {Promise<string>} A valid Spotify access token
 */
export async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken ||
      clientId === 'your_client_id_here') {
    throw new Error(
      'Spotify credentials not configured. Please update your .env file.\n' +
      'Run "node server/getRefreshToken.js" to get your refresh token.'
    );
  }

  // Request a new access token using the refresh token
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[SpotifyAuth] Token refresh failed:', error);
    throw new Error(`Spotify token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  console.log('[SpotifyAuth] Token refreshed, expires in', data.expires_in, 'seconds');
  return cachedToken;
}

/**
 * Make an authenticated request to the Spotify Web API.
 * Handles token refresh automatically.
 * 
 * @param {string} endpoint - API endpoint (e.g., 'v1/search?q=...')
 * @param {string} [method='GET']
 * @param {Object} [body]
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function spotifyFetch(endpoint, method = 'GET', body = null) {
  const token = await getAccessToken();

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let response = await fetch(`https://api.spotify.com/${endpoint}`, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 2;
    console.warn(`[SpotifyAuth] Rate limited! Retrying after ${retryAfter}s`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    response = await fetch(`https://api.spotify.com/${endpoint}`, options);
  }

  if (response.status === 401) {
    // Token expired mid-request — force refresh and retry
    cachedToken = null;
    const newToken = await getAccessToken();
    options.headers['Authorization'] = `Bearer ${newToken}`;
    response = await fetch(`https://api.spotify.com/${endpoint}`, options);
  }

  return await response.json();
}
