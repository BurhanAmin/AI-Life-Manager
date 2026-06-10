const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/idle')

router.get('/free-blocks', auth, ctrl.getFreeBlocks)
router.get('/check', auth, ctrl.checkIdle)

module.exports = router