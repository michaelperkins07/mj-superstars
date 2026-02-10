import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../database/db.js';



// Sanitization helper function
const sanitize = (str) => str ? str.replace(/<[^>]*>/g, '').trim() : '';

const router = Router();

// Middleware to verify photo ownership
const verifyPhotoOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT user_id FROM user_photos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (result.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to access this photo' });
    }

    next();
  } catch (error) {
    console.error('Error verifying photo ownership:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Utility function to add points to user account
const awardPoints = async (userId, points, reason) => {
  try {
    await pool.query(
      'UPDATE users SET total_points = COALESCE(total_points, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [points, userId]
    );
  } catch (error) {
    console.error('Error awarding points:', error);
  }
};

// Helper function to validate base64 string size
const validateBase64Size = (base64String, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const sizeInBytes = Buffer.byteLength(base64String, 'utf8') * 0.75; // Rough estimate
  return sizeInBytes <= maxSizeBytes;
};

// Helper function to extract mime type from base64 data URL
const getMimeTypeFromDataUrl = (dataUrl) => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'application/octet-stream';
};

// POST /upload - Upload a photo
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { base64Data, photo_type, caption, tags = [], related_id, related_type, is_private = true } = req.body;

    // Validate required fields
    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }
    if (!photo_type || !['progress', 'vision_board', 'journal', 'mood', 'profile', 'share_card'].includes(photo_type)) {
      return res.status(400).json({ error: 'Valid photo_type is required' });
    }

    // Validate size
    if (!validateBase64Size(base64Data, 5)) {
      return res.status(400).json({ error: 'Photo exceeds 5MB limit' });
    }

    // Validate caption if provided
    if (caption && typeof caption === 'string') {
      const sanitizedCaption = sanitize(caption);
      if (sanitizedCaption.length > 500) {
        return res.status(400).json({ error: 'Caption cannot exceed 500 characters', maxLength: 500, currentLength: sanitizedCaption.length });
      }
    }

    // Create data URL (format: data:image/type;base64,...)
    const mimeType = getMimeTypeFromDataUrl(base64Data);
    const url = base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;

    // For now, thumbnail is same as original (placeholder for future resize)
    const thumbnail_url = url;

    // Validate related fields if provided
    let relatedTypeValue = null;
    if (related_id && related_type) {
      if (!['journal', 'mood', 'task', 'achievement'].includes(related_type)) {
        return res.status(400).json({ error: 'Invalid related_type' });
      }
      relatedTypeValue = related_type;
    }

    // Insert photo
    const photoResult = await pool.query(
      `INSERT INTO user_photos (user_id, photo_type, url, thumbnail_url, caption, tags, related_id, related_type, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, photo_type, url, thumbnail_url, caption || null, tags, related_id || null, relatedTypeValue, is_private]
    );

    const photo = photoResult.rows[0];

    // Award points based on photo type
    const pointsMap = {
      'progress': 5,
      'vision_board': 10,
      'journal': 3,
      'mood': 2,
      'profile': 0,
      'share_card': 5
    };

    const pointsToAward = pointsMap[photo_type] || 0;
    if (pointsToAward > 0) {
      await awardPoints(userId, pointsToAward, `Photo upload: ${photo_type}`);
    }

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo,
      pointsAwarded: pointsToAward
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - Get all user's photos with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, photo_type } = req.query;

    const offset = (page - 1) * limit;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    let query = 'SELECT * FROM user_photos WHERE user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (photo_type) {
      query += ` AND photo_type = $${paramIndex}`;
      queryParams.push(photo_type);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    queryParams.push(limitNum, offset);

    const photosResult = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM user_photos WHERE user_id = $1';
    let countParams = [userId];
    if (photo_type) {
      countQuery += ' AND photo_type = $2';
      countParams.push(photo_type);
    }
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      photos: photosResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /progress - Get progress photos timeline
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM user_photos
       WHERE user_id = $1 AND photo_type = 'progress'
       ORDER BY created_at DESC`,
      [userId]
    );

    // Group by week/month
    const grouped = {};
    result.rows.forEach((photo) => {
      const date = new Date(photo.created_at);
      const yearWeek = `${date.getFullYear()}-W${String(Math.ceil((date.getDate() - date.getDay() + 6) / 7)).padStart(2, '0')}`;

      if (!grouped[yearWeek]) {
        grouped[yearWeek] = [];
      }
      grouped[yearWeek].push(photo);
    });

    res.json({
      timeline: Object.entries(grouped)
        .sort(([weekA], [weekB]) => weekB.localeCompare(weekA))
        .map(([week, photos]) => ({
          week,
          photos,
          count: photos.length
        }))
    });
  } catch (error) {
    console.error('Error fetching progress timeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - Get single photo
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM user_photos
       WHERE id = $1 AND (user_id = $2 OR is_private = false)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({ photo: result.rows[0] });
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - Update photo metadata
router.put('/:id', authenticateToken, verifyPhotoOwnership, async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, tags, is_private } = req.body;

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (caption !== undefined) {
      updates.push(`caption = $${paramIndex}`);
      values.push(caption);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(tags);
      paramIndex++;
    }

    if (is_private !== undefined) {
      updates.push(`is_private = $${paramIndex}`);
      values.push(is_private);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `UPDATE user_photos
                   SET ${updates.join(', ')}
                   WHERE id = $1
                   RETURNING *`;

    const result = await pool.query(query, values);

    res.json({
      message: 'Photo updated successfully',
      photo: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - Delete a photo
router.delete('/:id', authenticateToken, verifyPhotoOwnership, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM user_photos WHERE id = $1', [id]);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vision-board - Create/update vision board
router.post('/vision-board', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, is_public } = req.body;

    // Check if vision board exists
    const existingResult = await pool.query(
      'SELECT * FROM vision_boards WHERE user_id = $1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing vision board
      const result = await pool.query(
        `UPDATE vision_boards
         SET title = COALESCE($2, title),
             description = COALESCE($3, description),
             is_public = COALESCE($4, is_public),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [userId, title || null, description || null, is_public !== undefined ? is_public : null]
      );
      return res.json({
        message: 'Vision board updated successfully',
        visionBoard: result.rows[0]
      });
    } else {
      // Create new vision board
      const result = await pool.query(
        `INSERT INTO vision_boards (user_id, title, description, is_public)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, title || 'My Vision Board', description || null, is_public || false]
      );
      return res.status(201).json({
        message: 'Vision board created successfully',
        visionBoard: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error managing vision board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vision-board - Get user's vision board with items
router.get('/vision-board', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get or create vision board
    let boardResult = await pool.query(
      'SELECT * FROM vision_boards WHERE user_id = $1',
      [userId]
    );

    let board = boardResult.rows[0];

    if (!board) {
      const createResult = await pool.query(
        `INSERT INTO vision_boards (user_id, title, description, is_public)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'My Vision Board', null, false]
      );
      board = createResult.rows[0];
    }

    // Get vision board items
    const itemsResult = await pool.query(
      `SELECT * FROM vision_board_items
       WHERE board_id = $1
       ORDER BY sort_order ASC`,
      [board.id]
    );

    res.json({
      visionBoard: board,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching vision board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vision-board/items - Add item to vision board
router.post('/vision-board/items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { photo_id, photo_url, caption, goal_text, sort_order } = req.body;

    if (!photo_id && !photo_url) {
      return res.status(400).json({ error: 'photo_id or photo_url is required' });
    }

    // Validate goal_text if provided
    if (goal_text && typeof goal_text === 'string') {
      const sanitizedGoalText = sanitize(goal_text);
      if (sanitizedGoalText.length > 200) {
        return res.status(400).json({ error: 'Goal text cannot exceed 200 characters', maxLength: 200, currentLength: sanitizedGoalText.length });
      }
    }

    // Validate caption if provided
    if (caption && typeof caption === 'string') {
      const sanitizedCaption = sanitize(caption);
      if (sanitizedCaption.length > 500) {
        return res.status(400).json({ error: 'Caption cannot exceed 500 characters', maxLength: 500, currentLength: sanitizedCaption.length });
      }
    }

    // Get user's vision board (create if doesn't exist)
    let boardResult = await pool.query(
      'SELECT * FROM vision_boards WHERE user_id = $1',
      [userId]
    );

    let board = boardResult.rows[0];

    if (!board) {
      const createResult = await pool.query(
        `INSERT INTO vision_boards (user_id, title, description, is_public)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'My Vision Board', null, false]
      );
      board = createResult.rows[0];
    }

    // Determine sort order
    let itemSortOrder = sort_order;
    if (itemSortOrder === undefined) {
      const posResult = await pool.query(
        'SELECT MAX(sort_order) as max_pos FROM vision_board_items WHERE board_id = $1',
        [board.id]
      );
      itemSortOrder = (posResult.rows[0].max_pos || 0) + 1;
    }

    // Insert item
    const itemResult = await pool.query(
      `INSERT INTO vision_board_items (board_id, photo_id, caption, goal_text, sort_order, is_achieved)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [board.id, photo_id || null, caption || null, goal_text || null, itemSortOrder, false]
    );

    const item = itemResult.rows[0];

    // Award points for adding vision board item
    await awardPoints(userId, 10, 'Vision board item added');

    res.status(201).json({
      message: 'Item added to vision board successfully',
      item,
      pointsAwarded: 10
    });
  } catch (error) {
    console.error('Error adding vision board item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /vision-board/items/:id - Update vision board item
router.put('/vision-board/items/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { caption, goal_text, sort_order, is_achieved } = req.body;

    // Verify ownership
    const itemResult = await pool.query(
      `SELECT vbi.*, vb.user_id FROM vision_board_items vbi
       JOIN vision_boards vb ON vbi.board_id = vb.id
       WHERE vbi.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vision board item not found' });
    }

    if (itemResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this item' });
    }

    const currentItem = itemResult.rows[0];
    let pointsAwarded = 0;

    // Check if marking as achieved for the first time
    if (is_achieved === true && !currentItem.is_achieved) {
      pointsAwarded = 25;
      await awardPoints(userId, pointsAwarded, 'Vision board item achieved');
    }

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (caption !== undefined) {
      updates.push(`caption = $${paramIndex}`);
      values.push(caption);
      paramIndex++;
    }

    if (goal_text !== undefined) {
      updates.push(`goal_text = $${paramIndex}`);
      values.push(goal_text);
      paramIndex++;
    }

    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex}`);
      values.push(sort_order);
      paramIndex++;
    }

    if (is_achieved !== undefined) {
      updates.push(`is_achieved = $${paramIndex}`);
      values.push(is_achieved);
      paramIndex++;
      if (is_achieved) {
        updates.push(`achieved_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE vision_board_items
                   SET ${updates.join(', ')}
                   WHERE id = $1
                   RETURNING *`;

    const updateResult = await pool.query(query, values);

    res.json({
      message: 'Vision board item updated successfully',
      item: updateResult.rows[0],
      pointsAwarded
    });
  } catch (error) {
    console.error('Error updating vision board item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /vision-board/items/:id - Remove item from vision board
router.delete('/vision-board/items/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const itemResult = await pool.query(
      `SELECT vbi.*, vb.user_id FROM vision_board_items vbi
       JOIN vision_boards vb ON vbi.board_id = vb.id
       WHERE vbi.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vision board item not found' });
    }

    if (itemResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this item' });
    }

    await pool.query('DELETE FROM vision_board_items WHERE id = $1', [id]);

    res.json({ message: 'Vision board item deleted successfully' });
  } catch (error) {
    console.error('Error deleting vision board item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
