const pool = require('../db/pool');

exports.getConsulta = async (req, res) => {
  try {
   
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Token inválido ou usuário não identificado'
      });
    }


    const result = await pool.query(`
      SELECT 
        c.id,
        im.nome,
        im.especialidade,
        im.imagem_perfil,
        c.status,
        c.data_hora,
      FROM consulta c
      JOIN informacoes_medico im ON c.id_medico = im.id
      WHERE c.id_usuario = $1
      ORDER BY c.data_hora DESC
    `, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });

  } catch (error) {
   
    console.error('Erro em getConsulta:', {
      user: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    
    res.status(500).json({
      success: false,
      message: 'Falha ao buscar consultas',
      errorCode: 'DB_QUERY_ERROR'
    });
  }
};

exports.inserirConsulta = async (req, res) => {
  try {

    const requiredFields = ['id_medico', 'data_hora', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando',
        missingFields
      });
    }

    
    const result = await pool.query(`
      INSERT INTO consulta (id_usuario, id_medico, data_hora, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.user.id,
      req.body.id_medico,
      req.body.data_hora,
      req.body.status,
      req.body.valor || 300.00
    ]);

  
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Consulta agendada com sucesso'
    });

  } catch (error) {
    console.error('Erro em inserirConsulta:', error);

    if (error.code === '23503') { 
      return res.status(400).json({
        success: false,
        message: 'Médico não encontrado',
        errorCode: 'DOCTOR_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Falha ao agendar consulta',
      errorCode: 'DB_INSERT_ERROR'
    });
  }
};