/* ═══════════════════════════════════════════════════════════════
   Particles — Soft, floating particles that drift in 3D space
   Creates a calming, dreamy atmosphere. Reacts to mood changes.
   Like gentle fireflies or pollen drifting in warm light.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { on } from '../utils/eventBus.js';
import { MOOD_COLORS, PARTICLE_COUNT, PARTICLE_COUNT_MOBILE } from '../utils/constants.js';
import { isMobile, randomRange, randomPick } from '../utils/helpers.js';
import { getScene, onFrame } from './sceneSetup.js';

let particleSystem = null;
let positions, velocities, colors, sizes;
let particleCount;
let currentMood = 'romantic';

/**
 * Initialize the particle system and add it to the scene.
 */
export function init() {
  const scene = getScene();
  particleCount = isMobile() ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT;

  // Create geometry with position, color, and size attributes
  const geometry = new THREE.BufferGeometry();
  positions = new Float32Array(particleCount * 3);
  velocities = new Float32Array(particleCount * 3);
  colors = new Float32Array(particleCount * 3);
  sizes = new Float32Array(particleCount);

  const moodColors = MOOD_COLORS.romantic.particles;

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Random positions in a large cube around the camera
    positions[i3]     = randomRange(-40, 40);  // x
    positions[i3 + 1] = randomRange(-25, 25);  // y
    positions[i3 + 2] = randomRange(-30, 15);  // z

    // Slow, gentle velocities
    velocities[i3]     = randomRange(-0.02, 0.02);  // vx
    velocities[i3 + 1] = randomRange(0.005, 0.03);  // vy (mostly upward drift)
    velocities[i3 + 2] = randomRange(-0.01, 0.01);  // vz

    // Random warm color from mood palette
    const color = new THREE.Color(randomPick(moodColors));
    colors[i3]     = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    // Random sizes
    sizes[i] = randomRange(0.08, 0.4);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Custom shader material for soft, glowing particles
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.6 },
    },
    vertexShader: `
      attribute vec3 customColor;
      attribute float size;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;

      void main() {
        vColor = customColor;

        // Gentle pulsing based on position and time
        float pulse = 0.8 + 0.2 * sin(uTime * 0.5 + position.x * 0.3 + position.y * 0.2);
        vAlpha = pulse;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Size attenuation (particles get smaller with distance)
        gl_PointSize = size * 80.0 * pulse * (300.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;

      void main() {
        // Soft circular particle with glow falloff
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        // Smooth edge falloff
        float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
        alpha *= uOpacity * vAlpha;

        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);

  // Register frame update
  onFrame(updateParticles);

  // Listen for mood changes
  on('mood:changed', ({ mood }) => updateColors(mood));
}

/**
 * Update particle positions each frame.
 */
function updateParticles(delta, elapsed) {
  if (!particleSystem) return;

  // Update time uniform for shader
  particleSystem.material.uniforms.uTime.value = elapsed;

  const posAttr = particleSystem.geometry.getAttribute('position');

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Move particles
    positions[i3]     += velocities[i3];
    positions[i3 + 1] += velocities[i3 + 1];
    positions[i3 + 2] += velocities[i3 + 2];

    // Add gentle sine wave motion
    positions[i3] += Math.sin(elapsed * 0.3 + i * 0.1) * 0.003;

    // Wrap around when particles drift too far
    if (positions[i3 + 1] > 28) {
      positions[i3 + 1] = -28;
      positions[i3] = randomRange(-40, 40);
    }
    if (positions[i3] > 42) positions[i3] = -42;
    if (positions[i3] < -42) positions[i3] = 42;
  }

  posAttr.needsUpdate = true;
}

/**
 * Smoothly transition particle colors to match a new mood.
 * @param {string} mood
 */
function updateColors(mood) {
  const moodPalette = MOOD_COLORS[mood]?.particles || MOOD_COLORS.romantic.particles;
  currentMood = mood;

  const colorAttr = particleSystem.geometry.getAttribute('customColor');
  const targetColors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const color = new THREE.Color(randomPick(moodPalette));
    targetColors[i * 3]     = color.r;
    targetColors[i * 3 + 1] = color.g;
    targetColors[i * 3 + 2] = color.b;
  }

  // Animate color transition over 1 second
  const duration = 1000;
  const start = performance.now();
  const startColors = new Float32Array(colors);

  function transitionColors() {
    const elapsed = performance.now() - start;
    const t = Math.min(elapsed / duration, 1);
    const easedT = t * t * (3 - 2 * t); // smoothstep

    for (let i = 0; i < particleCount * 3; i++) {
      colors[i] = startColors[i] + (targetColors[i] - startColors[i]) * easedT;
    }

    colorAttr.needsUpdate = true;

    if (t < 1) {
      requestAnimationFrame(transitionColors);
    }
  }

  transitionColors();
}

export default { init };
