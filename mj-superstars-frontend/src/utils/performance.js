// ============================================================
// MJ's Superstars - Performance Optimization Utilities
// Lazy loading, memoization, and performance monitoring
// ============================================================

import React, { lazy, Suspense, memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';

// ============================================================
// LAZY LOADING WITH PRELOAD
// ============================================================

/**
 * Create a lazy component with preload capability
 */
export function lazyWithPreload(importFn) {
  const LazyComponent = lazy(importFn);

  // Add preload method
  LazyComponent.preload = importFn;

  return LazyComponent;
}

/**
 * Preload a route/component when likely to be needed
 */
export function preloadComponent(component) {
  if (component.preload) {
    component.preload();
  }
}

/**
 * Loading fallback component
 */
export function LoadingFallback({ minimal = false }) {
  if (minimal) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Suspense wrapper with default fallback
 */
export function LazyLoad({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  );
}

// ============================================================
// LAZY-LOADED ROUTES
// ============================================================

// Define lazy routes with preload
export const LazyRoutes = {
  // Main screens
  Home: lazyWithPreload(() => import('../screens/Home')),
  Chat: lazyWithPreload(() => import('../screens/Chat')),
  Progress: lazyWithPreload(() => import('../screens/Progress')),
  Profile: lazyWithPreload(() => import('../screens/Profile')),

  // Features
  MoodLogger: lazyWithPreload(() => import('../components/MoodLogger')),
  Journal: lazyWithPreload(() => import('../screens/Journal')),
  Tasks: lazyWithPreload(() => import('../screens/Tasks')),
  CopingTools: lazyWithPreload(() => import('../screens/CopingTools')),

  // Settings
  Settings: lazyWithPreload(() => import('../screens/Settings')),
  NotificationSettings: lazyWithPreload(() => import('../components/NotificationSettings')),

  // Onboarding & Auth
  Onboarding: lazyWithPreload(() => import('../components/Onboarding'))
};

// ============================================================
// MEMOIZATION UTILITIES
// ============================================================

/**
 * Deep comparison memo wrapper
 */
export function deepMemo(Component) {
  return memo(Component, (prevProps, nextProps) => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  });
}

/**
 * Shallow comparison for specific props
 */
export function selectiveMemo(Component, propsToCompare) {
  return memo(Component, (prevProps, nextProps) => {
    return propsToCompare.every(key => prevProps[key] === nextProps[key]);
  });
}

/**
 * Memoize expensive computations with cache
 */
export function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  const MAX_CACHE_SIZE = 100;

  return (...args) => {
    const key = keyFn(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);

    // Limit cache size
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };
}

// ============================================================
// DEBOUNCE & THROTTLE
// ============================================================

/**
 * Debounce hook
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedFn = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

/**
 * Throttle hook
 */
export function useThrottle(value, limit = 300) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

/**
 * Throttled callback
 */
export function useThrottledCallback(callback, limit = 300) {
  const lastRan = useRef(0);
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();

    if (now - lastRan.current >= limit) {
      callback(...args);
      lastRan.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRan.current = Date.now();
      }, limit - (now - lastRan.current));
    }
  }, [callback, limit]);
}

// ============================================================
// VIRTUALIZATION
// ============================================================

/**
 * Simple virtualized list for long lists
 */
export function VirtualizedList({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = ''
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const totalHeight = items.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// IMAGE OPTIMIZATION
// ============================================================

/**
 * Lazy loading image component
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  className = '',
  onLoad,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-700 animate-pulse" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
}

// ============================================================
// PERFORMANCE MONITORING
// ============================================================

/**
 * Performance monitor for components
 */
export function usePerformanceMonitor(componentName) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === 'development') {
      if (timeSinceLastRender < 16) { // More than 60fps
        console.warn(`[Perf] ${componentName} re-rendered rapidly (${timeSinceLastRender.toFixed(2)}ms)`);
      }
    }
  });

  return {
    renderCount: renderCount.current
  };
}

/**
 * Measure component render time
 */
export function withPerformanceTracking(Component, name) {
  return function PerformanceTrackedComponent(props) {
    const startTime = useRef(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - startTime.current;

      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`[Perf] ${name} took ${renderTime.toFixed(2)}ms to render`);
      }

      // Report to analytics in production
      if (process.env.NODE_ENV === 'production' && renderTime > 100) {
        // trackPerformance({ name, value: renderTime, screen: name });
      }
    });

    return <Component {...props} />;
  };
}

/**
 * FPS monitor hook
 */
export function useFPSMonitor() {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId;

    const measureFPS = () => {
      frameCount.current += 1;
      const now = performance.now();

      if (now - lastTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return fps;
}

// ============================================================
// BUNDLE SIZE OPTIMIZATION
// ============================================================

/**
 * Dynamic import with retry
 */
export async function dynamicImportWithRetry(importFn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

/**
 * Conditional feature loading
 */
export function useFeatureFlag(flag, importFn) {
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    if (flag) {
      importFn().then(module => {
        setComponent(() => module.default || module);
      });
    }
  }, [flag, importFn]);

  return Component;
}

// ============================================================
// REQUEST OPTIMIZATION
// ============================================================

/**
 * Request deduplication
 */
const pendingRequests = new Map();

export async function deduplicatedFetch(url, options = {}) {
  const key = `${options.method || 'GET'}-${url}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetch(url, options)
    .then(res => res.json())
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Request batching hook
 */
export function useBatchedRequests(batchFn, delay = 50) {
  const queue = useRef([]);
  const timeoutRef = useRef(null);

  const addToQueue = useCallback((item) => {
    queue.current.push(item);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const batch = [...queue.current];
      queue.current = [];
      batchFn(batch);
    }, delay);
  }, [batchFn, delay]);

  return addToQueue;
}

// ============================================================
// EXPORT ALL
// ============================================================

export default {
  // Lazy loading
  lazyWithPreload,
  preloadComponent,
  LoadingFallback,
  LazyLoad,
  LazyRoutes,

  // Memoization
  deepMemo,
  selectiveMemo,
  memoize,

  // Debounce/Throttle
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,

  // Virtualization
  VirtualizedList,

  // Images
  LazyImage,

  // Monitoring
  usePerformanceMonitor,
  withPerformanceTracking,
  useFPSMonitor,

  // Request optimization
  deduplicatedFetch,
  useBatchedRequests
};
