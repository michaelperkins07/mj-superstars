// ============================================================
// MJ's Superstars - Offline Request Queue
// Queues failed API mutations for replay when back online
// ============================================================

const QUEUE_KEY = 'mj_offline_queue_requests';
const MAX_QUEUE_SIZE = 50;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Mutation endpoints that should be queued when offline
const QUEUEABLE_ENDPOINTS = [
  '/moods',
  '/tasks',
  '/journal',
  '/rituals/morning',
  '/rituals/evening',
  '/conversations',
  '/coping/tools',
  '/notifications/subscribe',
  '/users/me',
];

// Methods that represent mutations (not reads)
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Check if a request should be queued when offline
 */
export function isQueueable(endpoint, method) {
  if (!MUTATION_METHODS.includes(method?.toUpperCase())) {
    return false;
  }
  return QUEUEABLE_ENDPOINTS.some(qe => endpoint.startsWith(qe));
}

/**
 * Add a failed request to the offline queue
 */
export function enqueue(endpoint, options = {}) {
  try {
    const queue = getQueue();

    // Don't exceed max queue size
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn('Offline queue full, dropping oldest entry');
      queue.shift();
    }

    queue.push({
      id: Date.now() + Math.random().toString(36).slice(2, 7),
      endpoint,
      method: options.method || 'POST',
      body: options.body,
      timestamp: Date.now(),
    });

    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`Queued offline request: ${options.method || 'POST'} ${endpoint}`);

    return true;
  } catch (err) {
    console.error('Failed to queue offline request:', err);
    return false;
  }
}

/**
 * Get the current queue (pruning expired entries)
 */
export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];

    const queue = JSON.parse(raw);
    const now = Date.now();

    // Filter out entries older than MAX_AGE_MS
    const fresh = queue.filter(item => (now - item.timestamp) < MAX_AGE_MS);

    // If we pruned anything, save the updated queue
    if (fresh.length !== queue.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(fresh));
    }

    return fresh;
  } catch (err) {
    console.error('Failed to read offline queue:', err);
    return [];
  }
}

/**
 * Get the number of pending queued requests
 */
export function getQueueSize() {
  return getQueue().length;
}

/**
 * Replay all queued requests using the provided request function
 * @param {Function} requestFn - The API request function to use
 * @returns {Object} { succeeded: number, failed: number }
 */
export async function replayQueue(requestFn) {
  const queue = getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  console.log(`Replaying ${queue.length} queued offline requests...`);

  let succeeded = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      await requestFn(item.endpoint, {
        method: item.method,
        body: item.body,
      });
      succeeded++;
      console.log(`Replayed: ${item.method} ${item.endpoint}`);
    } catch (err) {
      console.error(`Failed to replay: ${item.method} ${item.endpoint}`, err);
      failed++;
      // Keep failed items for another retry (unless they're auth errors)
      if (err.status !== 401 && err.status !== 403) {
        remaining.push(item);
      }
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  console.log(`Queue replay complete: ${succeeded} succeeded, ${failed} failed, ${remaining.length} remaining`);

  return { succeeded, failed, remaining: remaining.length };
}

/**
 * Clear the entire queue
 */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Set up auto-replay when connection returns
 * Call this once at app startup
 */
export function initOfflineSync(requestFn) {
  const handleOnline = async () => {
    const size = getQueueSize();
    if (size > 0) {
      console.log(`Back online — replaying ${size} queued requests`);
      const result = await replayQueue(requestFn);

      // Dispatch event so UI can show sync status
      window.dispatchEvent(new CustomEvent('offline:synced', {
        detail: result
      }));
    }
  };

  window.addEventListener('online', handleOnline);

  // Also try replaying on init in case we came back online while app was closed
  if (navigator.onLine && getQueueSize() > 0) {
    setTimeout(() => handleOnline(), 2000); // Small delay to let auth initialize
  }

  return () => window.removeEventListener('online', handleOnline);
}

export default {
  isQueueable,
  enqueue,
  getQueue,
  getQueueSize,
  replayQueue,
  clearQueue,
  initOfflineSync,
};
