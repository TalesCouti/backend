const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllersPaciente/consultaController');
const { getConsultaMedico, inserirConsultaMedico } = require('../controllersMedico/consultaController');

const auth = require('../middleware/auth');

router.get('/', auth, getConsulta);
router.post('/consulta', auth, inserirConsulta);
app.get('/sintomas', async (req, res) => {
  const result = await pool.query('SELECT * FROM sintomas');
  res.json(result.rows);
});
router.get('/medico', auth, getConsultaMedico);
router.post('/medico/consulta', auth, inserirConsultaMedico);

module.exports = router;
