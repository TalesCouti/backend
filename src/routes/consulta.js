// src/routes/consulta.js
const express = require('express');
const router = express.Router();
const { inserirConsulta } = require('../controllers/consultaController');

router.get('/consulta', inserirConsulta); // usar GET para testar

module.exports = router;
