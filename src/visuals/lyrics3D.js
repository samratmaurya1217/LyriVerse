/* ═══════════════════════════════════════════════════════════════
   Lyrics3D — Renders lyrics in 3D space using troika-three-text
   
   Features:
   • High quality text rendering (SDF)
   • Multiple animation modes (float, center, rain)
   • Mood-based colors
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { on } from '../utils/eventBus.js';
import { MOOD_COLORS } from '../utils/constants.js';
import * as sceneSetup from './sceneSetup.js';

let scene;
let currentMood = 'romantic';
let currentMode = 'float';

// Text pools for different modes
const activeTexts = [];

// Fonts
const FONTS = [
  'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2',
  'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NJtEtq.woff2',
  'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
  'https://fonts.gstatic.com/s/lobster/v30/neILzCirqoswsqX9zoKmMw.woff2'
];

let currentMoodColors = null;

export function init() {
  scene = sceneSetup.getScene();

  on('lyrics:line-changed', handleLineChanged);
  on('mood:changed', ({ mood }) => {
    currentMood = mood;
    currentMoodColors = null; // Reset to default mood colors
  });
  
  on('mood:color-extracted', (colors) => {
    // Override mood colors with extracted album colors
    currentMoodColors = {
      primary: colors.primary,
      secondary: colors.isDark ? '#ffffff' : '#000000'
    };
  });

  on('ui:change-mode', ({ mode }) => {
    currentMode = mode;
    clearAllTexts();
  });
  
  on('player:ended', clearAllTexts);
  on('ui:back-to-search', clearAllTexts);

  sceneSetup.onFrame(update);
}

function handleLineChanged({ current }) {
  if (!current || !current.text) return;
  
  spawnText(current.text);
}

function spawnText(textString) {
  // Create Troika text
  const text = new Text();
  text.text = textString;
  
  // Set italic style
  text.fontStyle = 'italic';
  
  text.fontSize = currentMode === 'center' ? 2.5 : 1.5 + Math.random() * 1.5;
  text.anchorX = 'center';
  text.anchorY = 'middle';
  
  const colors = currentMoodColors || (MOOD_COLORS[currentMood] || MOOD_COLORS.romantic);
  // Pick primary or secondary color based on mood/album
  text.color = Math.random() > 0.5 ? colors.primary : colors.secondary;
  
  // Set initial opacity to 0 for fading
  text.fillOpacity = 0;

  // Position based on mode
  if (currentMode === 'float') {
    text.position.x = (Math.random() - 0.5) * 20;
    text.position.y = (Math.random() - 0.5) * 10;
    text.position.z = -15 - Math.random() * 20;
    
    // Slight rotation
    text.rotation.z = (Math.random() - 0.5) * 0.2;
    text.rotation.y = (Math.random() - 0.5) * 0.3;
  } else if (currentMode === 'karaoke') {
    text.position.set(0, 0, -20);
    // clear previous centered texts
    clearAllTexts();
  } else if (currentMode === 'rain') {
    text.position.x = (Math.random() - 0.5) * 30;
    text.position.y = 15;
    text.position.z = -10 - Math.random() * 20;
  } else if (currentMode === 'spiral') {
    // Start at a random angle
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 10;
    text.position.x = Math.cos(angle) * radius;
    text.position.y = (Math.random() - 0.5) * 10;
    text.position.z = Math.sin(angle) * radius - 15;
  } else {
    // Default fallback
    text.position.set(0, 0, -20);
  }

  // Sync to scene
  text.sync();
  scene.add(text);

  // Add to active pool
  activeTexts.push({
    mesh: text,
    life: 0,
    maxLife: currentMode === 'karaoke' ? 5 : 8 + Math.random() * 4,
    mode: currentMode,
    startX: text.position.x,
    startY: text.position.y,
    startZ: text.position.z,
    angle: Math.atan2(text.position.z + 15, text.position.x), // For spiral
    radius: Math.sqrt(text.position.x ** 2 + (text.position.z + 15) ** 2) // For spiral
  });
}

function clearAllTexts() {
  for (const item of activeTexts) {
    scene.remove(item.mesh);
    item.mesh.dispose();
  }
  activeTexts.length = 0;
}

function update(delta, elapsed) {
  for (let i = activeTexts.length - 1; i >= 0; i--) {
    const item = activeTexts[i];
    item.life += delta;
    
    const { mesh, life, maxLife, mode } = item;
    
    // Fade in/out
    let opacity = 1;
    const fadeTime = 1.0;
    if (life < fadeTime) {
      opacity = life / fadeTime;
    } else if (life > maxLife - fadeTime) {
      opacity = (maxLife - life) / fadeTime;
    }
    
    mesh.fillOpacity = Math.max(0, Math.min(1, opacity));
    mesh.strokeOpacity = mesh.fillOpacity;
    
    // Movement
    if (mode === 'float') {
      mesh.position.y = item.startY + Math.sin(elapsed + item.startX) * 1.5;
      mesh.position.z += delta * 0.5; // Slowly float towards camera
    } else if (mode === 'karaoke') {
      // Slight scale pulse
      const scale = 1 + Math.sin(elapsed * 2) * 0.02;
      mesh.scale.set(scale, scale, scale);
    } else if (mode === 'rain') {
      mesh.position.y -= delta * 3;
    } else if (mode === 'spiral') {
      item.angle += delta * 0.2; // Spin slowly
      mesh.position.x = Math.cos(item.angle) * item.radius;
      mesh.position.z = Math.sin(item.angle) * item.radius - 15;
      mesh.position.y += delta * 0.5; // Slowly rise
      // Look at center
      mesh.lookAt(0, mesh.position.y, -15);
    }
    
    // Remove if dead
    if (life >= maxLife) {
      scene.remove(mesh);
      mesh.dispose();
      activeTexts.splice(i, 1);
    }
  }
}

export default { init, clearAllTexts };
