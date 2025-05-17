const { pool } = require('../db/pool'); 

async function inserirConsulta(req, res) {
  try {
    const usuario_id = '044be79d-7a7f-4585-937e-08b54a75289e';
    const medico_id = '60ed2a68-0b85-4b2a-bb4e-354d28a6d031';
    const status = 'realizada';
    const data_hora = '2025-05-03 10:00:00';

    await pool.query(
      `INSERT INTO informacoes_consulta (usuario_id, medico_id, status, data_hora) 
       VALUES ($1, $2, $3, $4)`,
      [usuario_id, medico_id, status, data_hora]
    );

    res.send('Consulta inserida com sucesso.');
  } catch (err) {
    console.error('Erro no controller:', err);
    res.status(500).send('Erro ao inserir consulta.');
  }
}

module.exports = { inserirConsulta };
