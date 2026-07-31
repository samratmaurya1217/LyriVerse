import { FastAverageColor } from 'fast-average-color';
import { emit } from './eventBus.js';

const fac = new FastAverageColor();

export async function extractAlbumColor(imageUrl) {
  if (!imageUrl) return;
  
  try {
    const color = await fac.getColorAsync(imageUrl, {
      algorithm: 'dominant',
      crossOrigin: 'anonymous'
    });
    
    // Extract a complementary or secondary color for contrast
    const isDark = color.isDark;
    const primary = color.hex;
    
    // Simple complementary color by shifting hue (in HSL)
    // We'll just emit the primary color for now, and let visuals handle it
    emit('mood:color-extracted', {
      primary: color.hex,
      isDark: color.isDark,
      rgb: color.value // [r, g, b, a]
    });
    
  } catch (err) {
    console.warn('[ColorExtractor] Failed to extract album color:', err.message);
  }
}
