// ============================================================
// MJ's Superstars - ShareButton Component
// Reusable share button with native Web Share API + fallback
// ============================================================
import React, { useState } from 'react';
import { ReferralAPI } from '../services/api';

// Platform share URLs
const SHARE_URLS = {
  twitter: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  facebook: (text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  whatsapp: (text, url) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  sms: (text, url) => `sms:?body=${encodeURIComponent(text + ' ' + url)}`,
  email: (text, url, subject) => `mailto:?subject=${encodeURIComponent(subject || 'Check this out')}&body=${encodeURIComponent(text + '\n\n' + url)}`,
};

export default function ShareButton({
  title = "MJ's Superstars",
  text = "Check out MJ's Superstars - your AI mental health coach!",
  url,
  shareType = 'app_invite',
  contentId = null,
  className = '',
  children,
  onShare,
  variant = 'primary' // 'primary', 'icon', 'compact'
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || 'https://mj-superstars-app.onrender.com';

  const trackShare = async (platform) => {
    try {
      await ReferralAPI.trackShare(shareType, platform, contentId);
    } catch (err) {
      // Non-critical, don't block UX
    }
    onShare?.(platform);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        await trackShare('native');
      } catch (err) {
        if (err.name !== 'AbortError') {
          // User cancelled — not an error
          console.log('Share cancelled');
        }
      }
    } else {
      setShowMenu(true);
    }
  };

  const handlePlatformShare = async (platform) => {
    const shareFunc = SHARE_URLS[platform];
    if (shareFunc) {
      const shareLink = shareFunc(text, shareUrl, title);
      window.open(shareLink, '_blank', 'noopener,noreferrer,width=600,height=400');
      await trackShare(platform);
    }
    setShowMenu(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      await trackShare('copy_link');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      await trackShare('copy_link');
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  };

  // Render variants
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleNativeShare}
          className={`p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:text-sky-400 hover:bg-slate-700 transition-colors ${className}`}
          title="Share"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </button>
        {showMenu && <ShareMenu onClose={() => setShowMenu(false)} onPlatform={handlePlatformShare} onCopy={handleCopyLink} copied={copied} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleNativeShare}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          variant === 'compact'
            ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-600/60 text-sm'
            : 'bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:from-sky-400 hover:to-violet-400 shadow-lg shadow-sky-500/20'
        } ${className}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        {children || 'Share'}
      </button>
      {showMenu && <ShareMenu onClose={() => setShowMenu(false)} onPlatform={handlePlatformShare} onCopy={handleCopyLink} copied={copied} />}
    </>
  );
}

// ============================================================
// Share Menu Overlay (fallback when native share not available)
// ============================================================
function ShareMenu({ onClose, onPlatform, onCopy, copied }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-800 rounded-t-2xl p-6 pb-8 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
        <h3 className="text-white font-semibold text-lg mb-4">Share via</h3>

        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { id: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: 'bg-green-600/20 text-green-400' },
            { id: 'twitter', label: 'X', emoji: '𝕏', color: 'bg-slate-600/30 text-slate-300' },
            { id: 'facebook', label: 'Facebook', emoji: '📘', color: 'bg-blue-600/20 text-blue-400' },
            { id: 'sms', label: 'Message', emoji: '💬', color: 'bg-sky-600/20 text-sky-400' },
            { id: 'email', label: 'Email', emoji: '📧', color: 'bg-amber-600/20 text-amber-400' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => onPlatform(p.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${p.color} hover:opacity-80 transition-opacity`}
            >
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-[11px] font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCopy}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-700/60 text-slate-200 hover:bg-slate-600/60 transition-colors"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy Link
            </>
          )}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 p-2.5 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ReferralCard - Shows user's referral code with share + stats
// ============================================================
export function ReferralCard({ className = '' }) {
  const [referralData, setReferralData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const data = await ReferralAPI.getMyCode();
      setReferralData(data);
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!referralData?.code) return;
    try {
      await navigator.clipboard.writeText(referralData.shareUrl || referralData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      ReferralAPI.trackShare('referral_link', 'copy_link').catch(() => {});
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = referralData.shareUrl || referralData.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className={`bg-slate-800/60 rounded-2xl p-5 animate-pulse ${className}`}>
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
        <div className="h-10 bg-slate-700 rounded mb-2" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    );
  }

  if (!referralData) return null;

  return (
    <div className={`bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 border border-slate-700/50 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎁</span>
        <h3 className="text-white font-semibold">Invite Friends</h3>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Share your code and both of you earn bonus points!
      </p>

      {/* Referral Code Display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-700/30 text-center">
          <span className="text-sky-400 font-mono font-bold text-lg tracking-widest">
            {referralData.code}
          </span>
        </div>
        <button
          onClick={handleCopyCode}
          className="p-3 rounded-xl bg-slate-700/60 text-slate-300 hover:text-sky-400 hover:bg-slate-700 transition-colors"
          title="Copy link"
        >
          {copied ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
      </div>

      {/* Share Button */}
      <ShareButton
        text={`Join me on MJ's Superstars! Use my code ${referralData.code} for bonus points 🎁`}
        url={referralData.shareUrl}
        shareType="referral_link"
        className="w-full justify-center"
      >
        Share Invite Link
      </ShareButton>

      {/* Stats */}
      {referralData.uses > 0 && (
        <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-slate-700/30">
          <div className="text-center">
            <span className="text-sky-400 font-bold text-lg">{referralData.uses}</span>
            <p className="text-slate-500 text-xs">Friends Joined</p>
          </div>
          <div className="text-center">
            <span className="text-amber-400 font-bold text-lg">{referralData.uses * 100}</span>
            <p className="text-slate-500 text-xs">Points Earned</p>
          </div>
        </div>
      )}
    </div>
  );
}
