// ============================================================
// MJ's Superstars - Chat Integration Tests
// ============================================================

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  mockApiResponse,
  mockApiError,
  mockUser,
  mockMessage,
  mockConversation
} from '../setup';

// Mock Chat Components for testing
const ChatInput = ({ onSend, disabled }) => {
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend?.(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="chat-form">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        data-testid="message-input"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        data-testid="send-button"
      >
        Send
      </button>
    </form>
  );
};

const ChatMessage = ({ message }) => (
  <div
    data-testid={`message-${message.id}`}
    className={`message ${message.role}`}
  >
    <span data-testid="message-role">{message.role}</span>
    <span data-testid="message-content">{message.content}</span>
  </div>
);

const ChatContainer = ({ initialMessages = [] }) => {
  const [messages, setMessages] = React.useState(initialMessages);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const sendMessage = async (content) => {
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="chat-container">
      <div data-testid="message-list">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <div data-testid="loading-indicator">MJ is typing...</div>}
      </div>
      {error && <div data-testid="error-message">{error}</div>}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
};

describe('Chat Integration', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  // ============================================================
  // CHAT INPUT TESTS
  // ============================================================

  describe('Chat Input', () => {
    test('renders input and send button', () => {
      render(<ChatInput onSend={jest.fn()} />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    test('send button disabled when input is empty', () => {
      render(<ChatInput onSend={jest.fn()} />);

      expect(screen.getByTestId('send-button')).toBeDisabled();
    });

    test('send button enabled when input has text', async () => {
      render(<ChatInput onSend={jest.fn()} />);

      await userEvent.type(screen.getByTestId('message-input'), 'Hello');

      expect(screen.getByTestId('send-button')).not.toBeDisabled();
    });

    test('calls onSend with message content', async () => {
      const onSend = jest.fn();
      render(<ChatInput onSend={onSend} />);

      await userEvent.type(screen.getByTestId('message-input'), 'Hello MJ!');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(onSend).toHaveBeenCalledWith('Hello MJ!');
    });

    test('clears input after send', async () => {
      const onSend = jest.fn();
      render(<ChatInput onSend={onSend} />);

      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Hello MJ!');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(input).toHaveValue('');
    });

    test('ignores whitespace-only messages', async () => {
      const onSend = jest.fn();
      render(<ChatInput onSend={onSend} />);

      await userEvent.type(screen.getByTestId('message-input'), '   ');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(onSend).not.toHaveBeenCalled();
    });

    test('disabled state prevents input', () => {
      render(<ChatInput onSend={jest.fn()} disabled />);

      expect(screen.getByTestId('message-input')).toBeDisabled();
      expect(screen.getByTestId('send-button')).toBeDisabled();
    });
  });

  // ============================================================
  // MESSAGE DISPLAY TESTS
  // ============================================================

  describe('Message Display', () => {
    test('renders user message', () => {
      render(<ChatMessage message={mockMessage} />);

      expect(screen.getByTestId('message-role')).toHaveTextContent('user');
      expect(screen.getByTestId('message-content')).toHaveTextContent('Hello MJ!');
    });

    test('renders assistant message', () => {
      const assistantMessage = {
        ...mockMessage,
        id: 'msg-assistant',
        role: 'assistant',
        content: 'Hello! How can I help you today?'
      };

      render(<ChatMessage message={assistantMessage} />);

      expect(screen.getByTestId('message-role')).toHaveTextContent('assistant');
      expect(screen.getByTestId('message-content')).toHaveTextContent('Hello! How can I help you today?');
    });
  });

  // ============================================================
  // CHAT CONTAINER TESTS
  // ============================================================

  describe('Chat Container', () => {
    test('renders with initial messages', () => {
      render(<ChatContainer initialMessages={mockConversation.messages} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByText('Hello MJ!')).toBeInTheDocument();
      expect(screen.getByText('Hi there! How are you feeling today?')).toBeInTheDocument();
    });

    test('sends message and receives response', async () => {
      global.fetch.mockResolvedValueOnce(mockApiResponse({
        response: 'I hear you! Tell me more about how you\'re feeling.'
      }));

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), 'I\'m feeling anxious');
      await userEvent.click(screen.getByTestId('send-button'));

      // User message appears immediately
      await waitFor(() => {
        expect(screen.getByText('I\'m feeling anxious')).toBeInTheDocument();
      });

      // Loading indicator shows
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

      // Assistant response appears
      await waitFor(() => {
        expect(screen.getByText('I hear you! Tell me more about how you\'re feeling.')).toBeInTheDocument();
      });

      // Loading indicator disappears
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    test('shows loading state while waiting for response', async () => {
      global.fetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockApiResponse({ response: 'Response' })), 100)
        )
      );

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(screen.getByTestId('loading-indicator')).toHaveTextContent('MJ is typing...');

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });

    test('disables input while loading', async () => {
      global.fetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockApiResponse({ response: 'Response' })), 100)
        )
      );

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(screen.getByTestId('message-input')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId('message-input')).not.toBeDisabled();
      });
    });

    test('handles API error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to send message'));

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), 'Test message');
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to send message');
      });
    });

    test('user message persists even on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), 'My message');
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText('My message')).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // CONVERSATION FLOW TESTS
  // ============================================================

  describe('Conversation Flow', () => {
    test('multiple messages in sequence', async () => {
      global.fetch
        .mockResolvedValueOnce(mockApiResponse({ response: 'Response 1' }))
        .mockResolvedValueOnce(mockApiResponse({ response: 'Response 2' }));

      render(<ChatContainer />);

      // First message
      await userEvent.type(screen.getByTestId('message-input'), 'First message');
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
      });

      // Second message
      await userEvent.type(screen.getByTestId('message-input'), 'Second message');
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText('Response 2')).toBeInTheDocument();
      });

      // All messages should be visible
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Response 1')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Response 2')).toBeInTheDocument();
    });

    test('messages appear in correct order', async () => {
      global.fetch.mockResolvedValueOnce(mockApiResponse({ response: 'AI Response' }));

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), 'User message');
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText('AI Response')).toBeInTheDocument();
      });

      const messageList = screen.getByTestId('message-list');
      const messages = messageList.querySelectorAll('[data-testid^="message-"]');

      // User message should come before assistant message
      expect(messages[0]).toHaveTextContent('user');
      expect(messages[1]).toHaveTextContent('assistant');
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('Edge Cases', () => {
    test('handles very long messages', async () => {
      const longMessage = 'A'.repeat(1000);

      global.fetch.mockResolvedValueOnce(mockApiResponse({ response: 'Got it!' }));

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), longMessage);
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
      });
    });

    test('handles special characters in messages', async () => {
      const specialMessage = 'Hello! How are you? <script>alert("xss")</script> 😀';

      global.fetch.mockResolvedValueOnce(mockApiResponse({ response: 'Hi!' }));

      render(<ChatContainer />);

      await userEvent.type(screen.getByTestId('message-input'), specialMessage);
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText(specialMessage)).toBeInTheDocument();
      });
    });

    test('handles newlines in messages', async () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';

      global.fetch.mockResolvedValueOnce(mockApiResponse({ response: 'Received!' }));

      render(<ChatContainer />);

      // For textarea, we need to set value directly
      const input = screen.getByTestId('message-input');
      fireEvent.change(input, { target: { value: multilineMessage } });
      await userEvent.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText(multilineMessage)).toBeInTheDocument();
      });
    });

    test('handles rapid message sending', async () => {
      global.fetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockApiResponse({ response: 'Response' })), 50)
        )
      );

      render(<ChatContainer />);

      // First message
      await userEvent.type(screen.getByTestId('message-input'), 'Message 1');
      await userEvent.click(screen.getByTestId('send-button'));

      // Input should be disabled, preventing rapid sends
      expect(screen.getByTestId('message-input')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId('message-input')).not.toBeDisabled();
      });
    });
  });
});
