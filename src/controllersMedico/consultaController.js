const pool = require('../db/pool');

exports.getConsultaMedico = async (req, res) => {
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
      iu.nome,
      iu.imagem_perfil,
      c.status,
      c.valor,
      c.data_hora
      FROM consulta c
      JOIN informacoes_usuario iu ON c.usuario_id = iu.usuario_id
      WHERE c.medico_id = $1
      ORDER BY c.data_hora DESC
    `, [userId]);

    res.status(200).json(result.rows);

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

exports.inserirConsultaMedico = async (req, res) => {
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
      INSERT INTO consulta (id_usuario, id_medico, data_hora, status, valor)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.user.id,
      req.body.medico_id,
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

exports.inserirResultadoConsulta = async (req, res) => {
  try {
    const { id_consulta, motivo, observacoes, exames, diagnostico, sintomas } = req.body;

    if (!id_consulta) {
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    await pool.query('BEGIN');
    
    await pool.query(
      'INSERT INTO resultado_consulta (id_consulta, motivo, observacoes, sintomas, exames, diagnostico) VALUES ($1, $2, $3, $4, $5, $6)',
      [id_consulta, motivo, observacoes, sintomas, exames, diagnostico]
    );

    await pool.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Resultado da consulta salvo com sucesso'
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Erro ao salvar resultado da consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Falha ao salvar resultado da consulta',
      errorCode: 'DB_INSERT_ERROR'
    });
  }
};

exports.getDadosConsulta = async (req, res) => {
  try {
    const { id_consulta } = req.params;

    if (!id_consulta) {
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    const result = await pool.query(`
      SELECT 
        cu.id_consulta,
        cu.motivo,
        cu.observacoes,
        cu.sintomas,
        cu.exames,
        cu.diagnostico,
        r.medicamento,
        r.dosagem,
        r.frequencia,
        r.duracao,
        r.observacoes as observacoes_receita
      FROM resultado_consulta ru
      LEFT JOIN receita r ON r.id_consulta = ru.id_consulta
      WHERE ru.id_consulta = $1
    `, [id_consulta]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consulta não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar dados da consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Falha ao buscar dados da consulta',
      errorCode: 'DB_QUERY_ERROR'
    });
  }
};
