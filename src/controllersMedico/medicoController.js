const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  const { crm, senha } = req.body;

  try {
    const queryResult = await pool.query('SELECT * FROM medico WHERE crm = $1', [crm]);
    const user = queryResult.rows[0];

    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(401).json({ message: 'CRM ou senha inválidos.' });
    }

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.cadastro = async (req, res) => {
  const { 
    nome, 
    crm, 
    senha, 
    email, 
    telefone, 
    dataNascimento,
    especialidade,
    cep,
    estado,
    cidade,
    bairro,
    logradouro,
    numero,
    complemento 
  } = req.body;

  try {
    const crmExistente = await pool.query('SELECT id FROM medico WHERE crm = $1', [crm]);
    if (crmExistente.rows.length > 0) {
      return res.status(400).json({ message: 'CRM já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    await pool.query('BEGIN');

    const medicoResult = await pool.query(
      'INSERT INTO medico (crm, senha) VALUES ($1, $2) RETURNING id',
      [crm, hashedPassword]
    );
    const medicoId = medicoResult.rows[0].id;

    await pool.query(
      `INSERT INTO informacoes_medico 
       (medico_id, nome, email, telefone, data_nascimento, especialidade) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [medicoId, nome, email, telefone, dataNascimento, especialidade]
    );

    await pool.query(
      `INSERT INTO endereco_medico 
       (medico_id, cep, estado, cidade, bairro, logradouro, numero, complemento) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [medicoId, cep, estado, cidade, bairro, logradouro, numero, complemento]
    );

    await pool.query('COMMIT');

    res.status(201).json({ message: 'Médico cadastrado com sucesso.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

exports.getMedico = async (req, res) => {
  const { id } = req.user;

  try {
    const usuarioInfo = await pool.query(`
      SELECT 
        i.nome, 
        i.especialidade,
        i.email, 
        i.telefone, 
        i.data_nascimento, 
        i.imagem_perfil,
        e.cep, 
        e.estado, 
        e.cidade, 
        e.bairro, 
        e.logradouro, 
        e.numero, 
        e.complemento,
        u.crm
      FROM informacoes_medico i
      JOIN medico u ON i.medico_id = u.id
      JOIN endereco_medico e ON e.medico_id = u.id
      WHERE u.id = $1
    `, [id]);

    if (usuarioInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(usuarioInfo.rows[0]);
    
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar informações do usuário' });
  }
};
