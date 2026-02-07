// ============================================================
// Coping Toolkit Routes
// ============================================================

import { Router } from 'express';
import { body, param } from 'express-validator';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import validate from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/coping/tools - Get all coping tools
// ============================================================
router.get('/tools',
  asyncHandler(async (req, res) => {
    const { category } = req.query;

    // Get user's custom tools
    let userToolsQuery = `SELECT * FROM coping_tools WHERE user_id = $1`;
    const params = [req.user.id];

    if (category) {
      userToolsQuery += ` AND category = $2`;
      params.push(category);
    }

    const userTools = await query(userToolsQuery + ' ORDER BY times_used DESC', params);

    // Get default tools (user_id is NULL)
    let defaultToolsQuery = `SELECT * FROM coping_tools WHERE user_id IS NULL`;
    const defaultParams = [];

    if (category) {
      defaultToolsQuery += ` AND category = $1`;
      defaultParams.push(category);
    }

    const defaultTools = await query(defaultToolsQuery + ' ORDER BY name', defaultParams);

    res.json({
      user_tools: userTools.rows,
      default_tools: defaultTools.rows,
      categories: ['breathing', 'grounding', 'distraction', 'social', 'physical']
    });
  })
);

// ============================================================
// GET /api/coping/tools/:id - Get single tool
// ============================================================
router.get('/tools/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM coping_tools WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Tool not found', 404, 'NOT_FOUND');
    }

    // Get recent usage stats
    const stats = await query(
      `SELECT
         COUNT(*) as uses,
         AVG(mood_after - mood_before)::NUMERIC(3,2) as avg_improvement,
         AVG(effectiveness)::NUMERIC(3,2) as avg_effectiveness
       FROM coping_tool_uses
       WHERE tool_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    res.json({
      tool: result.rows[0],
      stats: stats.rows[0]
    });
  })
);

// ============================================================
// POST /api/coping/tools - Create custom tool
// ============================================================
router.post('/tools',
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim(),
    body('category').isIn(['breathing', 'grounding', 'distraction', 'social', 'physical']),
    body('steps').optional().isArray(),
    body('duration_minutes').optional().isInt({ min: 1, max: 120 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, description, category, steps = [], duration_minutes } = req.body;

    const result = await query(
      `INSERT INTO coping_tools (user_id, name, description, category, steps, duration_minutes, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [req.user.id, name, description, category, JSON.stringify(steps), duration_minutes]
    );

    res.status(201).json({
      tool: result.rows[0],
      message: 'Tool added to your toolkit'
    });
  })
);

// ============================================================
// PUT /api/coping/tools/:id - Update custom tool
// ============================================================
router.put('/tools/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { name, description, steps, duration_minutes } = req.body;

    const result = await query(
      `UPDATE coping_tools
       SET
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         steps = COALESCE($5, steps),
         duration_minutes = COALESCE($6, duration_minutes)
       WHERE id = $1 AND user_id = $2 AND is_custom = true
       RETURNING *`,
      [
        req.params.id,
        req.user.id,
        name,
        description,
        steps ? JSON.stringify(steps) : null,
        duration_minutes
      ]
    );

    if (result.rows.length === 0) {
      throw new APIError('Tool not found or not editable', 404, 'NOT_FOUND');
    }

    res.json({ tool: result.rows[0] });
  })
);

// ============================================================
// DELETE /api/coping/tools/:id - Delete custom tool
// ============================================================
router.delete('/tools/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM coping_tools WHERE id = $1 AND user_id = $2 AND is_custom = true RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Tool not found or not deletable', 404, 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Tool removed' });
  })
);

// ============================================================
// POST /api/coping/tools/:id/use - Log tool usage
// ============================================================
router.post('/tools/:id/use',
  [
    param('id').isUUID(),
    body('mood_before').optional().isInt({ min: 1, max: 5 }),
    body('mood_after').optional().isInt({ min: 1, max: 5 }),
    body('effectiveness').optional().isInt({ min: 1, max: 5 }),
    body('notes').optional().trim()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { mood_before, mood_after, effectiveness, notes } = req.body;

    // Verify tool exists
    const toolResult = await query(
      `SELECT id FROM coping_tools WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
      [req.params.id, req.user.id]
    );

    if (toolResult.rows.length === 0) {
      throw new APIError('Tool not found', 404, 'NOT_FOUND');
    }

    // Log usage
    const useResult = await query(
      `INSERT INTO coping_tool_uses (tool_id, user_id, mood_before, mood_after, effectiveness, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, req.user.id, mood_before, mood_after, effectiveness, notes]
    );

    // Update tool stats
    await query(
      `UPDATE coping_tools
       SET times_used = times_used + 1,
           avg_effectiveness = (
             SELECT AVG(effectiveness) FROM coping_tool_uses WHERE tool_id = $1
           )
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      usage: useResult.rows[0],
      message: 'Usage logged'
    });
  })
);

// ============================================================
// GET /api/coping/tools/recommend - Get recommended tools
// ============================================================
router.get('/recommend',
  asyncHandler(async (req, res) => {
    const { mood, context } = req.query;

    // Get user's most effective tools
    const effectiveTools = await query(
      `SELECT ct.*, AVG(ctu.effectiveness) as avg_eff
       FROM coping_tools ct
       LEFT JOIN coping_tool_uses ctu ON ct.id = ctu.tool_id AND ctu.user_id = $1
       WHERE ct.user_id = $1 OR ct.user_id IS NULL
       GROUP BY ct.id
       ORDER BY avg_eff DESC NULLS LAST, ct.times_used DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Recommend based on mood
    let recommended = effectiveTools.rows;

    if (mood && parseInt(mood) <= 2) {
      // Low mood - prioritize grounding and breathing
      const groundingTools = await query(
        `SELECT * FROM coping_tools
         WHERE (user_id = $1 OR user_id IS NULL)
         AND category IN ('grounding', 'breathing')
         LIMIT 3`,
        [req.user.id]
      );
      recommended = [...groundingTools.rows, ...recommended.slice(0, 2)];
    }

    res.json({ recommended });
  })
);

