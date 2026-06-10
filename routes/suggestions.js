const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/suggestions')
const courseGen = require('../controllers/courseGen')

router.get('/', auth, ctrl.listSuggestions)
router.get('/stats', auth, ctrl.getStats) // before any ':id' routes
router.post('/', auth, ctrl.createSuggestion)
router.post('/generate', auth, courseGen.generateSuggestions) // AI-generated batch
router.patch('/:id/status', auth, ctrl.updateStatus)
router.delete('/:id', auth, ctrl.deleteSuggestion)

module.exports = router