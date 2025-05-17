
const express = require('express');
const router = express.Router();
const { inserirConsulta } = require('../controllers/consultaController');

router.get('/', inserirConsulta); 

module.exports = router;
