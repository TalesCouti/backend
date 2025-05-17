const pool = require('../db/pool'); 

exports.getConsulta = async (req, res) => {
  const { id } = req.user;
  try {
    const getConsulta = await pool.query(`
      SELECT 
        im.nome,
        im.especialidade,
        im.imagem_perfil,
        c.status,
        c.data_hora
      FROM 
        consulta c
      JOIN 
        informacoes_medico im ON c.id_medico = im.id
      WHERE 
        c.id_usuario = $1
    `, [id]);

    if (getConsulta.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhuma consulta encontrada' });
    }

    res.status(200).json(getConsulta.rows);
  } catch (error) {
    console.error('Erro ao buscar consultas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.inserirConsulta = async (req, res) => {
  const { id } = req.user;
  const { id_medico, data_hora, status } = req.body;

  if (!id_medico || !data_hora || !status) {
    return res.status(400).json({ message: 'Campos obrigatórios: id_medico, data_hora, status' });
  }

  try {
    await pool.query(`
      INSERT INTO consulta (id_usuario, id_medico, data_hora, status)
      VALUES ($1, $2, $3, $4)
    `, [id, id_medico, data_hora, status]);

    res.status(201).json({ message: 'Consulta inserida com sucesso' });
  } catch (error) {
    console.error('Erro ao inserir consulta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
