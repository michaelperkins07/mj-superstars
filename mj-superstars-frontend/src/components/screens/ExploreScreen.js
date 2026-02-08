// ============================================================
// MJ's Superstars - Explore Hub Screen
// ============================================================
// Central hub for new features: Gamification, Social, Photos, and Rituals
// Each card expands inline to show full feature

import React, { useState, useEffect } from 'react';
import { PhotoAPI, SocialAPI, GamificationAPI, RitualAPI } from '../../services/api';
import Icons from '../shared/Icons';
import { useAnalytics } from '../../services/analytics';

function ExploreScreen() {
  const analytics = useAnalytics();
  const [expandedCard, setExpandedCard] = useState(null);
  
  // Gamification State
  const [gamData, setGamData] = useState(null);
  const [gamLoading, setGamLoading] = useState(false);
  
  // Social State
  const [socialData, setSocialData] = useState(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState('');
  
  // Photos State
  const [photosData, setPhotosData] = useState(null);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoTab, setPhotoTab] = useState('progress');
  
  // Rituals State
  const [ritualsData, setRitualsData] = useState(null);
  const [ritualsLoading, setRitualsLoading] = useState(false);

  // Load Gamification data
  const loadGamification = async () => {
    analytics.trackExploreTabOpened();
    setGamLoading(true);
    try {
      const [summary, challenges, milestones] = await Promise.all([
        GamificationAPI.getSummary(),
        GamificationAPI.getChallenges(),
        GamificationAPI.getMilestones()
      ]);
      setGamData({
        summary: summary || { level: 1, xp: 0, streak: 0, xp_multiplier: 1 },
        challenges: challenges || [],
        milestones: milestones || []
      });
    } catch (err) {
      console.error('Failed to load gamification:', err);
      setGamData({
        summary: { level: 1, xp: 0, streak: 0, xp_multiplier: 1, level_name: 'Sparked' },
        challenges: [],
        milestones: []
      });
    } finally {
      setGamLoading(false);
    }
  };

  // Load Social data
  const loadSocial = async () => {
    setSocialLoading(true);
    setSocialError('');
    try {
      const feed = await SocialAPI.getFeed(1);
      setSocialData(feed || { posts: [] });
    } catch (err) {
      console.error('Failed to load social feed:', err);
      setSocialError('Could not load feed');
      setSocialData({ posts: [] });
    } finally {
      setSocialLoading(false);
    }
  };

  // Load Photos data
  const loadPhotos = async () => {
    setPhotosLoading(true);
    try {
      const [timeline, visionBoard] = await Promise.all([
        PhotoAPI.getTimeline(),
        PhotoAPI.getVisionBoard()
      ]);
      setPhotosData({
        timeline: timeline || [],
        visionBoard: visionBoard || []
      });
    } catch (err) {
      console.error('Failed to load photos:', err);
      setPhotosData({
        timeline: [],
        visionBoard: []
      });
    } finally {
      setPhotosLoading(false);
    }
  };

  // Load Rituals data
  const loadRituals = async () => {
    setRitualsLoading(true);
    try {
      const rituals = await RitualAPI.list();
      setRitualsData(rituals || []);
    } catch (err) {
      console.error('Failed to load rituals:', err);
      setRitualsData([]);
    } finally {
      setRitualsLoading(false);
    }
  };

  // Handle card expansion - useEffect triggers data loading
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (!expandedCard) return;
      
      try {
        if (expandedCard === 'gamification' && !gamData) {
          setGamLoading(true);
          const [summary, challenges, milestones] = await Promise.all([
            GamificationAPI.getSummary(),
            GamificationAPI.getChallenges(),
            GamificationAPI.getMilestones()
          ]);
          if (mounted) {
            setGamData({
              summary: summary || { level: 1, xp: 0, streak: 0, xp_multiplier: 1, level_name: 'Sparked' },
              challenges: challenges || [],
              milestones: milestones || []
            });
          }
        } else if (expandedCard === 'social' && !socialData) {
          setSocialLoading(true);
          setSocialError('');
          const feed = await SocialAPI.getFeed(1);
          if (mounted) setSocialData(feed || { posts: [] });
        } else if (expandedCard === 'photos' && !photosData) {
          setPhotosLoading(true);
          const [timeline, visionBoard] = await Promise.all([
            PhotoAPI.getTimeline(),
            PhotoAPI.getVisionBoard()
          ]);
          if (mounted) setPhotosData({ timeline: timeline || [], visionBoard: visionBoard || [] });
        } else if (expandedCard === 'rituals' && !ritualsData) {
          setRitualsLoading(true);
          const rituals = await RitualAPI.list();
          if (mounted) setRitualsData(rituals || []);
        }
      } catch (err) {
        console.error('Failed to load ' + expandedCard + ':', err);
        if (mounted && expandedCard === 'social') setSocialError('Could not load feed');
      } finally {
        if (mounted) {
          setGamLoading(false);
          setSocialLoading(false);
          setPhotosLoading(false);
          setRitualsLoading(false);
        }
      }
    };
    
    loadData();
    return () => { mounted = false; };
  }, [expandedCard]);

  const handleExpandCard = (cardId) => {
    setExpandedCard(cardId);
  };

  // Get flame level based on streak
  const getFlameLevel = (streak) => {
    if (streak === 0) return { name: 'Cold', emoji: '❄️', color: 'from-blue-400 to-cyan-500' };
    if (streak < 5) return { name: 'Sparked', emoji: '✨', color: 'from-amber-300 to-yellow-400' };
    if (streak < 15) return { name: 'Warm', emoji: '🔥', color: 'from-orange-400 to-amber-500' };
    if (streak < 30) return { name: 'Hot', emoji: '🌶️', color: 'from-red-500 to-orange-600' };
    return { name: 'Legendary', emoji: '⚡', color: 'from-purple-500 to-pink-600' };
  };

  // Hub View - Shows all 4 feature cards
  if (expandedCard === null) {
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-2">Explore</h1>
        <p className="text-slate-400 text-sm mb-6">Discover new ways to level up your wellness journey</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Gamification Card */}
          <button
            onClick={() => handleExpandCard('gamification')}
            className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-5 text-left hover:border-violet-400/50 transition-all"
          >
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="text-white font-bold text-base">Gamification</h3>
            <p className="text-slate-300 text-xs mt-1 mb-3">Level up your progress</p>
            {gamData?.summary && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{gamData.summary.level_name === 'Cold' ? '❄️' : gamData.summary.level_name === 'Sparked' ? '✨' : gamData.summary.level_name === 'Warm' ? '🔥' : gamData.summary.level_name === 'Hot' ? '🌶️' : '⚡'}</span>
                <span className="text-sky-400 text-sm font-semibold">Lvl {gamData.summary.level || 1}</span>
              </div>
            )}
          </button>

          {/* Social Card */}
          <button
            onClick={() => handleExpandCard('social')}
            className="bg-gradient-to-br from-sky-400/20 to-blue-500/20 border border-sky-400/30 rounded-2xl p-5 text-left hover:border-sky-300/50 transition-all"
          >
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-white font-bold text-base">Social</h3>
            <p className="text-slate-300 text-xs mt-1 mb-3">Share your journey</p>
            {socialData && (
              <div className="text-sky-400 text-sm font-semibold">{socialData.posts?.length || 0} posts</div>
            )}
          </button>

          {/* Photos Card */}
          <button
            onClick={() => handleExpandCard('photos')}
            className="bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-400/30 rounded-2xl p-5 text-left hover:border-emerald-300/50 transition-all"
          >
            <div className="text-4xl mb-3">📸</div>
            <h3 className="text-white font-bold text-base">Photos</h3>
            <p className="text-slate-300 text-xs mt-1 mb-3">Vision Board & Progress</p>
            {photosData && (
              <div className="text-emerald-400 text-sm font-semibold">{(photosData.timeline?.length || 0) + (photosData.visionBoard?.length || 0)} items</div>
            )}
          </button>

          {/* Rituals Card */}
          <button
            onClick={() => handleExpandCard('rituals')}
            className="bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 rounded-2xl p-5 text-left hover:border-amber-300/50 transition-all"
          >
            <div className="text-4xl mb-3">🌅</div>
            <h3 className="text-white font-bold text-base">Rituals</h3>
            <p className="text-slate-300 text-xs mt-1 mb-3">Daily practices</p>
            {ritualsData && (
              <div className="text-amber-400 text-sm font-semibold">{ritualsData.length || 0} rituals</div>
            )}
          </button>
        </div>

        {/* Quick Tips */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-white text-sm font-semibold mb-2">💡 Pro Tip</p>
          <p className="text-slate-300 text-xs">Consistency is key! Keep your streaks alive and unlock exclusive achievements.</p>
        </div>
      </div>
    );
  }

  // Gamification Expanded View
  if (expandedCard === 'gamification') {
    const flame = getFlameLevel(gamData?.summary?.streak || 0);
    
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setExpandedCard(null)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Gamification Hub</h1>
        </div>

        {gamLoading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : (
          <>
            {/* Flame Level Display */}
            <div className={`bg-gradient-to-br ${flame.color} rounded-2xl p-6 mb-6 text-white`}>
              <div className="text-center">
                <div className="text-6xl mb-3">{flame.emoji}</div>
                <h2 className="text-2xl font-bold mb-1">{flame.name}</h2>
                <p className="text-sm opacity-90 mb-4">Current Streak Level</p>
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-3xl font-bold">{gamData?.summary?.streak || 0}</p>
                    <p className="text-xs opacity-75">Day Streak</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{gamData?.summary?.level || 1}</p>
                    <p className="text-xs opacity-75">Level</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{gamData?.summary?.xp_multiplier || 1}x</p>
                    <p className="text-xs opacity-75">XP Boost</p>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-semibold">Experience Points</h3>
                <span className="text-sky-400 text-sm font-bold">{gamData?.summary?.xp || 0} XP</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-sky-400 to-violet-500 h-2 rounded-full"
                  style={{ width: `${Math.min((gamData?.summary?.xp || 0) / 10, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Active Challenges */}
            <div className="mb-6">
              <h3 className="text-white font-bold text-lg mb-3">Active Challenges</h3>
              {gamData?.challenges && gamData.challenges.length > 0 ? (
                <div className="space-y-3">
                  {gamData.challenges.slice(0, 3).map((challenge, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-semibold text-sm">{challenge.name || `Challenge ${idx + 1}`}</h4>
                        <span className="text-violet-400 text-xs font-bold">{challenge.reward_xp || 100} XP</span>
                      </div>
                      <p className="text-slate-400 text-xs mb-3">{challenge.description || 'Complete this challenge to earn rewards'}</p>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-violet-500 h-2 rounded-full"
                          style={{ width: `${Math.min((challenge.progress || 0) / (challenge.target || 1) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-slate-500 text-xs mt-2">{challenge.progress || 0}/{challenge.target || 10} Complete</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-4 text-slate-400 text-sm border border-slate-700/50">
                  No active challenges. Check back soon!
                </div>
              )}
            </div>

            {/* Milestones */}
            <div className="mb-6">
              <h3 className="text-white font-bold text-lg mb-3">Milestones</h3>
              {gamData?.milestones && gamData.milestones.length > 0 ? (
                <div className="space-y-3">
                  {gamData.milestones.slice(0, 3).map((milestone, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold text-sm">{milestone.name || `Milestone ${idx + 1}`}</h4>
                        <p className="text-slate-400 text-xs">{milestone.description || 'Achieve a milestone'}</p>
                      </div>
                      <button className="bg-amber-500 hover:bg-amber-400 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                        Claim
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-4 text-slate-400 text-sm border border-slate-700/50">
                  No milestones available yet.
                </div>
              )}
            </div>

            {/* Daily Login Bonus */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-5 border border-amber-500/30 mb-6">
              <h3 className="text-white font-bold mb-4">Daily Login Bonus</h3>
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-amber-400 text-lg font-bold">+{day * 25}</p>
                    <p className="text-slate-500 text-xs">Day {day}</p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-white rounded-xl py-3 font-semibold transition-colors">
                Claim Daily Bonus
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Social Expanded View
  if (expandedCard === 'social') {
    const [postContent, setPostContent] = useState('');
    const [showPostForm, setShowPostForm] = useState(false);
    
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setExpandedCard(null)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Social Feed</h1>
        </div>

        {socialLoading ? (
          <div className="text-center py-8 text-slate-400">Loading feed...</div>
        ) : (
          <>
            {/* Floating Action Button for new post */}
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="w-full bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl py-3 font-semibold mb-6 hover:from-sky-300 hover:to-blue-400 transition-all"
            >
              Share Your Journey
            </button>

            {/* Post Creation Form */}
            {showPostForm && (
              <div className="bg-slate-800 rounded-2xl p-5 mb-6 border border-slate-700">
                <h3 className="text-white font-bold mb-3">Create a Post</h3>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's on your mind? Share your progress, thoughts, or inspiration..."
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 mb-3 resize-none"
                  rows="4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPostForm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!postContent.trim()) return;
                      try {
                        await SocialAPI.createPost({ content: postContent, post_type: 'update' });
                        setPostContent('');
                        setShowPostForm(false);
                        // Refresh social feed if expanded
                        if (expandedCard === 'social') {
                          const feedData = await SocialAPI.getFeed();
                          setSocialData(feedData || { posts: [] });
                        }
                      } catch (err) {
                        console.error('Failed to create post:', err);
                      }
                    }}
                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-white rounded-lg py-2 font-semibold transition-colors"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}

            {/* Social Feed */}
            {socialError && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
                {socialError}
              </div>
            )}

            {socialData?.posts && socialData.posts.length > 0 ? (
              <div className="space-y-4 pb-20">
                {socialData.posts.map((post, idx) => (
                  <div key={idx} className="bg-slate-800 rounded-2xl p-5 border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                        {post.user_name?.[0]?.toUpperCase() || '👤'}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{post.user_name || 'User'}</p>
                        <p className="text-slate-400 text-xs">{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now'}</p>
                      </div>
                    </div>
                    
                    <p className="text-slate-200 text-sm mb-4">{post.content || 'Shared an update'}</p>
                    
                    {post.image_url && (
                      <div className="bg-slate-700 rounded-lg h-32 mb-4 flex items-center justify-center">
                        <span className="text-slate-400">📷 Photo</span>
                      </div>
                    )}
                    
                    <div className="flex gap-4 pt-3 border-t border-slate-700/50">
                      <button className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors text-sm">
                        <span>👍</span> {post.likes_count || 0}
                      </button>
                      <button className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-sm">
                        <span>🔥</span> {post.fire_count || 0}
                      </button>
                      <button className="flex items-center gap-2 text-slate-400 hover:text-yellow-400 transition-colors text-sm">
                        <span>👏</span> {post.clap_count || 0}
                      </button>
                      <button className="flex items-center gap-2 text-slate-400 hover:text-pink-400 transition-colors text-sm">
                        <span>❤️</span> {post.heart_count || 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-2">No posts yet</p>
                <p className="text-slate-500 text-xs">Be the first to share your journey!</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Photos Expanded View
  if (expandedCard === 'photos') {
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setExpandedCard(null)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Photos & Vision</h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setPhotoTab('progress')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              photoTab === 'progress'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Progress Photos
          </button>
          <button
            onClick={() => setPhotoTab('vision')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              photoTab === 'vision'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Vision Board
          </button>
        </div>

        {photosLoading ? (
          <div className="text-center py-8 text-slate-400">Loading photos...</div>
        ) : (
          <>
            <button 
              onClick={() => {
                alert('Photo upload coming soon! This feature requires camera/gallery access.');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl py-3 font-semibold mb-6 transition-colors"
            >
              Upload Photo
            </button>

            {photoTab === 'progress' ? (
              // Progress Photos Grid
              <div className="grid grid-cols-2 gap-3 pb-20">
                {photosData?.timeline && photosData.timeline.length > 0 ? (
                  photosData.timeline.map((photo, idx) => (
                    <div key={idx} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                      <div className="bg-slate-700 h-32 flex items-center justify-center">
                        <span className="text-3xl">📸</span>
                      </div>
                      <div className="p-3">
                        <p className="text-white text-xs font-semibold truncate">{photo.title || `Photo ${idx + 1}`}</p>
                        <p className="text-slate-400 text-xs">{photo.date || new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700/50">
                    <p className="text-slate-400 text-sm">No progress photos yet</p>
                    <p className="text-slate-500 text-xs mt-1">Start tracking your journey</p>
                  </div>
                )}
              </div>
            ) : (
              // Vision Board Grid
              <div className="grid grid-cols-2 gap-3 pb-20">
                {photosData?.visionBoard && photosData.visionBoard.length > 0 ? (
                  photosData.visionBoard.map((item, idx) => (
                    <div key={idx} className={`rounded-lg overflow-hidden border-2 ${item.is_achieved ? 'border-emerald-500/50' : 'border-amber-500/50'} bg-slate-800`}>
                      <div className="bg-slate-700 h-32 flex items-center justify-center relative">
                        <span className="text-3xl">🎯</span>
                        {item.is_achieved && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-white text-xs font-semibold truncate">{item.goal_text || `Goal ${idx + 1}`}</p>
                        <p className={`text-xs mt-1 ${item.is_achieved ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {item.is_achieved ? '✓ Achieved' : 'In Progress'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700/50">
                    <p className="text-slate-400 text-sm">No vision board items yet</p>
                    <p className="text-slate-500 text-xs mt-1">Create your first goal</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Rituals Expanded View
  if (expandedCard === 'rituals') {
    return (
      <div className="h-full overflow-y-auto bg-slate-900 px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setExpandedCard(null)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Daily Rituals</h1>
        </div>

        {ritualsLoading ? (
          <div className="text-center py-8 text-slate-400">Loading rituals...</div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-4">Check off your daily practices to build lasting habits</p>
            
            <div className="space-y-3 pb-20">
              {ritualsData && ritualsData.length > 0 ? (
                ritualsData.map((ritual, idx) => {
                  const completed = ritual.completed_today || false;
                  const streak = ritual.current_streak || 0;
                  
                  return (
                    <div key={idx} className={`rounded-xl p-4 border transition-all ${
                      completed
                        ? 'bg-emerald-900/30 border-emerald-500/50'
                        : 'bg-slate-800 border-slate-700/50 hover:border-slate-600/50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={async () => {
                              try {
                                await RitualAPI.complete(ritual.id || idx);
                                // Refresh rituals
                                const ritualData = await RitualAPI.list();
                                setRitualsData(ritualData || []);
                              } catch (err) {
                                console.error('Failed to complete ritual:', err);
                              }
                            }}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                completed
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'border-slate-600 hover:border-slate-500'
                              }`}
                            >
                              {completed && <span className="text-white text-sm">✓</span>}
                            </button>
                            <h4 className={`font-semibold ${completed ? 'text-emerald-300 line-through' : 'text-white'}`}>
                              {ritual.name || `Ritual ${idx + 1}`}
                            </h4>
                          </div>
                          <p className="text-slate-400 text-sm ml-9">{ritual.description || 'Daily practice'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 ml-9">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-lg">🔥</span>
                          <span className="text-amber-400 font-bold text-sm">{streak} day streak</span>
                        </div>
                        {ritual.time && (
                          <p className="text-slate-500 text-xs">{ritual.time}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700/50">
                  <p className="text-slate-400 text-sm">No rituals set up yet</p>
                  <p className="text-slate-500 text-xs mt-1">Create rituals in the Rituals tab</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
}

export default ExploreScreen;
