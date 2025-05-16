const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const auth = require('../middlewares/auth');

router.post('/consulta', auth, consultaController.consulta);