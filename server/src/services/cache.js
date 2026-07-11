class Cache {
  constructor(defaultTtlMs = 15 * 60 * 1000, cleanupIntervalMs = 60 * 1000) {
    this.store = new Map();
    this.defaultTtl = defaultTtlMs;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtl) {
    const expiry = Date.now() + ttlMs;
    this.store.set(key, { value, expiry });
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export default Cache;
