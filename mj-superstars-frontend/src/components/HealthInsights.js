// ============================================================
// MJ's Superstars - Health Insights Component
// Displays HealthKit data and mood correlations
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  isHealthKitAvailable,
  requestHealthKitPermission,
  checkHealthKitPermission,
  getDailyHealthSummary,
  getWeeklyHealthTrends
} from '../services/healthKit';

/**
 * Health Permission Request Card
 */
export function HealthKitPermissionCard({ onGranted }) {
  const [status, setStatus] = useState('idle'); // idle, requesting, granted, denied, unavailable

  useEffect(() => {
    if (!isHealthKitAvailable()) {
      setStatus('unavailable');
      return;
    }

    checkHealthKitPermission().then(granted => {
      if (granted) {
        setStatus('granted');
        onGranted?.();
      }
    });
  }, [onGranted]);

  const handleRequest = async () => {
    setStatus('requesting');
    const result = await requestHealthKitPermission();

    if (result.granted) {
      setStatus('granted');
      onGranted?.();
    } else {
      setStatus('denied');
    }
  };

  if (status === 'unavailable') {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">Health Data Unavailable</h3>
            <p className="text-slate-400 text-sm">
              HealthKit is only available on iOS devices with the native app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'granted') {
    return null; // Don't show anything if already granted
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl p-6 border border-emerald-500/30">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <span className="text-3xl">❤️</span>
        </div>

        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg mb-1">
            Connect Apple Health
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            See how your sleep, activity, and heart rate affect your mood.
          </p>

          <div className="space-y-2 mb-4">
            {[
              { icon: '😴', text: 'Sleep quality insights' },
              { icon: '🏃', text: 'Activity & mood correlations' },
              { icon: '💚', text: 'Stress level indicators' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {status === 'denied' ? (
            <div className="bg-red-500/20 rounded-lg p-3 mb-3">
              <p className="text-red-300 text-sm">
                Permission denied. You can enable it in Settings → Privacy → Health.
              </p>
            </div>
          ) : null}

          <button
            onClick={handleRequest}
            disabled={status === 'requesting'}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {status === 'requesting' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Connect Health Data</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Daily Health Summary Card
 */
export function DailyHealthCard({ date = new Date() }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const loadHealth = async () => {
      if (!isHealthKitAvailable()) {
        setLoading(false);
        return;
      }

      const granted = await checkHealthKitPermission();
      setHasPermission(granted);

      if (granted) {
        const summary = await getDailyHealthSummary(date);
        setHealth(summary);
      }
      setLoading(false);
    };

    loadHealth();
  }, [date]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return <HealthKitPermissionCard onGranted={() => window.location.reload()} />;
  }

  if (!health) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <p className="text-slate-400 text-center">No health data available for today.</p>
      </div>
    );
  }

  const metrics = [
    {
      icon: '👟',
      label: 'Steps',
      value: health.steps?.value?.toLocaleString() || '--',
      subtext: 'today',
      color: 'cyan'
    },
    {
      icon: '😴',
      label: 'Sleep',
      value: health.sleep?.totalHours ? `${health.sleep.totalHours}h` : '--',
      subtext: health.sleep?.quality ? `${health.sleep.quality}% quality` : '',
      color: 'purple'
    },
    {
      icon: '❤️',
      label: 'Resting HR',
      value: health.restingHeartRate?.value || '--',
      subtext: 'bpm',
      color: 'red'
    },
    {
      icon: '💚',
      label: 'HRV',
      value: health.hrv?.value || '--',
      subtext: 'ms',
      color: 'green'
    }
  ];

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Today's Health</h3>
        {health.wellnessScore && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Wellness</span>
            <div className={`px-2 py-1 rounded-lg text-sm font-semibold ${
              health.wellnessScore >= 70 ? 'bg-green-500/20 text-green-400' :
              health.wellnessScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {health.wellnessScore}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className={`bg-${metric.color}-500/10 rounded-xl p-4 border border-${metric.color}-500/20`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{metric.icon}</span>
              <span className="text-slate-400 text-sm">{metric.label}</span>
            </div>
            <div className={`text-2xl font-bold text-${metric.color}-400`}>
              {metric.value}
            </div>
            {metric.subtext && (
              <div className="text-slate-500 text-xs">{metric.subtext}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Weekly Health Trends Component
 */
export function WeeklyHealthTrends() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const loadTrends = async () => {
      if (!isHealthKitAvailable()) {
        setLoading(false);
        return;
      }

      const granted = await checkHealthKitPermission();
      setHasPermission(granted);

      if (granted) {
        const data = await getWeeklyHealthTrends();
        setTrends(data);
      }
      setLoading(false);
    };

    loadTrends();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-32 bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!hasPermission || !trends) {
    return null;
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-white font-semibold mb-4">This Week</h3>

      {/* Wellness Score Trend */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Wellness Score</span>
          <span className="text-emerald-400 text-sm font-semibold">
            Avg: {trends.averages?.wellnessScore || '--'}
          </span>
        </div>
        <div className="flex items-end gap-1 h-16">
          {trends.days.map((day, i) => {
            const score = day.wellnessScore || 0;
            const height = (score / 100) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    score >= 70 ? 'bg-emerald-500' :
                    score >= 50 ? 'bg-yellow-500' :
                    score > 0 ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                  style={{ height: `${Math.max(4, height)}%` }}
                />
                <span className="text-slate-500 text-xs">{dayLabels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleep Trend */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Sleep Hours</span>
          <span className="text-purple-400 text-sm font-semibold">
            Avg: {trends.averages?.sleepHours || '--'}h
          </span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {trends.days.map((day, i) => {
            const hours = day.sleep?.totalHours || 0;
            const height = (hours / 10) * 100; // 10 hours = full height
            return (
              <div key={i} className="flex-1">
                <div
                  className="w-full bg-purple-500 rounded-t-lg transition-all"
                  style={{ height: `${Math.max(4, height)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Insights */}
      {trends.insights?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-slate-400 text-sm font-medium">Insights</h4>
          {trends.insights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl ${
                insight.type === 'positive' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                insight.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                'bg-slate-700/50'
              }`}
            >
              <span className="text-xl">{insight.icon}</span>
              <div>
                <h5 className="text-white text-sm font-medium">{insight.title}</h5>
                <p className="text-slate-400 text-xs">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mood-Health Correlation Card
 */
export function MoodHealthCorrelation({ moodData, correlationData }) {
  if (!correlationData?.analysis?.insights?.length) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
          <span className="text-xl">🔗</span>
        </div>
        <div>
          <h3 className="text-white font-semibold">Your Patterns</h3>
          <p className="text-slate-400 text-sm">How health affects your mood</p>
        </div>
      </div>

      <div className="space-y-3">
        {correlationData.analysis.insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-4">
            <span className="text-2xl">{insight.icon}</span>
            <div className="flex-1">
              <h4 className="text-white font-medium text-sm">{insight.title}</h4>
              <p className="text-slate-400 text-xs mt-1">{insight.message}</p>
              {insight.strength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          insight.strength === 'strong' ? 'bg-emerald-500 w-full' :
                          insight.strength === 'moderate' ? 'bg-cyan-500 w-2/3' :
                          'bg-slate-500 w-1/3'
                        }`}
                      />
                    </div>
                    <span className="text-slate-500 text-xs capitalize">{insight.strength}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Correlation Numbers */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/50">
        {[
          { label: 'Sleep', value: correlationData.analysis.sleepMoodCorrelation, icon: '😴' },
          { label: 'Activity', value: correlationData.analysis.activityMoodCorrelation, icon: '🏃' },
          { label: 'HRV', value: correlationData.analysis.hrvMoodCorrelation, icon: '💚' }
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-lg mb-1">{item.icon}</div>
            <div className={`text-sm font-semibold ${
              item.value > 0.5 ? 'text-emerald-400' :
              item.value > 0.3 ? 'text-cyan-400' :
              item.value > 0 ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {item.value ? `${Math.round(item.value * 100)}%` : '--'}
            </div>
            <div className="text-slate-500 text-xs">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact Health Widget for Dashboard
 */
export function HealthWidget() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isHealthKitAvailable()) {
        setLoading(false);
        return;
      }

      const granted = await checkHealthKitPermission();
      if (granted) {
        const summary = await getDailyHealthSummary();
        setHealth(summary);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !health) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <span className="text-xl">❤️</span>
          </div>
          <div>
            <div className="text-white font-medium text-sm">Health Today</div>
            <div className="text-slate-400 text-xs">
              {health.steps?.value?.toLocaleString() || 0} steps • {health.sleep?.totalHours || 0}h sleep
            </div>
          </div>
        </div>

        {health.wellnessScore && (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
            health.wellnessScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
            health.wellnessScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {health.wellnessScore}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Hook for Health Data
 */
export function useHealthData() {
  const [data, setData] = useState({
    available: false,
    hasPermission: false,
    today: null,
    weekly: null,
    loading: true
  });

  const refresh = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true }));

    const available = isHealthKitAvailable();
    if (!available) {
      setData({ available: false, hasPermission: false, today: null, weekly: null, loading: false });
      return;
    }

    const hasPermission = await checkHealthKitPermission();
    if (!hasPermission) {
      setData({ available: true, hasPermission: false, today: null, weekly: null, loading: false });
      return;
    }

    const [today, weekly] = await Promise.all([
      getDailyHealthSummary(),
      getWeeklyHealthTrends()
    ]);

    setData({ available: true, hasPermission: true, today, weekly, loading: false });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const result = await requestHealthKitPermission();
    if (result.granted) {
      await refresh();
    }
    return result;
  }, [refresh]);

  return { ...data, refresh, requestPermission };
}

export default {
  HealthKitPermissionCard,
  DailyHealthCard,
  WeeklyHealthTrends,
  MoodHealthCorrelation,
  HealthWidget,
  useHealthData
};
