const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medicoController');
const auth = require('../middleware/auth');

router.post('/login', medicoController.login);
router.post('/cadastro', medicoController.cadastro);
router.get('/', auth, medicoController.getMedico);

module.exports = router;