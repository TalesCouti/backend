const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllers/consultaController');
const auth = require('../middleware/auth');

router.get('/consultas', auth, getConsulta);
router.post('/consultas', auth, inserirConsulta);

module.exports = router;
