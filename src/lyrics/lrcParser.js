/* ═══════════════════════════════════════════════════════════════
   LRC Parser — Converts LRC timestamped lyrics into a timed array
   Handles standard LRC format: [mm:ss.xx] Lyric line
   ═══════════════════════════════════════════════════════════════ */

/**
 * Parse an LRC-formatted string into an array of timed lyric objects.
 *
 * Input format:
 *   [00:12.50] First line of song
 *   [00:18.20] Second line of song
 *
 * Output:
 *   [
 *     { time: 12.5, text: "First line of song" },
 *     { time: 18.2, text: "Second line of song" },
 *   ]
 *
 * @param {string} lrcString - Raw LRC content
 * @returns {Array<{time: number, text: string}>}
 */
export function parseLRC(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];

  const lines = lrcString.split('\n');
  const result = [];

  // Regex for LRC timestamp: [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
  const timestampRegex = /\[(\d{1,3}):(\d{2})(?:[.:])(\d{2,3})?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ti:Title], [ar:Artist], etc.
    if (/^\[[a-z]{2}:/.test(trimmed)) continue;

    // Extract all timestamps from the line (some lines have multiple)
    const timestamps = [];
    let match;
    timestampRegex.lastIndex = 0;

    while ((match = timestampRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let centiseconds = 0;

      if (match[3]) {
        // Handle both .xx (centiseconds) and .xxx (milliseconds)
        const raw = match[3];
        centiseconds = raw.length === 3
          ? parseInt(raw, 10) / 1000
          : parseInt(raw, 10) / 100;
      }

      const timeInSeconds = minutes * 60 + seconds + centiseconds;
      timestamps.push(timeInSeconds);
    }

    // If no timestamps found, skip this line
    if (timestamps.length === 0) continue;

    // Extract the text after the last timestamp
    const text = trimmed
      .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{2,3})?\]/g, '')
      .trim();

    // Create an entry for each timestamp (handles multi-timestamp lines)
    for (const time of timestamps) {
      result.push({ time, text });
    }
  }

  // Sort by time (important for binary search later)
  result.sort((a, b) => a.time - b.time);

  return result;
}

/**
 * Convert plain (unsynced) lyrics into an estimated timed array.
 * Distributes lines evenly across the song duration.
 *
 * @param {string} plainLyrics - Plain text lyrics, one line per line
 * @param {number} duration - Song duration in seconds
 * @returns {Array<{time: number, text: string}>}
 */
export function estimateTimings(plainLyrics, duration = 240) {
  if (!plainLyrics) return [];

  const lines = plainLyrics
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Leave some padding at start and end
  const startOffset = 5; // seconds before first lyric
  const endPadding = 10; // seconds after last lyric
  const usableDuration = Math.max(duration - startOffset - endPadding, lines.length * 2);
  const interval = usableDuration / lines.length;

  return lines.map((text, index) => ({
    time: startOffset + index * interval,
    text,
  }));
}

/**
 * Get the total text content from parsed lyrics (for mood detection).
 * @param {Array<{time: number, text: string}>} lyrics
 * @returns {string}
 */
export function lyricsToPlainText(lyrics) {
  return lyrics.map((l) => l.text).join(' ');
}

export default { parseLRC, estimateTimings, lyricsToPlainText };
