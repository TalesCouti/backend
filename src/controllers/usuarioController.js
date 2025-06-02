const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

// Helper function para respostas de erro
const handleError = (res, error, message = 'Erro interno do servidor') => {
  console.error(error);
  res.status(500).json({ success: false, message });
};

exports.login = async (req, res) => {
  const { cpf, senha } = req.body;

  // Validação básica
  if (!cpf || !senha) {
    return res.status(400).json({ success: false, message: 'CPF e senha são obrigatórios' });
  }

  try {
    const queryResult = await pool.query('SELECT * FROM usuario WHERE cpf = $1', [cpf]);
    const user = queryResult.rows[0];

    if (!user) {
      return res.status(400).json({ success: false, message: 'CPF ou senha inválidos' });
    }

    const passwordMatch = await bcrypt.compare(senha, user.senha);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, message: 'CPF ou senha inválidos' });
    }

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch (error) {
    handleError(res, error, 'Erro no login');
  }
};

exports.loginNfc = async (req, res) => {
  const { uid } = req.body;

  // Validação do UID
  if (!uid || typeof uid !== 'string' || uid.length < 4) {
    return res.status(400).json({ success: false, message: 'UID inválido' });
  }

  try {
    const queryResult = await pool.query('SELECT * FROM usuario WHERE nfc_uid = $1', [uid.trim().toUpperCase()]);
    
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'UID não cadastrado' });
    }

    const user = queryResult.rows[0];
    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
    
    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        cpf: user.cpf
      }
    });
  } catch (error) {
    handleError(res, error, 'Erro no login por NFC');
  }
};

exports.cadastro = async (req, res) => {
  const { nome, cpf, senha, email, telefone, dataNascimento, cep, estado, cidade, bairro, logradouro, numero, complemento } = req.body;

  // Validações básicas
  if (!cpf || !senha || !nome) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando' });
  }

  try {
    // Verifica CPF existente
    const cpfExistente = await pool.query('SELECT id FROM usuario WHERE cpf = $1', [cpf]);
    if (cpfExistente.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'CPF já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Transação para garantir integridade dos dados
    await pool.query('BEGIN');

    try {
      const usuarioResult = await pool.query(
        'INSERT INTO usuario (cpf, senha) VALUES ($1, $2) RETURNING id',
        [cpf, hashedPassword]
      );

      const usuarioId = usuarioResult.rows[0].id;

      await pool.query(
        'INSERT INTO informacoes_usuario (usuario_id, nome, email, telefone, data_nascimento) VALUES ($1, $2, $3, $4, $5)',
        [usuarioId, nome, email, telefone, dataNascimento]
      );

      await pool.query(
        'INSERT INTO endereco_usuario (usuario_id, cep, estado, cidade, bairro, logradouro, numero, complemento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [usuarioId, cep, estado, cidade, bairro, logradouro, numero, complemento]
      );

      await pool.query('COMMIT');
      res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    handleError(res, error, 'Erro no cadastro');
  }
};

exports.cadastroNFC = async (req, res) => {
  const { uid } = req.body;
  const userId = req.user.id;

  if (!uid || typeof uid !== 'string') {
    return res.status(400).json({ success: false, message: 'UID inválido' });
  }

  try {
    // Verifica se o UID já está em uso
    const uidExistente = await pool.query('SELECT id FROM usuario WHERE nfc_uid = $1 AND id != $2', [uid, userId]);
    if (uidExistente.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Esta pulseira já está cadastrada para outro usuário' });
    }

    const result = await pool.query(
      'UPDATE usuario SET nfc_uid = $1 WHERE id = $2 RETURNING *', 
      [uid.trim().toUpperCase(), userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.json({ success: true, message: 'Pulseira cadastrada com sucesso' });
  } catch (error) {
    handleError(res, error, 'Erro ao cadastrar pulseira');
  }
};

exports.getUsuario = async (req, res) => {
  const { id } = req.user;

  try {
    const usuarioInfo = await pool.query(`
      SELECT i.nome, i.email, i.telefone, i.data_nascimento, i.imagem_perfil,
             e.cep, e.estado, e.cidade, e.bairro, e.logradouro, e.numero, e.complemento
      FROM informacoes_usuario i
      JOIN usuario u ON i.usuario_id = u.id
      JOIN endereco_usuario e ON e.usuario_id = u.id
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