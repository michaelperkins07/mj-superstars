// ============================================================
// Trending Topics Service
// Fetches wellness/mental health news from RSS feeds
// Provides MJ with awareness of current topics & events
// ============================================================

import { logger } from '../utils/logger.js';

// In-memory cache for trending topics
let cachedTopics = [];
let lastFetchTime = 0;
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// RSS feed URLs — mental health, wellness, and general news
const RSS_FEEDS = [
  {
    url: 'https://www.nimh.nih.gov/news/feed',
    category: 'mental_health_research',
    label: 'Mental Health Research'
  },
  {
    url: 'https://www.psychologytoday.com/us/blog/feed',
    category: 'psychology',
    label: 'Psychology'
  },
  {
    url: 'https://feeds.bbci.co.uk/news/health/rss.xml',
    category: 'health_news',
    label: 'Health News'
  },
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
    category: 'health_news',
    label: 'Health'
  }
];

/**
 * Simple RSS parser using built-in fetch
 * Parses basic RSS/Atom feed XML without external dependencies
 */
async function parseRSSFeed(feedUrl, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MJSuperstars/1.0 (Mental Health App)' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const xml = await response.text();

    // Simple XML parsing for RSS items
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const itemXml = match[1];
      const title = extractTag(itemXml, 'title');
      const description = extractTag(itemXml, 'description');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');

      if (title) {
        items.push({
          title: cleanHtml(title),
          description: cleanHtml(description || '').substring(0, 200),
          link,
          pubDate: pubDate ? new Date(pubDate).toISOString() : null
        });
      }
    }

    // Also check for Atom entries
    if (items.length === 0) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      while ((match = entryRegex.exec(xml)) !== null && items.length < 5) {
        const entryXml = match[1];
        const title = extractTag(entryXml, 'title');
        const summary = extractTag(entryXml, 'summary') || extractTag(entryXml, 'content');
        const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/);
        const link = linkMatch ? linkMatch[1] : '';

        if (title) {
          items.push({
            title: cleanHtml(title),
            description: cleanHtml(summary || '').substring(0, 200),
            link
          });
        }
      }
    }

    return items;
  } catch (error) {
    logger.warn(`Failed to fetch RSS feed ${feedUrl}:`, error.message);
    return [];
  }
}

function extractTag(xml, tag) {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Regular tag extraction
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function cleanHtml(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch and cache trending topics from all sources
 */
async function fetchTrendingTopics() {
  const now = Date.now();

  // Return cached if still fresh
  if (cachedTopics.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedTopics;
  }

  logger.info('Fetching fresh trending topics from RSS feeds...');

  const allTopics = [];

  // Fetch all feeds in parallel with individual timeouts
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const items = await parseRSSFeed(feed.url);
      return items.map(item => ({
        ...item,
        category: feed.category,
        source: feed.label
      }));
    })
  );

  for (const result of feedResults) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allTopics.push(...result.value);
    }
  }

  // Sort by recency (if pubDate available) and limit
  const sortedTopics = allTopics
    .sort((a, b) => {
      if (a.pubDate && b.pubDate) return new Date(b.pubDate) - new Date(a.pubDate);
      return 0;
    })
    .slice(0, 10);

  // Update cache
  if (sortedTopics.length > 0) {
    cachedTopics = sortedTopics;
    lastFetchTime = now;
    logger.info(`Cached ${sortedTopics.length} trending topics`);
  } else {
    logger.warn('No trending topics fetched from any source');
  }

  return cachedTopics;
}

/**
 * Get a summary of trending topics for MJ's system prompt
 * Returns a concise string suitable for context injection
 */
async function getTrendingSummary() {
  try {
    const topics = await fetchTrendingTopics();

    if (topics.length === 0) {
      return null;
    }

    // Build a concise summary for the system prompt
    const summaryItems = topics.slice(0, 5).map(t =>
      `- "${t.title}" (${t.source})`
    );

    return summaryItems.join('\n');
  } catch (error) {
    logger.warn('Failed to get trending summary:', error.message);
    return null;
  }
}

export const TrendingService = {
  fetchTrendingTopics,
  getTrendingSummary
};

export default TrendingService;
