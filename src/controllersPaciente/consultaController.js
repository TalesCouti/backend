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
    const requiredFields = ['medico_id', 'data_hora', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando',
        missingFields
      });
    }

    const result = await pool.query(`
      INSERT INTO consulta (usuario_id, medico_id, data_hora, status, valor)
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
    console.log('[getDadosConsulta] Iniciando busca dos dados da consulta:', id_consulta);

    if (!id_consulta) {
      console.error('[getDadosConsulta] ID da consulta não fornecido');
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    console.log('[getDadosConsulta] Buscando informações básicas da consulta');
    const consultaResult = await pool.query(`
      SELECT 
        c.id,
        c.status,
        c.data_hora,
        c.valor,
        im.nome as nome_medico,
        im.especialidade,
        im.imagem_perfil as imagem_medico,
        iu.nome as nome_paciente,
        iu.imagem_perfil as imagem_paciente
      FROM consulta c
      JOIN informacoes_medico im ON c.medico_id = im.medico_id
      JOIN informacoes_usuario iu ON c.usuario_id = iu.usuario_id
      WHERE c.id = $1
    `, [id_consulta]);

    if (consultaResult.rows.length === 0) {
      console.error('[getDadosConsulta] Consulta não encontrada:', id_consulta);
      return res.status(404).json({
        success: false,
        message: 'Consulta não encontrada'
      });
    }

    console.log('[getDadosConsulta] Buscando resultados da consulta');
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
        r.observacoes as observacoes_receita,
        s.nome as nome_sintoma
      FROM resultado_consulta rc
      LEFT JOIN receita r ON r.id_consulta = rc.id_consulta
      LEFT JOIN sintomas s ON s.id = ANY(rc.sintomas)
      WHERE rc.id_consulta = $1
    `, [id_consulta]);

    console.log('[getDadosConsulta] Resultado encontrado:', result.rows);

    const dados = {
      ...consultaResult.rows[0],
      medico: {
        nome: consultaResult.rows[0].nome_medico,
        especialidade: consultaResult.rows[0].especialidade,
        imagem_perfil: consultaResult.rows[0].imagem_medico
      },
      paciente: {
        nome: consultaResult.rows[0].nome_paciente,
        imagem_perfil: consultaResult.rows[0].imagem_paciente
      },
      motivo: result.rows[0]?.motivo || null,
      observacoes: result.rows[0]?.observacoes || null,
      sintomas: result.rows.map(row => row.nome_sintoma).filter(Boolean),
      exames: Array.isArray(result.rows[0]?.exames) ? result.rows[0].exames : [],
      diagnostico: result.rows[0]?.diagnostico || null,
      receitas: []
    };

    if (result.rows.length > 0) {
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
    }

    console.log('[getDadosConsulta] Dados processados:', dados);

    res.status(200).json({
      success: true,
      data: dados
    });

  } catch (error) {
    console.error('[getDadosConsulta] Erro ao buscar dados da consulta:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados da consulta',
      error: error.message
    });
  }
};