/* ═══════════════════════════════════════════════════════════════
   Backgrounds — Soft, dreamy gradient blobs that shift with mood
   Creates flowing organic shapes behind the lyrics.
   Like watercolor clouds drifting in warm sunlight.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { on } from '../utils/eventBus.js';
import { MOOD_COLORS } from '../utils/constants.js';
import { getScene, onFrame } from './sceneSetup.js';
import { randomRange } from '../utils/helpers.js';

let blobs = [];

/**
 * Create soft, blurred gradient blobs that float behind everything.
 */
export function init() {
  const scene = getScene();
  const colors = MOOD_COLORS.romantic;

  // Create 4-5 large, soft gradient blobs
  const blobConfigs = [
    { x: -12, y:  8, z: -20, scale: 15, color: colors.primary,   speed: 0.15 },
    { x:  14, y: -6, z: -25, scale: 18, color: colors.secondary, speed: 0.12 },
    { x:  -8, y: -10, z: -22, scale: 14, color: colors.particles[2], speed: 0.18 },
    { x:  10, y:  12, z: -28, scale: 20, color: colors.particles[3], speed: 0.1 },
  ];

  for (const config of blobConfigs) {
    const blob = createBlob(config);
    scene.add(blob.mesh);
    blobs.push(blob);
  }

  // Register animation
  onFrame(updateBlobs);

  // Listen for mood changes
  on('mood:changed', ({ mood }) => updateBlobColors(mood));
}

/**
 * Create a single soft gradient blob.
 */
function createBlob({ x, y, z, scale, color, speed }) {
  const geometry = new THREE.PlaneGeometry(scale, scale);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.12 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        // Radial gradient from center
        float dist = length(vUv - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

        // Soft organic distortion
        alpha *= uOpacity;
        alpha *= 0.8 + 0.2 * sin(uTime * 0.3 + vUv.x * 3.0);

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  return {
    mesh,
    material,
    originX: x,
    originY: y,
    speed,
    phaseX: randomRange(0, Math.PI * 2),
    phaseY: randomRange(0, Math.PI * 2),
  };
}

/**
 * Animate blobs — gentle drifting motion.
 */
function updateBlobs(delta, elapsed) {
  for (const blob of blobs) {
    // Slow, organic drifting
    blob.mesh.position.x = blob.originX + Math.sin(elapsed * blob.speed + blob.phaseX) * 4;
    blob.mesh.position.y = blob.originY + Math.cos(elapsed * blob.speed * 0.7 + blob.phaseY) * 3;

    // Gentle rotation
    blob.mesh.rotation.z = Math.sin(elapsed * 0.05) * 0.1;

    // Update time uniform
    blob.material.uniforms.uTime.value = elapsed;
  }
}

/**
 * Transition blob colors when mood changes.
 */
function updateBlobColors(mood) {
  const colors = MOOD_COLORS[mood] || MOOD_COLORS.romantic;
  const palette = [colors.primary, colors.secondary, ...colors.particles.slice(0, 2)];

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const targetColor = new THREE.Color(palette[i % palette.length]);
    const currentColor = blob.material.uniforms.uColor.value.clone();

    // Smooth color transition
    const duration = 1200;
    const start = performance.now();

    function transition() {
      const t = Math.min((performance.now() - start) / duration, 1);
      const easedT = t * t * (3 - 2 * t);
      blob.material.uniforms.uColor.value.copy(currentColor).lerp(targetColor, easedT);
      if (t < 1) requestAnimationFrame(transition);
    }

    transition();
  }
}

export default { init };
