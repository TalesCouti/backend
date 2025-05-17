const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllers/consultaController');
const auth = require('../middleware/auth');

<<<<<<< HEAD
router.get('/consulta', auth, getConsulta);
router.post('/consulta', auth, inserirConsulta);
=======
router.get('/', auth, getConsulta);
router.post('/', auth, inserirConsulta);
>>>>>>> parent of 1b6f11c (caminho errado de novo)

module.exports = router;
