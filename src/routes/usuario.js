const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const auth = require('../middleware/auth');

router.post('/login', usuarioController.login);
router.post('/cadastro', usuarioController.cadastro);
router.post('/loginNfc', usuarioController.loginNfc);
router.post('/cadastroNfc', usuarioController.cadastroNfc);
router.get('/', auth, usuarioController.getUsuario);

module.exports = router;