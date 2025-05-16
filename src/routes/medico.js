const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medicoController');

router.post('/cadastro', medicoController.cadastrarMedico);

module.exports = router;