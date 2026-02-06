// ============================================================
// MJ's Superstars - HealthKit Integration Service
// Correlates health data with mood for deeper insights
// ============================================================

import { isNative } from './native';

// HealthKit data types we want to access
const HEALTH_DATA_TYPES = {
  // Read permissions
  read: [
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierRestingHeartRate',
    'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
    'HKQuantityTypeIdentifierSleepAnalysis',
    'HKCategoryTypeIdentifierSleepAnalysis',
    'HKQuantityTypeIdentifierOxygenSaturation',
    'HKQuantityTypeIdentifierRespiratoryRate'
  ],
  // Write permissions
  write: [
    'HKCategoryTypeIdentifierMindfulSession'
  ]
};

// Check if HealthKit is available
export function isHealthKitAvailable() {
  return isNative && typeof window !== 'undefined' && window.Capacitor?.Plugins?.HealthKit;
}

// Get HealthKit plugin reference
function getHealthKit() {
  if (!isHealthKitAvailable()) {
    console.warn('HealthKit not available');
    return null;
  }
  return window.Capacitor.Plugins.HealthKit;
}

/**
 * Request HealthKit authorization
 */
export async function requestHealthKitPermission() {
  const healthKit = getHealthKit();
  if (!healthKit) return { granted: false, reason: 'unavailable' };

  try {
    const result = await healthKit.requestAuthorization({
      read: HEALTH_DATA_TYPES.read,
      write: HEALTH_DATA_TYPES.write
    });

    return { granted: result.authorized, reason: result.authorized ? 'granted' : 'denied' };
  } catch (err) {
    console.error('HealthKit authorization error:', err);
    return { granted: false, reason: 'error', error: err.message };
  }
}

/**
 * Check HealthKit authorization status
 */
export async function checkHealthKitPermission() {
  const healthKit = getHealthKit();
  if (!healthKit) return false;

  try {
    const result = await healthKit.checkAuthorization({
      read: HEALTH_DATA_TYPES.read,
      write: HEALTH_DATA_TYPES.write
    });
    return result.authorized;
  } catch (err) {
    console.error('HealthKit check error:', err);
    return false;
  }
}

/**
 * Get step count for a date range
 */
export async function getStepCount(startDate, endDate) {
  const healthKit = getHealthKit();
  if (!healthKit) return null;

  try {
    const result = await healthKit.queryQuantityType({
      type: 'HKQuantityTypeIdentifierStepCount',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      aggregation: 'sum'
    });

    return {
      value: Math.round(result.value || 0),
      unit: 'steps',
      startDate,
      endDate
    };
  } catch (err) {
    console.error('Error fetching step count:', err);
    return null;
  }
}

/**
 * Get heart rate data for a date range
 */
export async function getHeartRate(startDate, endDate) {
  const healthKit = getHealthKit();
  if (!healthKit) return null;

  try {
    const result = await healthKit.queryQuantityType({
      type: 'HKQuantityTypeIdentifierHeartRate',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      aggregation: 'average'
    });

    return {
      average: Math.round(result.value || 0),
      unit: 'bpm',
      startDate,
      endDate
    };
  } catch (err) {
    console.error('Error fetching heart rate:', err);
    return null;
  }
}

/**
 * Get resting heart rate
 */
export async function getRestingHeartRate(startDate, endDate) {
  const healthKit = getHealthKit();
  if (!healthKit) return null;

  try {
    const result = await healthKit.queryQuantityType({
      type: 'HKQuantityTypeIdentifierRestingHeartRate',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      aggregation: 'average'
    });

    return {
      value: Math.round(result.value || 0),
      unit: 'bpm',
      startDate,
      endDate
    };
  } catch (err) {
    console.error('Error fetching resting heart rate:', err);
    return null;
  }
}

/**
 * Get heart rate variability (HRV)
 */
export async function getHeartRateVariability(startDate, endDate) {
  const healthKit = getHealthKit();
  if (!healthKit) return null;

  try {
    const result = await healthKit.queryQuantityType({
      type: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      aggregation: 'average'
    });

    return {
      value: Math.round(result.value || 0),
      unit: 'ms',
      startDate,
      endDate
    };
  } catch (err) {
    console.error('Error fetching HRV:', err);
    return null;
  }
}

/**
 * Get sleep analysis data
 */
