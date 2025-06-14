const express = require('express');
const router = express.Router();
const { getConsulta } = require('../controllersPaciente/consultaController');
const { getConsultaMedico,inserirResultadoConsulta, getDadosConsulta } = require('../controllersMedico/consultaController');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, getConsulta);

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
router.post('/inserir-consulta', async (req, res) => {
  try {
    const { usuario_id, medico_id, status, data_hora } = req.body;

    if (!usuario_id || !medico_id || !status || !data_hora) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: usuario_id, medico_id, status, data_hora'
      });
    }

    await pool.query(
      `INSERT INTO consulta (usuario_id, medico_id, status, data_hora) 
       VALUES ($1, $2, $3, $4)`,
      [usuario_id, medico_id, status, data_hora]
    );

    res.json({ success: true, message: 'Consulta inserida com sucesso.' });
  } catch (err) {
    console.error('Erro no controller:', err);
    res.status(500).json({ success: false, message: 'Erro ao inserir consulta.' });
  }
});

router.get('/medico', auth, getConsultaMedico);
router.post('/resultado/:id_consulta', auth, inserirResultadoConsulta);
router.get('/dados/:id_consulta', auth, getDadosConsulta);

module.exports = router;
