// ============================================================
// MJ's Superstars - Mood Helpers
// ============================================================

export const moodEmoji = (score) => {
  const emojis = ['😢', '😔', '😐', '🙂', '😄'];
  return emojis[Math.max(0, Math.min(4, (score || 3) - 1))];
};

export const moodLabel = (score) => {
  const labels = ['Struggling', 'Down', 'Okay', 'Good', 'Great'];
  return labels[Math.max(0, Math.min(4, (score || 3) - 1))];
};