export async function getSleepAnalysis(startDate, endDate) {
  const healthKit = getHealthKit();
  if (!healthKit) return null;

  try {
    const result = await healthKit.queryCategoryType({
      type: 'HKCategoryTypeIdentifierSleepAnalysis',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Process sleep samples
    const sleepSamples = result.samples || [];

    let totalSleepMinutes = 0;
    let deepSleepMinutes = 0;
    let remSleepMinutes = 0;
    let lightSleepMinutes = 0;
    let awakeMinutes = 0;

    sleepSamples.forEach(sample => {
      const duration = (new Date(sample.endDate) - new Date(sample.startDate)) / 60000;

      switch (sample.value) {
        case 0: // In bed
          break;
        case 1: // Asleep (unspecified)
          totalSleepMinutes += duration;
          lightSleepMinutes += duration;
          break;
        case 2: // Awake
          awakeMinutes += duration;
          break;
        case 3: // Core/light sleep
          totalSleepMinutes += duration;
          lightSleepMinutes += duration;
          break;
        case 4: // Deep sleep
          totalSleepMinutes += duration;
          deepSleepMinutes += duration;
          break;
        case 5: // REM sleep
          totalSleepMinutes += duration;
          remSleepMinutes += duration;
          break;
      }
    });

    return {
      totalHours: Math.round(totalSleepMinutes / 60 * 10) / 10,
      deepSleepHours: Math.round(deepSleepMinutes / 60 * 10) / 10,
      remSleepHours: Math.round(remSleepMinutes / 60 * 10) / 10,
      lightSleepHours: Math.round(lightSleepMinutes / 60 * 10) / 10,
      awakeMinutes: Math.round(awakeMinutes),
      quality: calculateSleepQuality(totalSleepMinutes, deepSleepMinutes, remSleepMinutes),
      startDate,
      endDate
    };
  } catch (err) {
    console.error('Error fetching sleep data:', err);
    return null;
  }
}

/**
 * Calculate sleep quality score (0-100)
 */
function calculateSleepQuality(totalMinutes, deepMinutes, remMinutes) {
  if (totalMinutes === 0) return 0;

  // Ideal: 7-9 hours total, 13-23% deep, 20-25% REM
  const totalHours = totalMinutes / 60;
  const deepPercent = (deepMinutes / totalMinutes) * 100;
  const remPercent = (remMinutes / totalMinutes) * 100;

  let score = 0;

  // Duration score (max 40 points)
  if (totalHours >= 7 && totalHours <= 9) {
    score += 40;
  } else if (totalHours >= 6 && totalHours < 7) {
    score += 30;
  } else if (totalHours >= 5 && totalHours < 6) {
    score += 20;
  } else if (totalHours > 9) {
    score += 30;
  } else {
    score += 10;
  }

  // Deep sleep score (max 30 points)
  if (deepPercent >= 13 && deepPercent <= 23) {
    score += 30;
  } else if (deepPercent >= 10 || deepPercent <= 28) {
    score += 20;
  } else {
    score += 10;
  }

  // REM sleep score (max 30 points)
  if (remPercent >= 20 && remPercent <= 25) {
    score += 30;
  } else if (remPercent >= 15 || remPercent <= 30) {
    score += 20;
  } else {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Get active energy burned (calories)
 */
export async function getActiveEnergy(startDate, endDate) {
  const healthKit = getHealthKit();
  if (!healthKit) return null;

  try {
    const result = await healthKit.queryQuantityType({
      type: 'HKQuantityTypeIdentifierActiveEnergyBurned',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      aggregation: 'sum'
    });

    return {
      value: Math.round(result.value || 0),
      unit: 'kcal',
      startDate,
      endDate
    };
  } catch (err) {
    console.error('Error fetching active energy:', err);
    return null;
  }
}

/**
 * Log a mindful session to HealthKit
 */
export async function logMindfulSession(durationMinutes, startDate = new Date()) {
  const healthKit = getHealthKit();
  if (!healthKit) return false;

  try {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    await healthKit.writeCategoryType({
      type: 'HKCategoryTypeIdentifierMindfulSession',
      value: 0, // Not applicable value
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    return true;
  } catch (err) {
    console.error('Error logging mindful session:', err);
    return false;
  }
}

/**
 * Get comprehensive daily health summary
 */
export async function getDailyHealthSummary(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // For sleep, look at the previous night
  const sleepStart = new Date(startOfDay);
  sleepStart.setDate(sleepStart.getDate() - 1);
  sleepStart.setHours(20, 0, 0, 0); // 8 PM previous day

  const sleepEnd = new Date(startOfDay);
  sleepEnd.setHours(12, 0, 0, 0); // Noon current day

  const [steps, heartRate, restingHR, hrv, sleep, activeEnergy] = await Promise.all([
    getStepCount(startOfDay, endOfDay),
    getHeartRate(startOfDay, endOfDay),
    getRestingHeartRate(startOfDay, endOfDay),
    getHeartRateVariability(startOfDay, endOfDay),
    getSleepAnalysis(sleepStart, sleepEnd),
    getActiveEnergy(startOfDay, endOfDay)
  ]);

  return {
    date,
    steps,
    heartRate,
    restingHeartRate: restingHR,
    hrv,
    sleep,
    activeEnergy,
    wellnessScore: calculateWellnessScore({ steps, heartRate, restingHR, hrv, sleep, activeEnergy })
  };
}

/**
 * Calculate overall wellness score from health metrics
 */
function calculateWellnessScore(data) {
  let score = 50; // Start at baseline
  let factors = 0;

  // Steps contribution (goal: 10,000)
  if (data.steps?.value) {
    factors++;
    const stepScore = Math.min(100, (data.steps.value / 10000) * 100);
    score += (stepScore - 50) * 0.2;
  }

  // Sleep contribution
  if (data.sleep?.quality) {
    factors++;
    score += (data.sleep.quality - 50) * 0.3;
  }

  // HRV contribution (higher is generally better, 50ms is baseline)
  if (data.hrv?.value) {
    factors++;
    const hrvScore = Math.min(100, (data.hrv.value / 50) * 50);
    score += (hrvScore - 50) * 0.2;
  }

  // Resting heart rate (lower is generally better, 60 is ideal)
  if (data.restingHR?.value) {
    factors++;
    const rhrScore = Math.max(0, 100 - Math.abs(data.restingHR.value - 60) * 2);
    score += (rhrScore - 50) * 0.15;
  }

  // Active energy (goal: 500 kcal)
  if (data.activeEnergy?.value) {
    factors++;
    const energyScore = Math.min(100, (data.activeEnergy.value / 500) * 100);
    score += (energyScore - 50) * 0.15;
  }

  return factors > 0 ? Math.round(Math.max(0, Math.min(100, score))) : null;
}

/**
 * Get weekly health trends
 */
export async function getWeeklyHealthTrends() {
  const trends = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const summary = await getDailyHealthSummary(date);
    trends.push(summary);
  }

  return {
    days: trends,
    averages: calculateWeeklyAverages(trends),
    insights: generateHealthInsights(trends)
  };
}

/**
 * Calculate weekly averages
 */
function calculateWeeklyAverages(days) {
  const validDays = days.filter(d => d.wellnessScore !== null);
  if (validDays.length === 0) return null;

  return {
    wellnessScore: Math.round(validDays.reduce((sum, d) => sum + (d.wellnessScore || 0), 0) / validDays.length),
    steps: Math.round(validDays.reduce((sum, d) => sum + (d.steps?.value || 0), 0) / validDays.length),
    sleepHours: Math.round(validDays.reduce((sum, d) => sum + (d.sleep?.totalHours || 0), 0) / validDays.length * 10) / 10,
    sleepQuality: Math.round(validDays.reduce((sum, d) => sum + (d.sleep?.quality || 0), 0) / validDays.length),
    restingHR: Math.round(validDays.reduce((sum, d) => sum + (d.restingHeartRate?.value || 0), 0) / validDays.length),
    hrv: Math.round(validDays.reduce((sum, d) => sum + (d.hrv?.value || 0), 0) / validDays.length)
  };
}

/**
 * Generate health insights based on trends
 */
function generateHealthInsights(days) {
  const insights = [];
  const averages = calculateWeeklyAverages(days);
  if (!averages) return insights;

  // Sleep insights
  if (averages.sleepHours < 7) {
    insights.push({
      type: 'warning',
      category: 'sleep',
      title: 'Sleep Duration Low',
      message: `You're averaging ${averages.sleepHours} hours of sleep. Aim for 7-9 hours for optimal wellbeing.`,
      icon: '😴'
    });
  } else if (averages.sleepHours >= 7 && averages.sleepQuality >= 70) {
    insights.push({
      type: 'positive',
      category: 'sleep',
      title: 'Great Sleep!',
      message: 'Your sleep duration and quality are excellent this week.',
      icon: '⭐'
    });
  }

  // Activity insights
  if (averages.steps < 5000) {
    insights.push({
      type: 'suggestion',
      category: 'activity',
      title: 'Move More',
      message: `${averages.steps.toLocaleString()} daily steps is below recommended. Try a short walk!`,
      icon: '🚶'
    });
  } else if (averages.steps >= 10000) {
    insights.push({
      type: 'positive',
      category: 'activity',
      title: 'Active Week!',
      message: `Amazing! You're averaging ${averages.steps.toLocaleString()} steps daily.`,
      icon: '🏃'
    });
  }

  // HRV insights (stress indicator)
  if (averages.hrv < 30) {
    insights.push({
      type: 'warning',
      category: 'stress',
      title: 'Stress Indicator',
      message: 'Your HRV suggests elevated stress. Consider breathing exercises.',
      icon: '🧘'
    });
  } else if (averages.hrv > 50) {
    insights.push({
      type: 'positive',
      category: 'stress',
      title: 'Well Recovered',
      message: 'Your HRV indicates good recovery and low stress levels.',
      icon: '💚'
    });
  }

  // Resting heart rate insights
  if (averages.restingHR > 80) {
    insights.push({
      type: 'info',
      category: 'heart',
      title: 'Elevated Resting HR',
      message: 'Your resting heart rate is slightly elevated. Stay hydrated and rested.',
      icon: '❤️'
    });
  }

  return insights;
}

/**
 * Correlate mood entries with health data
 */
export async function correlateMoodWithHealth(moodEntries) {
  if (!moodEntries?.length) return null;

  const correlations = [];

  for (const entry of moodEntries) {
    const entryDate = new Date(entry.timestamp || entry.created_at);
    const healthData = await getDailyHealthSummary(entryDate);

    correlations.push({
      date: entryDate,
      mood: entry.score,
      health: healthData
    });
  }

  return {
    data: correlations,
    analysis: analyzeCorrelations(correlations)
  };
}

/**
 * Analyze correlations between mood and health metrics
 */
function analyzeCorrelations(correlations) {
  if (correlations.length < 3) {
    return { insufficient: true, message: 'Need more data points for analysis' };
  }

  const analysis = {
    sleepMoodCorrelation: null,
    activityMoodCorrelation: null,
    hrvMoodCorrelation: null,
    insights: []
  };

  // Calculate correlations
  const validSleep = correlations.filter(c => c.health?.sleep?.quality);
  const validSteps = correlations.filter(c => c.health?.steps?.value);
  const validHRV = correlations.filter(c => c.health?.hrv?.value);

  if (validSleep.length >= 3) {
    analysis.sleepMoodCorrelation = calculateCorrelation(
      validSleep.map(c => c.health.sleep.quality),
      validSleep.map(c => c.mood)
    );

    if (analysis.sleepMoodCorrelation > 0.5) {
      analysis.insights.push({
        type: 'correlation',
        title: 'Sleep affects your mood',
        message: 'Better sleep is strongly associated with higher mood scores for you.',
        strength: 'strong',
        icon: '🌙'
      });
    }
  }

  if (validSteps.length >= 3) {
    analysis.activityMoodCorrelation = calculateCorrelation(
      validSteps.map(c => c.health.steps.value),
      validSteps.map(c => c.mood)
    );

    if (analysis.activityMoodCorrelation > 0.5) {
      analysis.insights.push({
        type: 'correlation',
        title: 'Movement boosts your mood',
        message: 'You tend to feel better on days with more physical activity.',
        strength: 'strong',
        icon: '🏃'
      });
    }
  }

  if (validHRV.length >= 3) {
    analysis.hrvMoodCorrelation = calculateCorrelation(
      validHRV.map(c => c.health.hrv.value),
      validHRV.map(c => c.mood)
    );

    if (analysis.hrvMoodCorrelation > 0.4) {
      analysis.insights.push({
        type: 'correlation',
        title: 'Recovery matters',
        message: 'Higher HRV (better recovery) correlates with better moods.',
        strength: 'moderate',
        icon: '💚'
      });
    }
  }

  return analysis;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

export default {
  isHealthKitAvailable,
  requestHealthKitPermission,
  checkHealthKitPermission,
  getStepCount,
  getHeartRate,
  getRestingHeartRate,
  getHeartRateVariability,
  getSleepAnalysis,
  getActiveEnergy,
  logMindfulSession,
  getDailyHealthSummary,
  getWeeklyHealthTrends,
  correlateMoodWithHealth
};
