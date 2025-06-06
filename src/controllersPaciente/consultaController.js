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
      c.valor,
      c.data_hora
      FROM consulta c
      JOIN informacoes_medico im ON c.medico_id = im.medico_id
      WHERE c.usuario_id = $1
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
        rc.id_consulta,
        rc.motivo,
        rc.observacoes,
        rc.sintomas,
        rc.exames,
        rc.diagnostico,
        r.medicamento,
        r.dosagem,
        r.frequencia,
        r.duracao,
        r.observacoes as observacoes_receita
      FROM resultado_consulta rc
      LEFT JOIN receita r ON r.id_consulta = rc.id_consulta
      WHERE rc.id_consulta = $1
    `, [id_consulta]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consulta não encontrada'
      });
    }

    // Processa os resultados para agrupar as receitas
    const dados = {
      id_consulta: result.rows[0].id_consulta,
      motivo: result.rows[0].motivo,
      observacoes: result.rows[0].observacoes,
      sintomas: result.rows[0].sintomas,
      exames: result.rows[0].exames,
      diagnostico: result.rows[0].diagnostico,
      receitas: []
    };

    // Adiciona as receitas se existirem
    result.rows.forEach(row => {
      if (row.medicamento) {
        dados.receitas.push({
          medicamento: row.medicamento,
          dosagem: row.dosagem,
          frequencia: row.frequencia,
          duracao: row.duracao,
          observacoes: row.observacoes_receita
        });
      }
    });

    res.status(200).json({
      success: true,
      data: dados
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