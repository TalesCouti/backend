const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllers/consultaController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getConsulta);
router.post('/', authMiddleware, inserirConsulta);

module.exports = router;
