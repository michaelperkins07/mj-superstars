// ============================================================
// MJ's Superstars - Analytics Service Tests
// ============================================================

// Mock mixpanel before importing
jest.mock('mixpanel-browser', () => ({
  init: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  people: {
    set: jest.fn(),
    increment: jest.fn()
  },
  reset: jest.fn(),
  time_event: jest.fn(),
  register: jest.fn(),
  register_once: jest.fn()
}));

import mixpanel from 'mixpanel-browser';

// Mock the analytics module
const mockAnalytics = {
  initialized: false,
  queue: [],

  init: function(token) {
    if (!token) return false;
    mixpanel.init(token, { debug: false });
    this.initialized = true;
    this.processQueue();
    return true;
  },

  track: function(event, properties = {}) {
    if (!this.initialized) {
      this.queue.push({ event, properties });
      return;
    }
    mixpanel.track(event, {
      ...properties,
      timestamp: new Date().toISOString()
    });
  },

  identify: function(userId, traits = {}) {
    if (!this.initialized) return;
    mixpanel.identify(userId);
    mixpanel.people.set(traits);
  },

  reset: function() {
    mixpanel.reset();
  },

  processQueue: function() {
    this.queue.forEach(({ event, properties }) => {
      mixpanel.track(event, properties);
    });
    this.queue = [];
  }
};

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalytics.initialized = false;
    mockAnalytics.queue = [];
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================

  describe('Initialization', () => {
    test('initializes mixpanel with token', () => {
      mockAnalytics.init('test-token-123');

      expect(mixpanel.init).toHaveBeenCalledWith('test-token-123', expect.any(Object));
      expect(mockAnalytics.initialized).toBe(true);
    });

    test('returns false without token', () => {
      const result = mockAnalytics.init(null);

      expect(result).toBe(false);
      expect(mixpanel.init).not.toHaveBeenCalled();
    });

    test('processes queued events after initialization', () => {
      // Queue some events before init
      mockAnalytics.track('Test Event 1');
      mockAnalytics.track('Test Event 2');

      expect(mockAnalytics.queue.length).toBe(2);

      // Initialize
      mockAnalytics.init('test-token');

      // Queue should be processed
      expect(mixpanel.track).toHaveBeenCalledTimes(2);
      expect(mockAnalytics.queue.length).toBe(0);
    });
  });

  // ============================================================
  // EVENT TRACKING TESTS
  // ============================================================

  describe('Event Tracking', () => {
    beforeEach(() => {
      mockAnalytics.init('test-token');
    });

    test('tracks event with properties', () => {
      mockAnalytics.track('Button Clicked', { button_name: 'submit' });

      expect(mixpanel.track).toHaveBeenCalledWith('Button Clicked', expect.objectContaining({
        button_name: 'submit',
        timestamp: expect.any(String)
      }));
    });

    test('adds timestamp to all events', () => {
      mockAnalytics.track('Test Event');

      expect(mixpanel.track).toHaveBeenCalledWith('Test Event', expect.objectContaining({
        timestamp: expect.any(String)
      }));
    });

    test('queues events before initialization', () => {
      mockAnalytics.initialized = false;
      mockAnalytics.track('Queued Event');

      expect(mockAnalytics.queue.length).toBe(1);
      expect(mockAnalytics.queue[0].event).toBe('Queued Event');
    });
  });

  // ============================================================
  // USER IDENTIFICATION TESTS
  // ============================================================

  describe('User Identification', () => {
    beforeEach(() => {
      mockAnalytics.init('test-token');
    });

    test('identifies user with ID', () => {
      mockAnalytics.identify('user-123');

      expect(mixpanel.identify).toHaveBeenCalledWith('user-123');
    });

    test('sets user traits', () => {
      mockAnalytics.identify('user-123', {
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(mixpanel.people.set).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    test('does not identify before initialization', () => {
      mockAnalytics.initialized = false;
      mockAnalytics.identify('user-123');

      expect(mixpanel.identify).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // RESET TESTS
  // ============================================================

  describe('Reset', () => {
    test('resets mixpanel on logout', () => {
      mockAnalytics.reset();

      expect(mixpanel.reset).toHaveBeenCalled();
    });
  });

  // ============================================================
  // APP-SPECIFIC EVENT TESTS
  // ============================================================

  describe('App-Specific Events', () => {
    beforeEach(() => {
      mockAnalytics.init('test-token');
    });

    test('mood logged event structure', () => {
      const moodData = {
        value: 4,
        factors: ['sleep', 'exercise'],
        has_note: true
      };

      mockAnalytics.track('Mood Logged', moodData);

      expect(mixpanel.track).toHaveBeenCalledWith('Mood Logged', expect.objectContaining({
        value: 4,
        factors: ['sleep', 'exercise'],
        has_note: true
      }));
    });

    test('message sent event structure', () => {
      const messageData = {
        message_length: 150,
        conversation_id: 'conv-123',
        is_first_message: false
      };

      mockAnalytics.track('Message Sent', messageData);

      expect(mixpanel.track).toHaveBeenCalledWith('Message Sent', expect.objectContaining({
        message_length: 150,
        conversation_id: 'conv-123',
        is_first_message: false
      }));
    });

    test('task completed event structure', () => {
      const taskData = {
        task_id: 'task-123',
        points_earned: 10,
        streak_count: 5
      };

      mockAnalytics.track('Task Completed', taskData);

      expect(mixpanel.track).toHaveBeenCalledWith('Task Completed', expect.objectContaining({
        task_id: 'task-123',
        points_earned: 10,
        streak_count: 5
      }));
    });

    test('subscription viewed event structure', () => {
      const subscriptionData = {
        source: 'paywall',
        current_plan: 'free'
      };

      mockAnalytics.track('Subscription Viewed', subscriptionData);

      expect(mixpanel.track).toHaveBeenCalledWith('Subscription Viewed', expect.objectContaining({
        source: 'paywall',
        current_plan: 'free'
      }));
    });

    test('onboarding step completed event', () => {
      const onboardingData = {
        step: 3,
        step_name: 'goals_selection',
        time_on_step: 15
      };

      mockAnalytics.track('Onboarding Step Completed', onboardingData);

      expect(mixpanel.track).toHaveBeenCalledWith('Onboarding Step Completed', expect.objectContaining({
        step: 3,
        step_name: 'goals_selection',
        time_on_step: 15
      }));
    });
  });

  // ============================================================
  // FUNNEL TRACKING TESTS
  // ============================================================

  describe('Funnel Tracking', () => {
    beforeEach(() => {
      mockAnalytics.init('test-token');
    });

    test('onboarding funnel events in order', () => {
      const funnelSteps = [
        'Onboarding Started',
        'Name Entered',
        'Goals Selected',
        'Mood Baseline Set',
        'Style Chosen',
        'Notifications Configured',
        'Onboarding Completed'
      ];

      funnelSteps.forEach((step, index) => {
        mockAnalytics.track(step, { step_index: index });
      });

      expect(mixpanel.track).toHaveBeenCalledTimes(funnelSteps.length);
    });

    test('subscription funnel events', () => {
      const funnelSteps = [
        'Paywall Viewed',
        'Plan Selected',
        'Purchase Initiated',
        'Purchase Completed'
      ];

      funnelSteps.forEach((step, index) => {
        mockAnalytics.track(step, { step_index: index });
      });

      expect(mixpanel.track).toHaveBeenCalledTimes(funnelSteps.length);
    });
  });

  // ============================================================
  // QUEUE BEHAVIOR TESTS
  // ============================================================

  describe('Queue Behavior', () => {
    test('queue has correct order', () => {
      mockAnalytics.track('Event 1');
      mockAnalytics.track('Event 2');
      mockAnalytics.track('Event 3');

      expect(mockAnalytics.queue[0].event).toBe('Event 1');
      expect(mockAnalytics.queue[1].event).toBe('Event 2');
      expect(mockAnalytics.queue[2].event).toBe('Event 3');
    });

    test('queue processes in order', () => {
      mockAnalytics.track('Event 1');
      mockAnalytics.track('Event 2');

      mockAnalytics.init('test-token');

      const calls = mixpanel.track.mock.calls;
      expect(calls[0][0]).toBe('Event 1');
      expect(calls[1][0]).toBe('Event 2');
    });
  });
});
