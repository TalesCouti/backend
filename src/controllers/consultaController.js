const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.getConsulta async (req, res) => {
    const { id } = req.user
  try {
    const consultaInfo = await pool.query(`
      SELECT 
        im.nome,
        im.especialidade,
        c.status,
        c.data_hora
      FROM 
        consulta c
      JOIN 
        informacoes_medico im ON c.id_medico = im.id
      WHERE 
        c.id_usuario = $1
    `, [id]);

    if (consultaInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhuma consulta encontrada' });
    }

    res.status(200).json(consultaInfo.rows);
  } catch (error) {
    console.error('Erro ao buscar consultas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
