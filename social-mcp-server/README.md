# Social Media MCP Server

An MCP (Model Context Protocol) server for integrating social media data into AI applications. Built for use with MJ's Superstars coaching app to personalize conversations based on users' social media communication patterns.

## Features

- **Twitter/X Integration**: Fetch user profiles and recent tweets
- **Instagram Integration**: Fetch user profiles and recent posts
- **Communication Style Analysis**: Analyze writing patterns to build personalization profiles

## Tools

| Tool | Description |
|------|-------------|
| `social_get_twitter_profile` | Get Twitter/X user profile info |
| `social_get_twitter_posts` | Fetch recent tweets from a user |
| `social_get_instagram_profile` | Get Instagram user profile info |
| `social_get_instagram_posts` | Fetch recent Instagram posts |
| `social_analyze_communication_style` | Analyze writing style from posts |

## Setup

### Prerequisites

- Node.js >= 18
- Twitter/X API Bearer Token (for Twitter tools)
- Instagram Graph API Access Token (for Instagram tools)

### Installation

```bash
cd social-mcp-server
npm install
npm run build
```

### Environment Variables

```bash
# For Twitter/X integration
export TWITTER_BEARER_TOKEN="your_twitter_bearer_token"

# For Instagram integration
export INSTAGRAM_ACCESS_TOKEN="your_instagram_access_token"

# Optional: Transport mode
export TRANSPORT="stdio"  # or "http"
export PORT="3000"        # for HTTP transport
```

### Getting API Keys

#### Twitter/X API
1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Create a project and app
3. Generate a Bearer Token
4. Copy the token to `TWITTER_BEARER_TOKEN`

#### Instagram Graph API
1. Set up a Facebook Developer account
2. Create an app with Instagram Graph API access
3. Connect a Business or Creator Instagram account
4. Generate an access token
5. Copy to `INSTAGRAM_ACCESS_TOKEN`

## Usage

### stdio Transport (Local)

```bash
npm start
```

### HTTP Transport (Remote)

```bash
TRANSPORT=http PORT=3000 npm start
```

### With MCP Client

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "social": {
      "command": "node",
      "args": ["/path/to/social-mcp-server/dist/index.js"],
      "env": {
        "TWITTER_BEARER_TOKEN": "your_token",
        "INSTAGRAM_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

## Example Usage

### Get Twitter Profile
```json
{
  "tool": "social_get_twitter_profile",
  "arguments": {
    "username": "elonmusk",
    "response_format": "json"
  }
}
```

### Analyze Communication Style
```json
{
  "tool": "social_analyze_communication_style",
  "arguments": {
    "posts": [
      "Just shipped a new feature! So excited 🚀",
      "Love working with this team fr fr",
      "Another day another bug to squash lol"
    ],
    "platform": "twitter"
  }
}
```

**Output:**
```json
{
  "vocabulary_level": "simple",
  "tone": "casual",
  "emoji_usage": "occasional",
  "avg_post_length": 42,
  "common_topics": ["work", "tech"],
  "sentiment": "positive",
  "vernacular": "gen_z",
  "sample_phrases": ["Just shipped a new feature!", "Love working with this team"]
}
```

## Integration with MJ's Superstars

This MCP server is designed to work with the MJ's Superstars coaching app. The communication style analysis can be used to:

1. **Mirror user's language**: Adapt MJ's responses to match user's vocabulary and tone
2. **Understand interests**: Personalize coaching based on common topics
3. **Match energy**: Adjust formality and emoji usage to feel natural

## Privacy Considerations

- Only public profile data is accessed
- Users must consent to sharing their social handles
- Data is processed locally for style analysis
- No data is stored or transmitted beyond the immediate request

## License

MIT
