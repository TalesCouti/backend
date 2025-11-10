const express = require('express');
const router = express.Router();
const usuarioController = require('../controllersPaciente/usuarioController');
const auth = require('../middleware/auth');

router.post('/login', usuarioController.login);
router.post('/cadastro', usuarioController.cadastro);
router.post('/loginNfc', usuarioController.loginNfc);
router.post('/cadastroNfc', auth, usuarioController.cadastroNFC);
router.delete('/removerNFC', auth, usuarioController.removerNFC);
router.get('/', auth, usuarioController.getUsuario);
router.get('/cpf/:cpf', auth, usuarioController.getUsuarioPorCPF);

module.exports = router;