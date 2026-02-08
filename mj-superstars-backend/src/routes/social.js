import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../database/db.js';


// Sanitization helper function
const sanitize = (str) => str ? str.replace(/<[^>]*>/g, '').trim() : '';

const router = Router();

// Middleware to attach user to request
router.use(authenticateToken);

// POST /posts - Create a social post
router.post('/posts', async (req, res) => {
  try {
    const { post_type, content, share_card_data, photo_id, achievement_id, visibility } = req.body;
    const user_id = req.user.id;

    

    // Validate content if provided
    if (content && typeof content === 'string') {
      const trimmedContent = sanitize(content);
      if (trimmedContent.length === 0) {
        return res.status(400).json({ error: 'Post content cannot be empty or only contain HTML' });
      }
      if (trimmedContent.length > 2000) {
        return res.status(400).json({ error: 'Post content cannot exceed 2000 characters', maxLength: 2000, currentLength: trimmedContent.length });
      }
    }

    // Validate post_type
    const validPostTypes = ['achievement', 'streak_milestone', 'level_up', 'vision_achieved', 'mood_win', 'custom'];
    if (!validPostTypes.includes(post_type)) {
      return res.status(400).json({ error: 'Invalid post_type' });
    }

    // Validate visibility
    const validVisibility = ['buddies', 'public', 'private'];
    const postVisibility = visibility || 'buddies';
    if (!validVisibility.includes(postVisibility)) {
      return res.status(400).json({ error: 'Invalid visibility' });
    }

    const result = await pool.query(
      `INSERT INTO social_posts (user_id, post_type, content, share_card_data, photo_id, achievement_id, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, post_type, content, share_card_data, photo_id, achievement_id, visibility, likes_count, comments_count, created_at`,
      [user_id, post_type, content || null, share_card_data || {}, photo_id || null, achievement_id || null, postVisibility]
    );

    const post = result.rows[0];

    // Award points for creating post
    await pool.query(
      `UPDATE users SET points = COALESCE(points, 0) + 5 WHERE id = $1`,
      [user_id]
    );

    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /feed - Get social feed (paginated)
router.get('/feed', async (req, res) => {
  try {
    const user_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get posts from people user follows or own posts, respecting visibility
    const result = await pool.query(
      `SELECT 
        sp.id,
        sp.user_id,
        sp.post_type,
        sp.content,
        sp.share_card_data,
        sp.photo_id,
        sp.achievement_id,
        sp.visibility,
        sp.likes_count,
        sp.comments_count,
        sp.created_at,
        u.display_name,
        CASE WHEN sl.id IS NOT NULL THEN true ELSE false END as user_liked
       FROM social_posts sp
       JOIN users u ON sp.user_id = u.id
       LEFT JOIN social_likes sl ON sp.id = sl.post_id AND sl.user_id = $1
       WHERE 
         (sp.user_id = $1)
         OR (sp.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1 AND status = 'active')
             AND sp.visibility IN ('buddies', 'public'))
         OR (sp.visibility = 'public' AND sp.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1 AND status = 'active'))
       ORDER BY sp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM social_posts sp
       WHERE 
         (sp.user_id = $1)
         OR (sp.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1 AND status = 'active')
             AND sp.visibility IN ('buddies', 'public'))
         OR (sp.visibility = 'public' AND sp.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1 AND status = 'active'))`,
      [user_id]
    );

    res.json({
      posts: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// GET /posts/:id - Get single post with all comments and likes
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get post with user info
    const postResult = await pool.query(
      `SELECT 
        sp.id,
        sp.user_id,
        sp.post_type,
        sp.content,
        sp.share_card_data,
        sp.photo_id,
        sp.achievement_id,
        sp.visibility,
        sp.likes_count,
        sp.comments_count,
        sp.created_at,
        u.display_name,
        CASE WHEN sl.id IS NOT NULL THEN true ELSE false END as user_liked
       FROM social_posts sp
       JOIN users u ON sp.user_id = u.id
       LEFT JOIN social_likes sl ON sp.id = sl.post_id AND sl.user_id = $1
       WHERE sp.id = $2`,
      [user_id, id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.rows[0];

    // Check visibility
    if (post.visibility === 'private' && post.user_id !== user_id) {
      return res.status(403).json({ error: 'Post is private' });
    }

    if (post.visibility === 'buddies' && post.user_id !== user_id) {
      // Check if current user follows the post author
      const followResult = await pool.query(
        `SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2 AND status = 'active'`,
        [user_id, post.user_id]
      );
      if (followResult.rows.length === 0) {
        return res.status(403).json({ error: 'Post is only visible to buddies' });
      }
    }

    // Get likes with reaction types
    const likesResult = await pool.query(
      `SELECT 
        sl.id,
        sl.user_id,
        sl.reaction_type,
        sl.created_at,
        u.display_name
       FROM social_likes sl
       JOIN users u ON sl.user_id = u.id
       WHERE sl.post_id = $1
       ORDER BY sl.created_at DESC`,
      [id]
    );

    // Get comments
    const commentsResult = await pool.query(
      `SELECT 
        sc.id,
        sc.user_id,
        sc.content,
        sc.created_at,
        u.display_name
       FROM social_comments sc
       JOIN users u ON sc.user_id = u.id
       WHERE sc.post_id = $1
       ORDER BY sc.created_at ASC`,
      [id]
    );

    res.json({
      post,
      likes: likesResult.rows,
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// DELETE /posts/:id - Delete own post
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Verify ownership
    const postResult = await pool.query(
      `SELECT user_id FROM social_posts WHERE id = $1`,
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (postResult.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Cannot delete someone else\'s post' });
    }

    // Delete post (cascades to likes and comments)
    await pool.query(`DELETE FROM social_posts WHERE id = $1`, [id]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /posts/:id/like - Like/react to a post
router.post('/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction_type } = req.body;
    const user_id = req.user.id;

    // Validate reaction_type
    const validReactions = ['like', 'fire', 'clap', 'heart', 'fist_bump'];
    const reactionType = reaction_type || 'like';
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction_type' });
    }

    // Check post exists
    const postResult = await pool.query(
      `SELECT id FROM social_posts WHERE id = $1`,
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await pool.query(
      `SELECT id FROM social_likes WHERE post_id = $1 AND user_id = $2`,
      [id, user_id]
    );

    if (existingLike.rows.length > 0) {
      // Update reaction type
      await pool.query(
        `UPDATE social_likes SET reaction_type = $1 WHERE post_id = $2 AND user_id = $3`,
        [reactionType, id, user_id]
      );
    } else {
      // Insert new like
      await pool.query(
        `INSERT INTO social_likes (post_id, user_id, reaction_type) VALUES ($1, $2, $3)`,
        [id, user_id, reactionType]
      );

      // Increment likes_count
      await pool.query(
        `UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = $1`,
        [id]
      );
    }

    // Get updated post
    const updatedPost = await pool.query(
      `SELECT id, likes_count FROM social_posts WHERE id = $1`,
      [id]
    );

    res.json({
      message: 'Reaction added successfully',
      post: updatedPost.rows[0]
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// DELETE /posts/:id/like - Unlike a post
router.delete('/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if like exists
    const likeResult = await pool.query(
      `SELECT id FROM social_likes WHERE post_id = $1 AND user_id = $2`,
      [id, user_id]
    );

    if (likeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }

    // Delete like
    await pool.query(
      `DELETE FROM social_likes WHERE post_id = $1 AND user_id = $2`,
      [id, user_id]
    );

    // Decrement likes_count
    await pool.query(
      `UPDATE social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1`,
      [id]
    );

    // Get updated post
    const updatedPost = await pool.query(
      `SELECT id, likes_count FROM social_posts WHERE id = $1`,
      [id]
    );

    res.json({
      message: 'Like removed successfully',
      post: updatedPost.rows[0]
    });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

// POST /posts/:id/comments - Add comment to post
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user_id = req.user.id;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const sanitizedContent = sanitize(content);
    if (sanitizedContent.length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty or only contain HTML' });
    }
    if (sanitizedContent.length > 1000) {
      return res.status(400).json({ error: 'Comment content cannot exceed 1000 characters', maxLength: 1000, currentLength: sanitizedContent.length });
    }

    // Check post exists
    const postResult = await pool.query(
      `SELECT id FROM social_posts WHERE id = $1`,
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Insert comment
    const commentResult = await pool.query(
      `INSERT INTO social_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, content, created_at`,
      [id, user_id, sanitizedContent]
    );

    // Increment comments_count
    await pool.query(
      `UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = $1`,
      [id]
    );

    // Award points for commenting
    await pool.query(
      `UPDATE users SET points = COALESCE(points, 0) + 2 WHERE id = $1`,
      [user_id]
    );

    // Get user display name
    const userResult = await pool.query(
      `SELECT display_name FROM users WHERE id = $1`,
      [user_id]
    );

    const comment = commentResult.rows[0];
    comment.display_name = userResult.rows[0].display_name;

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /comments/:id - Delete own comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get comment and verify ownership
    const commentResult = await pool.query(
      `SELECT user_id, post_id FROM social_comments WHERE id = $1`,
      [id]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentResult.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Cannot delete someone else\'s comment' });
    }

    const post_id = commentResult.rows[0].post_id;

    // Delete comment
    await pool.query(`DELETE FROM social_comments WHERE id = $1`, [id]);

    // Decrement comments_count
    await pool.query(
      `UPDATE social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1`,
      [post_id]
    );

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /follow/:userId - Follow a user
router.post('/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const follower_id = req.user.id;

    // Check that user is not following themselves
    if (userId === follower_id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check that target user exists
    const userResult = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await pool.query(
      `SELECT id, status FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [follower_id, userId]
    );

    if (existingFollow.rows.length > 0) {
      // If blocked, unblock; otherwise already following
      if (existingFollow.rows[0].status === 'blocked') {
        await pool.query(
          `UPDATE user_follows SET status = 'active' WHERE follower_id = $1 AND following_id = $2`,
          [follower_id, userId]
        );
      } else {
        return res.status(400).json({ error: 'Already following this user' });
      }
    } else {
      // Insert new follow
      await pool.query(
        `INSERT INTO user_follows (follower_id, following_id, status) VALUES ($1, $2, 'active')`,
        [follower_id, userId]
      );
    }

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /follow/:userId - Unfollow a user
router.delete('/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const follower_id = req.user.id;

    // Check if following
    const followResult = await pool.query(
      `SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2 AND status = 'active'`,
      [follower_id, userId]
    );

    if (followResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    // Delete follow
    await pool.query(
      `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [follower_id, userId]
    );

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /followers - Get user's followers list
router.get('/followers', async (req, res) => {
  try {
    const user_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT 
        uf.id,
        uf.follower_id as user_id,
        u.display_name,
        uf.created_at
       FROM user_follows uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.following_id = $1 AND uf.status = 'active'
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM user_follows WHERE following_id = $1 AND status = 'active'`,
      [user_id]
    );

    res.json({
      followers: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /following - Get user's following list
router.get('/following', async (req, res) => {
  try {
    const user_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT 
        uf.id,
        uf.following_id as user_id,
        u.display_name,
        uf.created_at
       FROM user_follows uf
       JOIN users u ON uf.following_id = u.id
       WHERE uf.follower_id = $1 AND uf.status = 'active'
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM user_follows WHERE follower_id = $1 AND status = 'active'`,
      [user_id]
    );

    res.json({
      following: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// POST /posts/:id/share-external - Generate share data for external platforms
router.post('/posts/:id/share-external', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get post details
    const postResult = await pool.query(
      `SELECT 
        sp.id,
        sp.post_type,
        sp.content,
        sp.share_card_data,
        u.display_name
       FROM social_posts sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.id = $1`,
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.rows[0];

    // Generate share text
    const shareText = `${post.display_name} just shared a ${post.post_type.replace(/_/g, ' ')} on MJ Superstars! ${post.content ? `"${post.content}"` : ''}`;
    const appLink = `https://mjsuperstars.app/post/${id}`;
    const encodedText = encodeURIComponent(shareText);
    const encodedLink = encodeURIComponent(appLink);

    // Generate share URLs and content for different platforms
    const shareData = {
      text: shareText,
      appLink: appLink,
      platforms: {
        facebook: {
          url: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
          type: 'url_share'
        },
        twitter: {
          url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`,
          type: 'url_share'
        },
        x: {
          url: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedLink}`,
          type: 'url_share'
        },
        instagram: {
          text: shareText,
          type: 'copy_text',
          note: 'Instagram does not support direct sharing via URL. Use native share sheet.'
        },
        whatsapp: {
          url: `https://wa.me/?text=${encodedText}%20${encodedLink}`,
          type: 'url_share'
        },
        sms: {
          text: `${shareText} ${appLink}`,
          type: 'native_share'
        }
      }
    };

    // Save external share record if provided
    if (req.body.platform) {
      const platform = req.body.platform;
      await pool.query(
        `UPDATE social_posts 
         SET external_shares = jsonb_set(external_shares, $1, $2)
         WHERE id = $3`,
        [`{${platform}}`, JSON.stringify({ shared_at: new Date().toISOString(), user_id }), id]
      );
    }

    res.json(shareData);
  } catch (error) {
    console.error('Error generating share data:', error);
    res.status(500).json({ error: 'Failed to generate share data' });
  }
});

// GET /discover - Discover public posts from non-followed users
router.get('/discover', async (req, res) => {
  try {
    const user_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get public posts from users not being followed
    const result = await pool.query(
      `SELECT 
        sp.id,
        sp.user_id,
        sp.post_type,
        sp.content,
        sp.share_card_data,
        sp.photo_id,
        sp.achievement_id,
        sp.visibility,
        sp.likes_count,
        sp.comments_count,
        sp.created_at,
        u.display_name,
        CASE WHEN sl.id IS NOT NULL THEN true ELSE false END as user_liked
       FROM social_posts sp
       JOIN users u ON sp.user_id = u.id
       LEFT JOIN social_likes sl ON sp.id = sl.post_id AND sl.user_id = $1
       WHERE 
         sp.visibility = 'public'
         AND sp.user_id != $1
         AND sp.user_id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = $1 AND status = 'active')
         AND u.profile_visibility = 'public'
       ORDER BY sp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM social_posts sp
       JOIN users u ON sp.user_id = u.id
       WHERE 
         sp.visibility = 'public'
         AND sp.user_id != $1
         AND sp.user_id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = $1 AND status = 'active')
         AND u.profile_visibility = 'public'`,
      [user_id]
    );

    res.json({
      posts: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error discovering posts:', error);
    res.status(500).json({ error: 'Failed to discover posts' });
  }
});

export default router;
