const pool = require('../db/pool');
const { nanoid } = require('nanoid');

exports.CriarConsulta = async (req, res) => {
  try {
    const { cpf, medico_id, status, data_hora, valor } = req.body;
    
    // Validar se o CPF foi fornecido
    if (!cpf) {
      return res.status(400).json({ 
        success: false, 
        message: 'CPF do paciente é obrigatório' 
      });
    }

    // Buscar o usuario_id pelo CPF
    const usuarioResult = await pool.query(
      'SELECT id FROM usuario WHERE cpf = $1',
      [cpf]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Paciente não encontrado com este CPF' 
      });
    }

    const usuario_id = usuarioResult.rows[0].id;
    const consulta_id = nanoid(10);
    
    await pool.query(
      `INSERT INTO consulta (consulta_id, usuario_id, medico_id, status, data_hora, valor) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [consulta_id, usuario_id, medico_id, status, data_hora, valor]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Consulta criada com sucesso.', 
      consulta_id 
    });
  } catch (error) {
    console.error('Erro ao criar consulta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar consulta',
      error: error.message 
    });
  }
};

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
      c.consulta_id,
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
exports.inserirResultadoConsulta = async (req, res) => {
  try {
    const { consulta_id } = req.params;
    const { motivo, observacoes, sintomas, exames, diagnostico, receitas } = req.body;

    if (!consulta_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    await pool.query('BEGIN');

    // Verifica se já existe um resultado para esta consulta
    const resultadoExistente = await pool.query(
      'SELECT consulta_id FROM resultado_consulta WHERE consulta_id = $1',
      [consulta_id]
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
         WHERE consulta_id = $6
         RETURNING consulta_id`,
        [motivo, observacoes, sintomas, exames, diagnostico, consulta_id]
      );

      await pool.query('DELETE FROM receita WHERE consulta_id = $1', [consulta_id]);
    } else {
      resultadoConsulta = await pool.query(
        'INSERT INTO resultado_consulta (consulta_id, motivo, observacoes, sintomas, exames, diagnostico) VALUES ($1, $2, $3, $4, $5, $6) RETURNING consulta_id',
        [consulta_id, motivo, observacoes, sintomas, exames, diagnostico]
      );
    }

    if (receitas && receitas.length > 0) {
      for (const receita of receitas) {
        await pool.query(
          'INSERT INTO receita (consulta_id, medicamento, dosagem, frequencia, duracao, observacoes) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            resultadoConsulta.rows[0].consulta_id,
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
    const { consulta_id } = req.params;
    console.log('Buscando dados da consulta:', consulta_id);
    console.log('Usuário autenticado:', req.user?.id);

    if (!consulta_id) {
      console.log('ID da consulta não fornecido');
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    const consultaResult = await pool.query(`
      SELECT 
        c.consulta_id,
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
      WHERE c.consulta_id = $1
    `, [consulta_id]);

    if (consultaResult.rows.length === 0) {
      console.log('Consulta não encontrada');
      return res.status(404).json({
        success: false,
        message: 'Consulta não encontrada'
      });
    }

    const result = await pool.query(`
      SELECT 
        rc.consulta_id,
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
      LEFT JOIN receita r ON r.consulta_id = rc.consulta_id
      WHERE rc.consulta_id = $1
    `, [consulta_id]);

    // Busca os nomes dos sintomas
    const sintomasResult = await pool.query(`
      SELECT sintoma 
      FROM sintomas 
      WHERE id = ANY($1)
    `, [result.rows[0]?.sintomas || []]);

    const nomesSintomas = sintomasResult.rows.map(row => row.sintoma);

    const dados = {
      consulta_id: consulta_id,
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
      sintomas: nomesSintomas,
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

