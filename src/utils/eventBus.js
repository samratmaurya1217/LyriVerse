/* ═══════════════════════════════════════════════════════════════
   EventBus — Lightweight publish/subscribe system
   Keeps all modules decoupled. Fire-and-forget communication.
   ═══════════════════════════════════════════════════════════════ */

const listeners = {};

/**
 * Subscribe to an event.
 * @param {string} event - Event name (e.g., 'lyric:current')
 * @param {Function} callback - Handler function
 * @returns {Function} Unsubscribe function
 */
export function on(event, callback) {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);

  // Return an unsubscribe function for easy cleanup
  return () => {
    listeners[event] = listeners[event].filter((cb) => cb !== callback);
  };
}

/**
 * Emit an event with optional data.
 * @param {string} event - Event name
 * @param {*} data - Payload to send to listeners
 */
export function emit(event, data) {
  const handlers = listeners[event];
  if (!handlers) return;

  for (const handler of handlers) {
    try {
      handler(data);
    } catch (err) {
      console.warn(`[EventBus] Error in handler for "${event}":`, err);
    }
  }
}

/**
 * Subscribe to an event, but only fire once.
 * @param {string} event - Event name
 * @param {Function} callback - Handler function
 */
export function once(event, callback) {
  const unsub = on(event, (data) => {
    unsub();
    callback(data);
  });
  return unsub;
}

/**
 * Remove all listeners for an event (or all events).
 * @param {string} [event] - Optional. If omitted, clears everything.
 */
export function off(event) {
  if (event) {
    delete listeners[event];
  } else {
    Object.keys(listeners).forEach((key) => delete listeners[key]);
  }
}

export default { on, emit, once, off };
