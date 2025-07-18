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
      c.consulta_id,
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
exports.getDadosConsulta = async (req, res) => {
  try {
    const { consulta_id } = req.params;
    console.log('[getDadosConsulta] Iniciando busca dos dados da consulta:', consulta_id);

    if (!consulta_id) {
      console.error('[getDadosConsulta] ID da consulta não fornecido');
      return res.status(400).json({
        success: false,
        message: 'ID da consulta é obrigatório'
      });
    }

    console.log('[getDadosConsulta] Buscando informações básicas da consulta');
    const consultaResult = await pool.query(`
      SELECT 
        c.consulta_id,
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
      WHERE c.consulta_id = $1
    `, [consulta_id]);

    if (consultaResult.rows.length === 0) {
      console.error('[getDadosConsulta] Consulta não encontrada:', consulta_id);
      return res.status(404).json({
        success: false,
        message: 'Consulta não encontrada'
      });
    }

    console.log('[getDadosConsulta] Buscando resultados da consulta');
    const result = await pool.query(`
      WITH sintomas_nomes AS (
        SELECT rc.consulta_id, array_agg(s.nome) as nomes_sintomas
        FROM resultado_consulta rc
        LEFT JOIN sintomas s ON s.consulta_id = ANY(rc.sintomas)
        WHERE rc.consulta_id = $1
        GROUP BY rc.consulta_id
      SELECT 
        rc.consulta_id,
        rc.motivo,
        rc.observacoes,
        sn.nomes_sintomas,
        rc.exames,
        rc.diagnostico,
        r.medicamento,
        r.dosagem,
        r.frequencia,
        r.duracao,
        r.observacoes as observacoes_receita
      FROM resultado_consulta rc
      LEFT JOIN sintomas_nomes sn ON sn.consulta_id = rc.consulta_id
      LEFT JOIN receita r ON r.consulta_id = rc.consulta_id
      WHERE rc.consulta_id = $1
    `, [consulta_id]);

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
      sintomas: result.rows[0]?.nomes_sintomas || [],
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