const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const auth = require('../middlewares/auth');

router.get('/consulta', consultaController.inserirConsulta); 


module.exports = router;
