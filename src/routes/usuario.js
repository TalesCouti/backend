const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const auth = require('../middlewares/auth');

router.post('/login', usuarioController.login);
router.post('/cadastro', usuarioController.cadastro);
router.post('/cadastroMedico', usuarioController.cadastroMedico);
router.get('/', auth, usuarioController.getUsuario);

module.exports = router;