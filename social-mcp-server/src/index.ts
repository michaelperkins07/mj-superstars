#!/usr/bin/env node
/**
 * Social Media MCP Server v2.0
 *
 * Enhanced with deeper analysis capabilities:
 * - Posting pattern analysis (timing, frequency, engagement)
 * - Interaction network analysis (who they engage with)
 * - Content theme extraction
 * - Emotional tone tracking over time
 * - Communication style evolution
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import axios, { AxiosError } from "axios";

// ============ CONSTANTS ============
const CHARACTER_LIMIT = 25000;
const TWITTER_API_URL = "https://api.twitter.com/2";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

// ============ TYPES ============
interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  location?: string;
  created_at?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  profile_image_url?: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  entities?: {
    mentions?: Array<{ username: string }>;
    hashtags?: Array<{ tag: string }>;
  };
  referenced_tweets?: Array<{ type: string; id: string }>;
}

interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  profile_picture_url?: string;
}

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface PostingPattern {
  most_active_hours: number[];
  most_active_days: string[];
  avg_posts_per_day: number;
  posting_consistency: "sporadic" | "occasional" | "regular" | "frequent";
  peak_engagement_time: string;
}

interface EngagementProfile {
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  engagement_rate: number;
  top_performing_topics: string[];
  audience_responsiveness: "low" | "moderate" | "high" | "viral";
}

interface InteractionNetwork {
  frequently_mentioned: string[];
  frequently_replied_to: string[];
  common_hashtags: string[];
  community_signals: string[];
}

interface EmotionalTimeline {
  overall_sentiment: "negative" | "neutral" | "positive" | "mixed";
  sentiment_trend: "declining" | "stable" | "improving";
  emotional_range: "narrow" | "moderate" | "wide";
  peak_positive_topics: string[];
  stress_indicators: string[];
}

interface DeepStyleAnalysis {
  vocabulary_level: "simple" | "moderate" | "sophisticated";
  tone: "casual" | "neutral" | "formal";
  emoji_usage: "none" | "occasional" | "frequent";
  avg_post_length: number;
  common_topics: string[];
  sentiment: "negative" | "neutral" | "positive" | "mixed";
  vernacular: string;
  sample_phrases: string[];
  // New deep analysis fields
  posting_patterns: PostingPattern;
  engagement_profile: EngagementProfile;
  interaction_network: InteractionNetwork;
  emotional_timeline: EmotionalTimeline;
  personality_signals: string[];
  communication_evolution: string;
}

// ============ ENUMS ============
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// ============ ZOD SCHEMAS ============
const TwitterProfileInputSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .max(15, "Twitter username cannot exceed 15 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Invalid Twitter username format")
    .describe("Twitter/X username (without @ symbol)"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.JSON)
    .describe("Output format")
}).strict();

const TwitterPostsInputSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .max(15, "Twitter username cannot exceed 15 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Invalid Twitter username format")
    .describe("Twitter/X username (without @ symbol)"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum number of tweets to fetch (1-100)"),
  include_replies: z.boolean()
    .default(false)
    .describe("Whether to include reply tweets"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.JSON)
    .describe("Output format")
}).strict();

const InstagramProfileInputSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .max(30, "Instagram username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9._]+$/, "Invalid Instagram username format")
    .describe("Instagram username"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.JSON)
    .describe("Output format")
}).strict();

const InstagramPostsInputSchema = z.object({
  username: z.string()
    .min(1, "Username is required")
    .max(30, "Instagram username cannot exceed 30 characters")
    .describe("Instagram username"),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(30)
    .describe("Maximum number of posts to fetch (1-50)"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.JSON)
    .describe("Output format")
}).strict();

const DeepAnalysisInputSchema = z.object({
  posts: z.array(z.object({
    text: z.string(),
    timestamp: z.string().optional(),
    likes: z.number().optional(),
    comments: z.number().optional(),
    shares: z.number().optional(),
    mentions: z.array(z.string()).optional(),
    hashtags: z.array(z.string()).optional(),
    is_reply: z.boolean().optional()
  }))
    .min(5, "At least 5 posts required for deep analysis")
    .max(200, "Maximum 200 posts allowed")
    .describe("Array of social media posts with metadata"),
  platform: z.enum(["twitter", "instagram", "mixed"])
    .default("mixed")
    .describe("Source platform for context-aware analysis"),
  include_patterns: z.boolean()
    .default(true)
    .describe("Include posting pattern analysis"),
  include_engagement: z.boolean()
    .default(true)
    .describe("Include engagement profile analysis"),
  include_network: z.boolean()
    .default(true)
    .describe("Include interaction network analysis"),
  include_emotional: z.boolean()
    .default(true)
    .describe("Include emotional timeline analysis")
}).strict();

const BasicAnalysisInputSchema = z.object({
  posts: z.array(z.string())
    .min(1, "At least one post is required")
    .max(100, "Maximum 100 posts allowed")
    .describe("Array of post texts to analyze"),
  platform: z.enum(["twitter", "instagram", "mixed"])
    .default("mixed")
    .describe("Source platform")
}).strict();

// ============ TYPE INFERENCE ============
type TwitterProfileInput = z.infer<typeof TwitterProfileInputSchema>;
type TwitterPostsInput = z.infer<typeof TwitterPostsInputSchema>;
type InstagramProfileInput = z.infer<typeof InstagramProfileInputSchema>;
type InstagramPostsInput = z.infer<typeof InstagramPostsInputSchema>;
type DeepAnalysisInput = z.infer<typeof DeepAnalysisInputSchema>;
type BasicAnalysisInput = z.infer<typeof BasicAnalysisInputSchema>;

// ============ API CLIENTS ============
async function makeTwitterRequest<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN environment variable is required");
  }

  const response = await axios.get(`${TWITTER_API_URL}/${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${bearerToken}`,
      "Content-Type": "application/json"
    },
    params,
    timeout: 30000
  });

  return response.data;
}

async function makeInstagramRequest<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN environment variable is required");
  }

  const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/${endpoint}`, {
    params: {
      ...params,
      access_token: accessToken
    },
    timeout: 30000
  });

  return response.data;
}

// ============ ERROR HANDLING ============
function handleApiError(error: unknown, platform: string): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          return `Error: ${platform} authentication failed. Check API credentials.`;
        case 403:
          return `Error: Access denied. ${platform} API key may lack permissions.`;
        case 404:
          return `Error: User not found on ${platform}. Check username.`;
        case 429:
          return `Error: ${platform} rate limit exceeded. Wait before retrying.`;
        default:
          return `Error: ${platform} API failed (${status})`;
      }
    } else if (error.code === "ECONNABORTED") {
      return `Error: ${platform} request timed out.`;
    }
  }
  if (error instanceof Error) return `Error: ${error.message}`;
  return `Error: Unexpected error accessing ${platform}`;
}

// ============ ANALYSIS HELPERS ============

function analyzePostingPatterns(posts: DeepAnalysisInput["posts"]): PostingPattern {
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let totalPosts = 0;
  let dateRange = 1;
  let firstDate: Date | null = null;
  let lastDate: Date | null = null;

  for (const post of posts) {
    if (post.timestamp) {
      const date = new Date(post.timestamp);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        const day = days[date.getDay()];

        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
        totalPosts++;

        if (!firstDate || date < firstDate) firstDate = date;
        if (!lastDate || date > lastDate) lastDate = date;
      }
    }
  }

  if (firstDate && lastDate) {
    dateRange = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Find most active hours
  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  // Find most active days
  const sortedDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);

  const avgPostsPerDay = totalPosts / dateRange;
  let consistency: PostingPattern["posting_consistency"];
  if (avgPostsPerDay < 0.2) consistency = "sporadic";
  else if (avgPostsPerDay < 0.5) consistency = "occasional";
  else if (avgPostsPerDay < 2) consistency = "regular";
  else consistency = "frequent";

  // Peak engagement time
  const peakHour = sortedHours[0] || 12;
  const period = peakHour < 12 ? "morning" : peakHour < 17 ? "afternoon" : peakHour < 21 ? "evening" : "night";

  return {
    most_active_hours: sortedHours,
    most_active_days: sortedDays,
    avg_posts_per_day: Math.round(avgPostsPerDay * 100) / 100,
    posting_consistency: consistency,
    peak_engagement_time: `${period} (around ${peakHour}:00)`
  };
}

function analyzeEngagement(posts: DeepAnalysisInput["posts"]): EngagementProfile {
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let postsWithMetrics = 0;

  const topicEngagement: Record<string, number> = {};

  for (const post of posts) {
    if (post.likes !== undefined || post.comments !== undefined) {
      totalLikes += post.likes || 0;
      totalComments += post.comments || 0;
      totalShares += post.shares || 0;
      postsWithMetrics++;

      // Track topic performance
      const engagement = (post.likes || 0) + (post.comments || 0) * 2;
      const topics = extractTopics(post.text);
      for (const topic of topics) {
        topicEngagement[topic] = (topicEngagement[topic] || 0) + engagement;
      }
    }
  }

  const avgLikes = postsWithMetrics > 0 ? totalLikes / postsWithMetrics : 0;
  const avgComments = postsWithMetrics > 0 ? totalComments / postsWithMetrics : 0;
  const avgShares = postsWithMetrics > 0 ? totalShares / postsWithMetrics : 0;
  const engagementRate = postsWithMetrics > 0 ? (totalLikes + totalComments + totalShares) / postsWithMetrics : 0;

  let responsiveness: EngagementProfile["audience_responsiveness"];
  if (engagementRate < 5) responsiveness = "low";
  else if (engagementRate < 20) responsiveness = "moderate";
  else if (engagementRate < 100) responsiveness = "high";
  else responsiveness = "viral";

  const topPerforming = Object.entries(topicEngagement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    avg_likes: Math.round(avgLikes * 10) / 10,
    avg_comments: Math.round(avgComments * 10) / 10,
    avg_shares: Math.round(avgShares * 10) / 10,
    engagement_rate: Math.round(engagementRate * 10) / 10,
    top_performing_topics: topPerforming,
    audience_responsiveness: responsiveness
  };
}

function analyzeInteractionNetwork(posts: DeepAnalysisInput["posts"]): InteractionNetwork {
  const mentionCounts: Record<string, number> = {};
  const hashtagCounts: Record<string, number> = {};
  const replyCounts: Record<string, number> = {};

  for (const post of posts) {
    // Count mentions
    if (post.mentions) {
      for (const mention of post.mentions) {
        mentionCounts[mention] = (mentionCounts[mention] || 0) + 1;
      }
    }

    // Count hashtags
    if (post.hashtags) {
      for (const tag of post.hashtags) {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      }
    }

    // Track replies (simplified - would need more data in real implementation)
    if (post.is_reply && post.mentions && post.mentions.length > 0) {
      const replyTo = post.mentions[0];
      replyCounts[replyTo] = (replyCounts[replyTo] || 0) + 1;
    }
  }

  const frequentlyMentioned = Object.entries(mentionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user]) => user);

  const frequentlyRepliedTo = Object.entries(replyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user]) => user);

  const commonHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  // Infer community signals from hashtags
  const communitySignals: string[] = [];
  const communityPatterns: Record<string, RegExp> = {
    "tech community": /tech|dev|coding|programming|startup|ai|ml/i,
    "fitness community": /fitness|gym|workout|health|running|crossfit/i,
    "creative community": /art|design|creative|photography|music|writing/i,
    "gaming community": /gaming|gamer|esports|twitch|streamer/i,
    "parenting community": /mom|dad|parent|family|kids|children/i,
    "mental health awareness": /mentalhealth|anxiety|depression|selfcare|wellness/i
  };

  for (const tag of commonHashtags) {
    for (const [community, pattern] of Object.entries(communityPatterns)) {
      if (pattern.test(tag) && !communitySignals.includes(community)) {
        communitySignals.push(community);
      }
    }
  }

  return {
    frequently_mentioned: frequentlyMentioned,
    frequently_replied_to: frequentlyRepliedTo,
    common_hashtags: commonHashtags,
    community_signals: communitySignals.slice(0, 3)
  };
}

function analyzeEmotionalTimeline(posts: DeepAnalysisInput["posts"]): EmotionalTimeline {
  const sentimentScores: number[] = [];
  const positiveTopics: Record<string, number> = {};
  const stressIndicators: string[] = [];

  const positivePatterns = /\b(love|great|amazing|awesome|happy|excited|wonderful|fantastic|beautiful|best|good|nice|excellent|perfect|grateful|blessed|proud|thrilled|delighted)\b/gi;
  const negativePatterns = /\b(hate|terrible|awful|sad|angry|frustrated|annoyed|bad|worst|horrible|disappointed|sucks|damn|ugh|stressed|anxious|overwhelmed|exhausted|tired|depressed)\b/gi;
  const stressPatterns = /\b(stressed|overwhelmed|anxious|can't sleep|exhausted|burned out|burnout|too much|breaking point|falling apart|struggling)\b/gi;

  for (const post of posts) {
    const text = post.text;
    const positiveMatches = (text.match(positivePatterns) || []).length;
    const negativeMatches = (text.match(negativePatterns) || []).length;

    const score = positiveMatches - negativeMatches;
    sentimentScores.push(score);

    // Track what topics correlate with positive sentiment
    if (score > 0) {
      const topics = extractTopics(text);
      for (const topic of topics) {
        positiveTopics[topic] = (positiveTopics[topic] || 0) + score;
      }
    }

    // Detect stress indicators
    const stressMatches = text.match(stressPatterns);
    if (stressMatches) {
      for (const match of stressMatches) {
        if (!stressIndicators.includes(match.toLowerCase())) {
          stressIndicators.push(match.toLowerCase());
        }
      }
    }
  }

  // Calculate overall sentiment
  const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
  let overallSentiment: EmotionalTimeline["overall_sentiment"];
  if (avgSentiment < -0.5) overallSentiment = "negative";
  else if (avgSentiment > 0.5) overallSentiment = "positive";
  else if (sentimentScores.some(s => s > 1) && sentimentScores.some(s => s < -1)) overallSentiment = "mixed";
  else overallSentiment = "neutral";

  // Calculate trend (compare first half to second half)
  const midpoint = Math.floor(sentimentScores.length / 2);
  const firstHalfAvg = sentimentScores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint || 0;
  const secondHalfAvg = sentimentScores.slice(midpoint).reduce((a, b) => a + b, 0) / (sentimentScores.length - midpoint) || 0;

  let trend: EmotionalTimeline["sentiment_trend"];
  if (secondHalfAvg - firstHalfAvg > 0.3) trend = "improving";
  else if (firstHalfAvg - secondHalfAvg > 0.3) trend = "declining";
  else trend = "stable";

  // Emotional range
  const maxScore = Math.max(...sentimentScores);
  const minScore = Math.min(...sentimentScores);
  const range = maxScore - minScore;

  let emotionalRange: EmotionalTimeline["emotional_range"];
  if (range < 2) emotionalRange = "narrow";
  else if (range < 5) emotionalRange = "moderate";
  else emotionalRange = "wide";

  const peakPositive = Object.entries(positiveTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  return {
    overall_sentiment: overallSentiment,
    sentiment_trend: trend,
    emotional_range: emotionalRange,
    peak_positive_topics: peakPositive,
    stress_indicators: stressIndicators.slice(0, 5)
  };
}

function extractTopics(text: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    "tech": ["tech", "code", "software", "app", "startup", "ai", "data", "programming", "developer"],
    "fitness": ["workout", "gym", "fitness", "health", "exercise", "training", "run", "lift"],
    "food": ["food", "eat", "restaurant", "cooking", "recipe", "dinner", "lunch", "coffee"],
    "travel": ["travel", "trip", "vacation", "flight", "hotel", "adventure", "explore"],
    "work": ["work", "job", "career", "meeting", "project", "deadline", "team", "office"],
    "personal": ["feel", "feeling", "life", "love", "family", "friend", "happy", "sad"],
    "entertainment": ["movie", "show", "music", "game", "watch", "play", "concert", "book"],
    "social": ["party", "friends", "weekend", "hanging", "fun", "night out"]
  };

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        if (!found.includes(topic)) found.push(topic);
        break;
      }
    }
  }

  return found;
}

function analyzeBasicStyle(posts: string[]): Partial<DeepStyleAnalysis> {
  const allText = posts.join(" ");
  const words = allText.split(/\s+/).filter(Boolean);

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 5;
  const vocabularyLevel: DeepStyleAnalysis["vocabulary_level"] =
    avgWordLength < 4.5 ? "simple" : avgWordLength > 6 ? "sophisticated" : "moderate";

  const casualMarkers = (allText.match(/\b(lol|haha|yeah|yep|nope|gonna|wanna|kinda|tbh|ngl|idk|rn|fr|lowkey|highkey|bruh|bro|dude|like|literally|basically|omg|wtf|lmao)\b/gi) || []).length;
  const formalMarkers = (allText.match(/\b(therefore|however|furthermore|additionally|consequently|nevertheless|regarding|concerning|appreciate|certainly|sincerely)\b/gi) || []).length;
  const tone: DeepStyleAnalysis["tone"] =
    casualMarkers > formalMarkers * 2 ? "casual" : formalMarkers > casualMarkers ? "formal" : "neutral";

  const emojiCount = (allText.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
  const emojiUsage: DeepStyleAnalysis["emoji_usage"] =
    emojiCount === 0 ? "none" : emojiCount > posts.length ? "frequent" : "occasional";

  const avgPostLength = Math.round(allText.length / posts.length);

  // Topics
  const allTopics: string[] = [];
  for (const post of posts) {
    allTopics.push(...extractTopics(post));
  }
  const topicCounts: Record<string, number> = {};
  for (const t of allTopics) {
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  }
  const commonTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  // Sentiment
  const positiveWords = (allText.match(/\b(love|great|amazing|awesome|happy|excited|wonderful|fantastic|beautiful|best|good|nice|excellent|perfect)\b/gi) || []).length;
  const negativeWords = (allText.match(/\b(hate|terrible|awful|sad|angry|frustrated|annoyed|bad|worst|horrible|disappointed|sucks)\b/gi) || []).length;
  let sentiment: DeepStyleAnalysis["sentiment"];
  if (positiveWords > negativeWords * 2) sentiment = "positive";
  else if (negativeWords > positiveWords * 2) sentiment = "negative";
  else if (positiveWords > 0 && negativeWords > 0) sentiment = "mixed";
  else sentiment = "neutral";

  // Vernacular
  const vernacularPatterns: Record<string, RegExp> = {
    "gen_z": /\b(fr|ngl|lowkey|highkey|slay|bet|no cap|bussin|sus|mid|valid|hits different|understood the assignment)\b/gi,
    "millennial": /\b(adulting|literally can't|i'm dead|mood|same|goals|basic|extra|canceled|tea|wig)\b/gi,
    "southern": /\b(y'all|fixin|reckon|might could|bless|ain't)\b/gi,
    "urban": /\b(lit|fam|squad|clout|flex|drip|cap|slaps|fire|facts)\b/gi
  };

  let vernacular = "standard";
  let maxMatches = 0;
  for (const [style, pattern] of Object.entries(vernacularPatterns)) {
    const matches = (allText.match(pattern) || []).length;
    if (matches > maxMatches && matches >= 2) {
      maxMatches = matches;
      vernacular = style;
    }
  }

  // Sample phrases
  const samplePhrases: string[] = [];
  for (const post of posts.slice(0, 10)) {
    const sentences = post.split(/[.!?]+/).filter(s => s.trim().length > 10 && s.trim().length < 100);
    if (sentences.length > 0) {
      samplePhrases.push(sentences[0].trim());
    }
    if (samplePhrases.length >= 5) break;
  }

  return {
    vocabulary_level: vocabularyLevel,
    tone,
    emoji_usage: emojiUsage,
    avg_post_length: avgPostLength,
    common_topics: commonTopics,
    sentiment,
    vernacular,
    sample_phrases: samplePhrases
  };
}

function inferPersonalitySignals(
  style: Partial<DeepStyleAnalysis>,
  patterns: PostingPattern,
  engagement: EngagementProfile,
  emotional: EmotionalTimeline
): string[] {
  const signals: string[] = [];

  // From posting patterns
  if (patterns.posting_consistency === "frequent") {
    signals.push("highly engaged online presence");
  } else if (patterns.posting_consistency === "sporadic") {
    signals.push("selective sharer");
  }

  if (patterns.most_active_hours.some(h => h >= 22 || h <= 5)) {
    signals.push("night owl tendencies");
  } else if (patterns.most_active_hours.some(h => h >= 5 && h <= 8)) {
    signals.push("early riser");
  }

  // From engagement
  if (engagement.audience_responsiveness === "high" || engagement.audience_responsiveness === "viral") {
    signals.push("influential voice in their community");
  }

  // From emotional analysis
  if (emotional.emotional_range === "wide") {
    signals.push("emotionally expressive");
  } else if (emotional.emotional_range === "narrow") {
    signals.push("emotionally measured");
  }

  if (emotional.stress_indicators.length > 3) {
    signals.push("may be experiencing elevated stress");
  }

  // From style
  if (style.tone === "casual" && style.emoji_usage === "frequent") {
    signals.push("warm and approachable communicator");
  } else if (style.tone === "formal") {
    signals.push("professional communicator");
  }

  if (style.vernacular === "gen_z") {
    signals.push("culturally current, likely younger demographic");
  }

  return signals.slice(0, 5);
}

function inferCommunicationEvolution(
  patterns: PostingPattern,
  emotional: EmotionalTimeline
): string {
  const parts: string[] = [];

  if (emotional.sentiment_trend === "improving") {
    parts.push("Their recent posts show more positive sentiment than earlier ones");
  } else if (emotional.sentiment_trend === "declining") {
    parts.push("Recent posts show a dip in positivity compared to earlier ones");
  }

  if (patterns.posting_consistency === "frequent") {
    parts.push("They maintain a consistent presence");
  }

  if (emotional.stress_indicators.length > 0) {
    parts.push(`Some stress signals detected: ${emotional.stress_indicators.slice(0, 2).join(", ")}`);
  }

  if (parts.length === 0) {
    return "Communication patterns appear stable and consistent.";
  }

  return parts.join(". ") + ".";
}

// ============ SERVER SETUP ============
const server = new McpServer({
  name: "social-mcp-server",
  version: "2.0.0"
});

// ============ TOOL REGISTRATIONS ============

// Twitter Profile Tool
server.registerTool(
  "social_get_twitter_profile",
  {
    title: "Get Twitter/X Profile",
    description: `Fetch a Twitter/X user's public profile information including bio, location, and follower counts.`,
    inputSchema: TwitterProfileInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  async (params: TwitterProfileInput) => {
    try {
      const response = await makeTwitterRequest<{ data: TwitterUser }>(
        `users/by/username/${params.username}`,
        { "user.fields": "id,name,username,description,location,created_at,public_metrics,profile_image_url" }
      );

      const user = response.data;
      const output = {
        id: user.id,
        username: user.username,
        name: user.name,
        description: user.description || "",
        location: user.location || "",
        followers_count: user.public_metrics?.followers_count || 0,
        following_count: user.public_metrics?.following_count || 0,
        tweet_count: user.public_metrics?.tweet_count || 0,
        created_at: user.created_at || "",
        profile_image_url: user.profile_image_url || ""
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error, "Twitter") }], isError: true };
    }
  }
);

// Twitter Posts Tool (Enhanced)
server.registerTool(
  "social_get_twitter_posts",
  {
    title: "Get Twitter/X Posts",
    description: `Fetch recent tweets with full metadata including mentions, hashtags, and engagement metrics.`,
    inputSchema: TwitterPostsInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  async (params: TwitterPostsInput) => {
    try {
      const userResponse = await makeTwitterRequest<{ data: { id: string } }>(
        `users/by/username/${params.username}`
      );
      const userId = userResponse.data.id;

      const tweetsResponse = await makeTwitterRequest<{ data?: Tweet[]; meta?: { result_count: number } }>(
        `users/${userId}/tweets`,
        {
          max_results: params.limit,
          "tweet.fields": "id,text,created_at,public_metrics,entities,referenced_tweets",
          exclude: params.include_replies ? "" : "replies"
        }
      );

      const tweets = tweetsResponse.data || [];
      const output = {
        username: params.username,
        total: tweets.length,
        tweets: tweets.map(t => ({
          id: t.id,
          text: t.text,
          timestamp: t.created_at || "",
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          replies: t.public_metrics?.reply_count || 0,
          mentions: t.entities?.mentions?.map(m => m.username) || [],
          hashtags: t.entities?.hashtags?.map(h => h.tag) || [],
          is_reply: t.referenced_tweets?.some(r => r.type === "replied_to") || false
        }))
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error, "Twitter") }], isError: true };
    }
  }
);

// Instagram Profile Tool
server.registerTool(
  "social_get_instagram_profile",
  {
    title: "Get Instagram Profile",
    description: `Fetch Instagram user profile information.`,
    inputSchema: InstagramProfileInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  async (params: InstagramProfileInput) => {
    try {
      const response = await makeInstagramRequest<InstagramUser>(
        "me",
        { fields: "id,username,name,biography,media_count,followers_count,follows_count,profile_picture_url" }
      );

      const output = {
        id: response.id,
        username: response.username,
        name: response.name || "",
        biography: response.biography || "",
        media_count: response.media_count || 0,
        followers_count: response.followers_count || 0,
        follows_count: response.follows_count || 0,
        profile_picture_url: response.profile_picture_url || ""
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error, "Instagram") }], isError: true };
    }
  }
);

// Instagram Posts Tool
server.registerTool(
  "social_get_instagram_posts",
  {
    title: "Get Instagram Posts",
    description: `Fetch recent Instagram posts with captions and engagement metrics.`,
    inputSchema: InstagramPostsInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  async (params: InstagramPostsInput) => {
    try {
      const response = await makeInstagramRequest<{ data: InstagramPost[] }>(
        "me/media",
        { fields: "id,caption,media_type,timestamp,like_count,comments_count,permalink", limit: params.limit }
      );

      const posts = response.data || [];
      const output = {
        username: params.username,
        total: posts.length,
        posts: posts.map(p => ({
          id: p.id,
          text: p.caption || "",
          timestamp: p.timestamp || "",
          likes: p.like_count || 0,
          comments: p.comments_count || 0,
          media_type: p.media_type,
          permalink: p.permalink || ""
        }))
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error, "Instagram") }], isError: true };
    }
  }
);

// Basic Style Analysis Tool
server.registerTool(
  "social_analyze_communication_style",
  {
    title: "Analyze Communication Style (Basic)",
    description: `Basic analysis of writing style from social media posts. For deeper analysis with patterns, engagement, and emotional tracking, use social_deep_analyze.`,
    inputSchema: BasicAnalysisInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  async (params: BasicAnalysisInput) => {
    try {
      const analysis = analyzeBasicStyle(params.posts);
      const output = { platform: params.platform, posts_analyzed: params.posts.length, ...analysis };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// NEW: Deep Analysis Tool
server.registerTool(
  "social_deep_analyze",
  {
    title: "Deep Social Media Analysis",
    description: `Comprehensive analysis of social media presence including:
- Posting patterns (timing, frequency, consistency)
- Engagement profile (likes, comments, top-performing topics)
- Interaction network (who they engage with, communities)
- Emotional timeline (sentiment trends, stress indicators)
- Personality signals and communication evolution

Requires posts with metadata (timestamps, engagement counts, mentions).

Returns a complete profile for personalization.`,
    inputSchema: DeepAnalysisInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  async (params: DeepAnalysisInput) => {
    try {
      // Basic style analysis
      const postTexts = params.posts.map(p => p.text);
      const basicStyle = analyzeBasicStyle(postTexts);

      // Deep analyses
      const postingPatterns = params.include_patterns
        ? analyzePostingPatterns(params.posts)
        : undefined;

      const engagementProfile = params.include_engagement
        ? analyzeEngagement(params.posts)
        : undefined;

      const interactionNetwork = params.include_network
        ? analyzeInteractionNetwork(params.posts)
        : undefined;

      const emotionalTimeline = params.include_emotional
        ? analyzeEmotionalTimeline(params.posts)
        : undefined;

      // Infer personality signals
      const personalitySignals = (postingPatterns && engagementProfile && emotionalTimeline)
        ? inferPersonalitySignals(basicStyle, postingPatterns, engagementProfile, emotionalTimeline)
        : [];

      // Communication evolution
      const communicationEvolution = (postingPatterns && emotionalTimeline)
        ? inferCommunicationEvolution(postingPatterns, emotionalTimeline)
        : "Insufficient data for evolution analysis.";

      const output: Partial<DeepStyleAnalysis> & { platform: string; posts_analyzed: number } = {
        platform: params.platform,
        posts_analyzed: params.posts.length,
        ...basicStyle,
        ...(postingPatterns && { posting_patterns: postingPatterns }),
        ...(engagementProfile && { engagement_profile: engagementProfile }),
        ...(interactionNetwork && { interaction_network: interactionNetwork }),
        ...(emotionalTimeline && { emotional_timeline: emotionalTimeline }),
        personality_signals: personalitySignals,
        communication_evolution: communicationEvolution
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// ============ MAIN ENTRY POINTS ============
async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Social MCP server v2.0 running via stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "social-mcp-server", version: "2.0.0" });
  });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    console.error(`Social MCP server v2.0 running on http://localhost:${port}/mcp`);
  });
}

const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch(error => { console.error("Server error:", error); process.exit(1); });
} else {
  runStdio().catch(error => { console.error("Server error:", error); process.exit(1); });
}
