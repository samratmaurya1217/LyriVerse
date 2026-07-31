/* ═══════════════════════════════════════════════════════════════
   SceneSetup — Three.js scene, camera, renderer, animation loop
   Creates the 3D canvas that all visuals render into.
   Light, airy feel with soft fog and warm lighting.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { on } from '../utils/eventBus.js';
import { MOOD_COLORS } from '../utils/constants.js';
import { isMobile } from '../utils/helpers.js';

/* ─── Three.js Core Objects ────────────────────────────────── */
let scene, camera, renderer, timer;
let animationCallbacks = []; // functions called every frame
let currentMood = 'romantic';

/**
 * Initialize the Three.js scene and renderer.
 * Returns the scene so other modules can add objects.
 */
export function init() {
  const container = document.getElementById('canvas-container');

  // Scene — light background with gentle fog
  scene = new THREE.Scene();
  scene.background = new THREE.Color(MOOD_COLORS.romantic.background);
  scene.fog = new THREE.FogExp2(MOOD_COLORS.romantic.fog, 0.015);

  // Camera — perspective for depth
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  // Renderer — high quality, antialiased
  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile(),
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Timer for delta time (Clock is deprecated in Three.js v0.185+)
  timer = new THREE.Timer();

  // Ambient light — warm, soft fill
  const ambientLight = new THREE.AmbientLight(0xfff5eb, 0.8);
  scene.add(ambientLight);

  // Directional light — gentle sun
  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.5);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Handle resize
  window.addEventListener('resize', handleResize);

  // Listen for mood changes
  on('mood:changed', ({ mood }) => setMood(mood));
  
  on('mood:color-extracted', (colors) => {
    // Tint the background slightly with the album color
    const albumColor = new THREE.Color(colors.primary);
    const white = new THREE.Color('#ffffff');
    const tintedBg = white.clone().lerp(albumColor, 0.15); // 15% album color
    const tintedFog = white.clone().lerp(albumColor, 0.20);
    
    transitionToColors(tintedBg, tintedFog, 2000);
  });

  // Start render loop
  animate();
  
  // Mobile Touch / Pointer interaction for scene rotation
  setupPointerInteraction(container);

  return { scene, camera, renderer };
}

let pointerDown = false;
let pointerX = 0;
let pointerY = 0;
let targetCameraX = 0;
let targetCameraY = 0;

function setupPointerInteraction(container) {
  container.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    pointerX = e.clientX;
    pointerY = e.clientY;
  });
  
  container.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    const dx = e.clientX - pointerX;
    const dy = e.clientY - pointerY;
    
    targetCameraX -= dx * 0.05;
    targetCameraY += dy * 0.05;
    
    // Clamp Y rotation so we don't flip
    targetCameraY = Math.max(-10, Math.min(10, targetCameraY));
    
    pointerX = e.clientX;
    pointerY = e.clientY;
  });
  
  container.addEventListener('pointerup', () => {
    pointerDown = false;
  });
  
  container.addEventListener('pointercancel', () => {
    pointerDown = false;
  });
}

/**
 * Register a callback to be called every animation frame.
 * @param {Function} cb - (deltaTime, elapsedTime) => void
 */
export function onFrame(cb) {
  animationCallbacks.push(cb);
}

/**
 * Remove a frame callback.
 * @param {Function} cb
 */
export function offFrame(cb) {
  animationCallbacks = animationCallbacks.filter((c) => c !== cb);
}

/**
 * Get the Three.js scene.
 */
export function getScene() {
  return scene;
}

/**
 * Get the camera.
 */
export function getCamera() {
  return camera;
}

/**
 * Set the mood — smoothly transitions scene colors.
 * @param {string} mood - e.g. 'romantic', 'sad', 'happy'
 */
export function setMood(mood) {
  const colors = MOOD_COLORS[mood];
  if (!colors) return;

  currentMood = mood;
  const targetBg = new THREE.Color(colors.background);
  const targetFog = new THREE.Color(colors.fog);
  transitionToColors(targetBg, targetFog, 1500);
}

function transitionToColors(targetBg, targetFog, duration) {
  const currentBg = scene.background.clone();
  const currentFogColor = scene.fog.color.clone();
  const start = performance.now();

  function transitionColors() {
    const elapsed = performance.now() - start;
    const t = Math.min(elapsed / duration, 1);
    const easedT = easeInOutCubic(t);

    scene.background.copy(currentBg).lerp(targetBg, easedT);
    scene.fog.color.copy(currentFogColor).lerp(targetFog, easedT);

    if (t < 1) {
      requestAnimationFrame(transitionColors);
    }
  }

  transitionColors();
}

/**
 * Get the current mood.
 */
export function getMood() {
  return currentMood;
}

/* ─── Render Loop ──────────────────────────────────────────── */
function animate(timestamp) {
  requestAnimationFrame(animate);

  timer.update(timestamp);
  const delta = timer.getDelta();
  const elapsed = timer.getElapsed();

  // Gentle camera sway + user pointer interaction
  const swayX = Math.sin(elapsed * 0.1) * 0.5;
  const swayY = Math.cos(elapsed * 0.08) * 0.3;
  
  // Smoothly move camera towards target pointer interaction + sway
  camera.position.x += ((targetCameraX + swayX) - camera.position.x) * 0.05;
  camera.position.y += ((targetCameraY + swayY) - camera.position.y) * 0.05;
  
  // Slowly return target to center if no interaction
  if (!pointerDown) {
    targetCameraX *= 0.95;
    targetCameraY *= 0.95;
  }
  
  camera.lookAt(0, 0, 0);

  // Call all registered frame callbacks
  for (const cb of animationCallbacks) {
    cb(delta, elapsed);
  }

  renderer.render(scene, camera);
}

/* ─── Resize Handler ───────────────────────────────────────── */
function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/* ─── Easing ───────────────────────────────────────────────── */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default { init, onFrame, offFrame, getScene, getCamera, setMood, getMood };
