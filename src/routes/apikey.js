const express = require('express');
const router = express.Router();
const {getApiKey,} = require('../controllers/apiKeyController');
const auth = require('../middleware/auth');

router.get('/', auth, getApiKey);

module.exports = router;
