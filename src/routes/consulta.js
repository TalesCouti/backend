const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllers/consultaController');
const auth = require('../middleware/auth');

router.get('/consulta', auth, getConsulta);
router.post('/consulta', auth, inserirConsulta);

module.exports = router;
