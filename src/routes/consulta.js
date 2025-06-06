const express = require('express');
const router = express.Router();
const { getConsulta, inserirConsulta } = require('../controllersPaciente/consultaController');
const { getConsultaMedico, inserirConsultaMedico, inserirResultadoConsulta } = require('../controllersMedico/consultaController');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, getConsulta);
router.post('/consulta', auth, inserirConsulta);

router.get('/sintomas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sintomas');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar sintomas:', error);
    res.status(500).json({
      success: false,
      message: 'Falha ao buscar sintomas',
      errorCode: 'DB_QUERY_ERROR'
    });
  }
});

router.get('/medico', auth, getConsultaMedico);
router.post('/medico/consulta', auth, inserirConsultaMedico);
router.post('/resultado', auth, inserirResultadoConsulta);

module.exports = router;
