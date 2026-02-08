// ============================================================
// MJ's Superstars - Chat Screen
// AI conversation with MJ wellness companion
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { ConversationAPI, GuestAPI, TokenManager } from '../../services/api';
import { Send } from '../shared/Icons';
import { useToast } from '../shared/Toast';
import * as haptics from '../../services/haptics';

const QUICK_PROMPTS = [
  { label: "I'm feeling stuck", icon: "😶" },
  { label: "I need to vent", icon: "😤" },
  { label: "Help me think through something", icon: "🤔" },
  { label: "I want to feel better", icon: "🌱" },
  { label: "Give me a push", icon: "💪" },
];

function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef(null);
  const chatMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const { addToast } = useToast();

  const CHAT_STORAGE_KEY = 'mj_chat_history';
  const CONV_STORAGE_KEY = 'mj_conversation_id';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatMenu]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) { /* storage full */ }
    }
  }, [messages]);

  const createWelcomeMessage = () => {
    const hour = new Date().getHours();
    const profileData = localStorage.getItem('mj_user_profile');
    const guestName = profileData ? (JSON.parse(profileData).name || '') : '';
    const nameGreet = guestName ? `, ${guestName}` : '';

    let greeting, followUp;
    if (hour >= 5 && hour < 12) {
      greeting = `Good morning${nameGreet}.`;
      followUp = "What's on your mind as you start the day?";
    } else if (hour >= 12 && hour < 17) {
      greeting = `Hey${nameGreet}.`;
      followUp = "How's your day going so far?";
    } else if (hour >= 17 && hour < 21) {
      greeting = `Good evening${nameGreet}.`;
      followUp = "How are you feeling right now?";
    } else {
      greeting = `Hey${nameGreet}.`;
      followUp = "Can't sleep, or just winding down?";
    }

    return {
      id: 'welcome',
      role: 'assistant',
      content: `${greeting} ${followUp}\n\nI'm here to listen — no judgment, no advice you didn't ask for. Just honest conversation.`,
      timestamp: new Date().toISOString()
    };
  };

  const clearChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONV_STORAGE_KEY);
    setShowChatMenu(false);
    setMessages([createWelcomeMessage()]);
    setShowQuickPrompts(true);
    const hasToken = TokenManager.isAuthenticated();
    if (!hasToken) {
      const newId = 'guest-' + Date.now();
      setConversationId(newId);
      localStorage.setItem(CONV_STORAGE_KEY, newId);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      const hasToken = TokenManager.isAuthenticated();
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      const savedConvId = localStorage.getItem(CONV_STORAGE_KEY);

      if (hasToken) {
        try {
          const response = await ConversationAPI.create();
          setConversationId(response.conversation?.id || response.id);
          setIsGuestMode(false);
        } catch (err) {
          setIsGuestMode(true);
          setConversationId(savedConvId || 'guest-' + Date.now());
        }
      } else {
        setIsGuestMode(true);
        if (savedConvId) {
          setConversationId(savedConvId);
        } else {
          try {
            const response = await GuestAPI.createSession();
            const newId = response.session_id || response.conversation?.id || 'guest-' + Date.now();
            setConversationId(newId);
            localStorage.setItem(CONV_STORAGE_KEY, newId);
          } catch (err) {
            const newId = 'guest-' + Date.now();
            setConversationId(newId);
            localStorage.setItem(CONV_STORAGE_KEY, newId);
          }
        }
      }

      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            // Hide quick prompts if user already has conversation history
            if (parsed.length > 1) setShowQuickPrompts(false);
            return;
          }
        } catch (e) { /* corrupted data */ }
      }

      setMessages([createWelcomeMessage()]);
    };

    initChat();
  }, []);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    try { haptics.messageSent(); } catch(e) {}
    setShowQuickPrompts(false);

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    try {
      let responseContent;

      if (isGuestMode) {
        const chatHistory = currentMessages
          .filter(m => m.id !== 'welcome')
          .map(m => ({ role: m.role, content: m.content }));

        const profileRaw = localStorage.getItem('mj_user_profile');
        const profileData = profileRaw ? JSON.parse(profileRaw) : {};
        const guestName = profileData.name || 'Friend';

        const moodsRaw = localStorage.getItem('mj_guest_moods');
        const recentMoods = moodsRaw ? JSON.parse(moodsRaw).slice(0, 5) : [];
        const tasksRaw = localStorage.getItem('mj_guest_tasks');
        const todayTasks = tasksRaw ? JSON.parse(tasksRaw) : [];
        const journalRaw = localStorage.getItem('mj_guest_journal');
        const recentJournal = journalRaw ? JSON.parse(journalRaw).slice(0, 3) : [];

        const response = await GuestAPI.sendMessage(
          messageText,
          chatHistory,
          guestName,
          conversationId,
          {
            profile: {
              interests: profileData.interests || [],
              struggles: profileData.struggles || [],
              communicationPref: profileData.communicationPref || 'friendly'
            },
            recentMoods,
            todayTasks,
            recentJournal
          }
        );
        responseContent = response.mj_response?.content || response.content || "I hear you. Tell me more about that.";
      } else {
        const response = await ConversationAPI.sendMessage(conversationId, messageText);
        responseContent = response.mj_response?.content || response.message?.content || response.content || "I hear you. Tell me more about that.";
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      addToast("Having trouble connecting. Try again in a sec.", 'warning');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    try { haptics.selection(); } catch(e) {}
    sendMessage(promptText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = '44px';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Only show quick prompts when conversation is just the welcome message
  const shouldShowPrompts = showQuickPrompts && messages.length <= 1 && !loading;

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
              MJ
            </div>
            <div>
              <h2 className="text-white font-semibold">MJ</h2>
              <p className="text-xs text-emerald-400">Online</p>
            </div>
          </div>
          <div className="relative" ref={chatMenuRef}>
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="w-9 h-9 rounded-lg hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Chat options"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showChatMenu && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-xl shadow-lg border border-slate-600/50 py-1 min-w-[180px] z-50">
                <button
                  onClick={clearChat}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-600/50 flex items-center gap-2.5 transition-colors"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  New Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Quick Prompts */}
        {shouldShowPrompts && (
          <div className="pt-2">
            <p className="text-xs text-slate-500 mb-3 text-center">Not sure where to start? Try one of these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(p.label)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-sky-500/30 text-slate-300 hover:text-white text-sm px-3.5 py-2 rounded-xl transition-all"
                >
                  <span className="mr-1.5">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500 ml-1">MJ is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-slate-800/80 backdrop-blur border-t border-slate-700/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Say what's on your mind..."
            rows={1}
            className="flex-1 bg-slate-700/50 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatScreen;
