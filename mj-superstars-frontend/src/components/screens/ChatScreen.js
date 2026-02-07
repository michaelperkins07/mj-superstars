// ============================================================
// MJ's Superstars - Chat Screen
// AI conversation with MJ wellness companion
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { ConversationAPI, GuestAPI, TokenManager } from '../../services/api';
import { Send } from '../shared/Icons';

function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMenuRef = useRef(null);

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
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];
    let greeting = 'Hey';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17 && hour < 21) greeting = 'Good evening';
    else greeting = 'Hey there, night owl';

    const profileData = localStorage.getItem('mj_user_profile');
    const guestName = profileData ? (JSON.parse(profileData).name || 'Friend') : 'Friend';
    const nameGreet = guestName !== 'Friend' ? `, ${guestName}` : '';

    return {
      id: 'welcome',
      role: 'assistant',
      content: `${greeting}${nameGreet}! 👋 Happy ${dayName}! I'm MJ, your personal wellness companion. I'm here to listen, support, and help you take small steps toward feeling your best. How are you doing today?`,
      timestamp: new Date().toISOString()
    };
  };

  const clearChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONV_STORAGE_KEY);
    setShowChatMenu(false);
    setMessages([createWelcomeMessage()]);
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
            return;
          }
        } catch (e) { /* corrupted data */ }
      }
      setMessages([createWelcomeMessage()]);
    };
    initChat();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

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
          input.trim(),
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
        const response = await ConversationAPI.sendMessage(conversationId, input.trim());
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
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment. 💙",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="px-4 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
              MJ
            </div>
            <div>
              <h2 className="text-white font-semibold">MJ</h2>
              <p className="text-xs text-emerald-400">Online • Ready to chat</p>
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
                  Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 bg-slate-800/80 backdrop-blur border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Talk to MJ..."
            rows={1}
            className="flex-1 bg-slate-700/50 text-white rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-400"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatScreen;
