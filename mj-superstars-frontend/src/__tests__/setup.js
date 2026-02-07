// ============================================================
// MJ's Superstars - Test Setup & Utilities
// Jest configuration and testing utilities
// ============================================================

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// ============================================================
// MOCK IMPLEMENTATIONS
// ============================================================

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

window.IntersectionObserver = IntersectionObserverMock;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock Capacitor
window.Capacitor = {
  isNativePlatform: () => false,
  Plugins: {
    Haptics: {
      impact: jest.fn(),
      notification: jest.fn(),
      vibrate: jest.fn()
    },
    PushNotifications: {
      requestPermissions: jest.fn(() => Promise.resolve({ receive: 'granted' })),
      register: jest.fn(),
      addListener: jest.fn()
    },
    LocalNotifications: {
      schedule: jest.fn(),
      cancel: jest.fn()
    },
    App: {
      addListener: jest.fn(),
      getInfo: jest.fn(() => Promise.resolve({ id: 'com.mjsuperstars.app', name: 'MJ\'s Superstars', version: '1.0.0', build: '7' }))
    },
    StatusBar: {
      setStyle: jest.fn()
    },
    Keyboard: {
      addListener: jest.fn()
    }
  }
};

// Mock navigator
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true
});

// ============================================================
// TEST UTILITIES
// ============================================================

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  created_at: '2025-01-01T00:00:00Z',
  preferences: {
    communication_style: 'supportive',
    notification_time: '09:00'
  }
};

export const mockSubscription = {
  isPremium: true,
  subscription: {
    productId: 'com.mjsuperstars.premium.monthly',
    expirationDate: '2026-01-01T00:00:00Z',
    isTrialPeriod: false,
    willAutoRenew: true
  }
};

export const mockMoodEntry = {
  id: 'mood-123',
  user_id: 'test-user-123',
  value: 4,
  note: 'Feeling good today!',
  factors: ['sleep', 'exercise'],
  created_at: '2025-02-04T10:00:00Z'
};

export const mockMessage = {
  id: 'msg-123',
  role: 'user',
  content: 'Hello MJ!',
  timestamp: '2025-02-04T10:00:00Z'
};

export const mockConversation = {
  id: 'conv-123',
  user_id: 'test-user-123',
  messages: [
    mockMessage,
    {
      id: 'msg-124',
      role: 'assistant',
      content: 'Hi there! How are you feeling today?',
      timestamp: '2025-02-04T10:00:01Z'
    }
  ]
};

export const mockBuddy = {
  id: 'buddy-123',
  name: 'Buddy User',
  status: 'active',
  sharing_level: 'standard',
  connected_at: '2025-01-15T00:00:00Z'
};

// ============================================================
// RENDER UTILITIES
// ============================================================

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Auth Context Mock
const AuthContext = React.createContext({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn()
});

// Data Context Mock
const DataContext = React.createContext({
  moods: [],
  tasks: [],
  conversations: [],
  isLoading: false,
  refresh: jest.fn()
});

// Subscription Context Mock
const SubscriptionContext = React.createContext({
  isPremium: false,
  isLoading: false,
  subscription: null,
  products: [],
  purchase: jest.fn(),
  restore: jest.fn()
});

// All Providers wrapper
function AllProviders({ children, authValue, dataValue, subscriptionValue }) {
  return (
    <BrowserRouter>
      <AuthContext.Provider value={authValue || { user: null, isAuthenticated: false, isLoading: false }}>
        <DataContext.Provider value={dataValue || { moods: [], tasks: [], conversations: [], isLoading: false }}>
          <SubscriptionContext.Provider value={subscriptionValue || { isPremium: false, isLoading: false }}>
            {children}
          </SubscriptionContext.Provider>
        </DataContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

export function renderWithProviders(
  ui,
  {
    authValue,
    dataValue,
    subscriptionValue,
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <AllProviders
        authValue={authValue}
        dataValue={dataValue}
        subscriptionValue={subscriptionValue}
      >
        {children}
      </AllProviders>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    // Return contexts for assertions
    AuthContext,
    DataContext,
    SubscriptionContext
  };
}

// ============================================================
// ASYNC UTILITIES
// ============================================================

export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

// ============================================================
// API MOCK UTILITIES
// ============================================================

export function mockApiResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  });
}

export function mockApiError(message, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message }))
  });
}

export function setupApiMocks() {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
}

// ============================================================
// CLEANUP
// ============================================================

beforeEach(() => {
  // Clear localStorage before each test
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();

  // Clear fetch mocks
  global.fetch.mockClear();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// EXPORTS
// ============================================================

export { AuthContext, DataContext, SubscriptionContext };
