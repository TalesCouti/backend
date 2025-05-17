const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllers/consultaController');
const auth = require('../middlewares/auth'); 

router.get('/', auth, getConsulta);
router.post('/', auth, inserirConsulta);

module.exports = router;
