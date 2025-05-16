const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

exports.cadastrarMedico = async (req, res) => {
  const {
    crm,
    senha,
    nome,
    email,
    telefone,
    data_nascimento,
    especialidade,
    imagem_perfil
  } = req.body;

  try {
    // Verifica se CRM já existe
    const crmExistente = await pool.query('SELECT id FROM medico WHERE crm = $1', [crm]);
    if (crmExistente.rows.length > 0) {
      return res.status(400).json('CRM já cadastrado.');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Insere médico
    const medicoResult = await pool.query(
      'INSERT INTO medico (crm, senha) VALUES ($1, $2) RETURNING id',
      [crm, hashedPassword]
    );
    const medicoId = medicoResult.rows[0].id;

    // Insere informações do médico
    await pool.query(
      `INSERT INTO informacoes_medico
        (medico_id, nome, email, telefone, data_nascimento, especialidade, imagem_perfil)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [medicoId, nome, email, telefone, data_nascimento, especialidade, imagem_perfil]
    );

    res.status(201).json('Médico cadastrado com sucesso.');
  } catch (error) {
    console.error('Erro no cadastro do médico:', error);
    res.status(500).json('Erro interno do servidor.');
  }
};