const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  const { cpf, senha } = req.body;

  try {
    const queryResult = await pool.query('SELECT * FROM usuario WHERE cpf = $1', [cpf]);
    const user = queryResult.rows[0];

    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(400).json('CPF ou senha inválidos.');
    }

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json('Erro interno do servidor.');
  }
};

exports.loginNfc = async (req, res) => {
  const { uid } = req.body;
  const usuario = await db.query("SELECT * FROM usuario WHERE nfc_uid = $1", [uid]);
  if (usuario.rows.length > 0) {
    const user = usuario.rows[0];
    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  } else {
    res.json({ success: false, message: "UID não cadastrado" });
  }
};

exports.cadastro = async (req, res) => {
  const { nome, cpf, senha, email, telefone, dataNascimento,cep,estado,cidade,bairro,logradouro,numero,complemento } = req.body;

  try {
    const cpfExistente = await pool.query('SELECT id FROM usuario WHERE cpf = $1', [cpf]);
    if (cpfExistente.rows.length > 0) return res.status(400).json('CPF já cadastrado.');

    const hashedPassword = await bcrypt.hash(senha, 10);

    const usuarioResult = await pool.query(
      'INSERT INTO usuario (cpf, senha) VALUES ($1, $2) RETURNING id',
      [cpf, hashedPassword]
    );

    const usuarioId = usuarioResult.rows[0].id;

    await pool.query(
      'INSERT INTO informacoes_usuario (usuario_id,nome,email, telefone,data_nascimento) VALUES ($1, $2, $3, $4, $5)',
      [usuarioId,nome,email,telefone,dataNascimento]
    );
    await pool.query(
      'INSERT INTO endereco_usuario (usuario_id,cep,estado, cidade, bairro, logradouro,numero,complemento) VALUES ($1, $2, $3, $4, $5,$6,$7,$8)',
      [usuarioId,cep,estado, cidade, bairro, logradouro,numero,complemento]
    );

    res.status(201).json('Usuário cadastrado com sucesso.');
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json('Erro interno no servidor.');
  }
};
exports.cadastroNFC = async (req, res) => {
  const { uid } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query('UPDATE usuario SET nfc_uid = $1 WHERE id = $2 RETURNING *', [uid, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.json({ message: 'Pulseira cadastrada com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao cadastrar pulseira.' });
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