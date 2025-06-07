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
    const requiredFields = ['usuario_id', 'data_hora', 'status'];
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
      req.body.usuario_id,
      req.user.id,
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
        message: 'Usuário não encontrado',
        errorCode: 'USER_NOT_FOUND'
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
    const { id_consulta } = req.params;
    const { motivo, observacoes, sintomas, exames, diagnostico, receitas } = req.body;

    if (!id_consulta) {
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    await pool.query('BEGIN');

    // Verifica se já existe um resultado para esta consulta
    const resultadoExistente = await pool.query(
      'SELECT id_consulta FROM resultado_consulta WHERE id_consulta = $1',
      [id_consulta]
    );

    let resultadoConsulta;

    if (resultadoExistente.rows.length > 0) {
      resultadoConsulta = await pool.query(
        `UPDATE resultado_consulta 
         SET motivo = $1, 
             observacoes = $2, 
             sintomas = $3, 
             exames = $4, 
             diagnostico = $5
         WHERE id_consulta = $6
         RETURNING id_consulta`,
        [motivo, observacoes, sintomas, exames, diagnostico, id_consulta]
      );

      await pool.query('DELETE FROM receita WHERE id_consulta = $1', [id_consulta]);
    } else {
      resultadoConsulta = await pool.query(
        'INSERT INTO resultado_consulta (id_consulta, motivo, observacoes, sintomas, exames, diagnostico) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_consulta',
        [id_consulta, motivo, observacoes, sintomas, exames, diagnostico]
      );
    }

    if (receitas && receitas.length > 0) {
      for (const receita of receitas) {
        await pool.query(
          'INSERT INTO receita (id_consulta, medicamento, dosagem, frequencia, duracao, observacoes) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            resultadoConsulta.rows[0].id_consulta,
            receita.medicamento,
            receita.dosagem,
            receita.frequencia,
            receita.duracao,
            receita.observacoes
          ]
        );
      }
    }

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
    console.log('Buscando dados da consulta:', id_consulta);
    console.log('Usuário autenticado:', req.user?.id);

    if (!id_consulta) {
      console.log('ID da consulta não fornecido');
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    const consultaResult = await pool.query(`
      SELECT 
        c.id,
        im.nome as nome_medico,
        im.especialidade,
        im.imagem_perfil as imagem_medico,
        iu.nome as nome_paciente,
        iu.imagem_perfil as imagem_paciente,
        c.status,
        c.data_hora,
        c.valor
      FROM consulta c
      JOIN informacoes_medico im ON c.medico_id = im.medico_id
      JOIN informacoes_usuario iu ON c.usuario_id = iu.usuario_id
      WHERE c.id = $1
    `, [id_consulta]);

    if (consultaResult.rows.length === 0) {
      console.log('Consulta não encontrada');
      return res.status(404).json({
        success: false,
        message: 'Consulta não encontrada'
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

    const dados = {
      id_consulta: id_consulta,
      medico: {
        nome: consultaResult.rows[0].nome_medico,
        especialidade: consultaResult.rows[0].especialidade,
        imagem_perfil: consultaResult.rows[0].imagem_medico
      },
      paciente: {
        nome: consultaResult.rows[0].nome_paciente,
        imagem_perfil: consultaResult.rows[0].imagem_paciente
      },
      status: consultaResult.rows[0].status,
      data_hora: consultaResult.rows[0].data_hora,
      valor: consultaResult.rows[0].valor,
      motivo: result.rows[0]?.motivo || null,
      observacoes: result.rows[0]?.observacoes || null,
      sintomas: result.rows[0]?.sintomas || [],
      exames: result.rows[0]?.exames || [],
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

    res.status(200).json({
      success: true,
      data: dados
    });

  } catch (error) {
    console.error('Erro detalhado ao buscar dados da consulta:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      success: false,
      message: 'Falha ao buscar dados da consulta',
      errorCode: 'DB_QUERY_ERROR',
      error: error.message
    });
  }
};

