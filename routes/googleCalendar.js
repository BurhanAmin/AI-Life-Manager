const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/googleCalendar')

// PUBLIC — Google redirects the browser here, so no JWT is available.
// Trust comes from the signed `state` param instead.
router.get('/callback', ctrl.oauthCallback)

// Authed endpoints
router.get('/auth-url', auth, ctrl.getAuthUrl)
router.get('/status', auth, ctrl.status)
router.post('/sync', auth, ctrl.syncCalendar)
router.post('/disconnect', auth, ctrl.disconnect)
router.get('/freebusy', auth, ctrl.getFreeBusy)

module.exports = router