// ============================================================
// GET /api/coping/quick - Quick coping exercises
// ============================================================
router.get('/quick',
  asyncHandler(async (req, res) => {
    const quickExercises = [
      {
        id: 'breath_4_7_8',
        name: '4-7-8 Breathing',
        duration: '1 min',
        steps: [
          'Breathe in through your nose for 4 seconds',
          'Hold your breath for 7 seconds',
          'Exhale slowly through your mouth for 8 seconds',
          'Repeat 3 times'
        ]
      },
      {
        id: 'grounding_5_4_3_2_1',
        name: '5-4-3-2-1 Grounding',
        duration: '2 min',
        steps: [
          'Notice 5 things you can SEE',
          'Notice 4 things you can TOUCH',
          'Notice 3 things you can HEAR',
          'Notice 2 things you can SMELL',
          'Notice 1 thing you can TASTE'
        ]
      },
      {
        id: 'body_scan',
        name: 'Quick Body Scan',
        duration: '2 min',
        steps: [
          'Close your eyes and take a deep breath',
          'Notice any tension in your forehead, relax it',
          'Notice your jaw, unclench it',
          'Drop your shoulders away from your ears',
          'Unclench your hands',
          'Take one more deep breath'
        ]
      },
      {
        id: 'cold_water',
        name: 'Cold Water Reset',
        duration: '30 sec',
        steps: [
          'Run cold water over your wrists for 30 seconds',
          'Or splash cold water on your face',
          'Take slow, deep breaths while you do this'
        ]
      }
    ];

    res.json({ exercises: quickExercises });
  })
);

// ============================================================
// Safety Plan Routes
// ============================================================

// GET /api/coping/safety-plan - Get user's safety plan
router.get('/safety-plan',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM safety_plans WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      safety_plan: result.rows[0] || null,
      has_plan: result.rows.length > 0
    });
  })
);

// PUT /api/coping/safety-plan - Update safety plan
router.put('/safety-plan',
  asyncHandler(async (req, res) => {
    const {
      warning_signs,
      internal_coping,
      external_coping,
      support_contacts,
      professional_contacts,
      crisis_lines,
      environment_safety_steps,
      reasons_for_living
    } = req.body;

    const result = await query(
      `INSERT INTO safety_plans (user_id, warning_signs, internal_coping, external_coping,
         support_contacts, professional_contacts, crisis_lines, environment_safety_steps, reasons_for_living)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id)
       DO UPDATE SET
         warning_signs = COALESCE($2, safety_plans.warning_signs),
         internal_coping = COALESCE($3, safety_plans.internal_coping),
         external_coping = COALESCE($4, safety_plans.external_coping),
         support_contacts = COALESCE($5, safety_plans.support_contacts),
         professional_contacts = COALESCE($6, safety_plans.professional_contacts),
         crisis_lines = COALESCE($7, safety_plans.crisis_lines),
         environment_safety_steps = COALESCE($8, safety_plans.environment_safety_steps),
         reasons_for_living = COALESCE($9, safety_plans.reasons_for_living),
         updated_at = NOW()
       RETURNING *`,
      [
        req.user.id,
        JSON.stringify(warning_signs || []),
        JSON.stringify(internal_coping || []),
        JSON.stringify(external_coping || []),
        JSON.stringify(support_contacts || []),
        JSON.stringify(professional_contacts || []),
        JSON.stringify(crisis_lines || []),
        JSON.stringify(environment_safety_steps || []),
        JSON.stringify(reasons_for_living || [])
      ]
    );

    res.json({
      safety_plan: result.rows[0],
      message: 'Safety plan updated'
    });
  })
);

export default router;
