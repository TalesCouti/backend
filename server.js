const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv'); // Carregar as variáveis de ambiente
dotenv.config(); // Carregar o arquivo .env

const app = express();
const port = process.env.PORT || 3000; // Usar a variável de ambiente PORT

app.use(express.json());
app.use(cors()); // Permitir requisições de outros domínios

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Conectar com o banco de dados usando a variável de ambiente
  ssl: {
    rejectUnauthorized: false
  }
});

const SECRET = process.env.JWT_SECRET; // A chave secreta do JWT

// Teste para verificar se a API está funcionando
app.get('/', (req, res) => {
  res.send('API funcionando!');
});

app.get('/usuario', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, SECRET);

    
    const usuarioInfo = await pool.query(`
      SELECT i.nome 
      FROM informacoes_usuario i
      JOIN usuario u ON i.usuario_id = u.id
      WHERE u.id = $1
    `, [decoded.id]);

    if (usuarioInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({ nome: usuarioInfo.rows[0].nome });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    res.status(500).json({ message: 'Erro ao buscar informações do usuário' });
  }
});
// Login de usuário
app.post('/login', async (req, res) => {
  const { cpf, password } = req.body;

  try {
    const queryResult = await pool.query('SELECT * FROM usuarios WHERE cpf = $1', [cpf]);
    const user = queryResult.rows[0];

    if (!user) {
      return res.status(400).json('CPF ou senha inválidos.');
    }

    const senhaCorreta = await bcrypt.compare(password, user.senha);

    if (!senhaCorreta) {
      return res.status(400).json('CPF ou senha inválidos.');
    }

    const token = jwt.sign({ id: user.id, nome: user.nome }, SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json('Erro interno do servidor.');
  }
});

// Cadastro de novo usuário
app.post('/cadastro', async (req, res) => {
  const { nome, cpf, senha, email, telefone, dataNascimento } = req.body;

  try {
    // Verificar se o CPF já existe no banco de dados
    const cpfExistente = await pool.query('SELECT id FROM usuario WHERE cpf = $1', [cpf]);
    if (cpfExistente.rows.length > 0) {
      return res.status(400).json('CPF já cadastrado.');
    }
    

    // Criptografar a senha do usuário
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir o usuário na tabela de 'usuarios' (apenas CPF e senha)
    const usuarioResult = await pool.query(
      'INSERT INTO usuario (cpf, senha) VALUES ($1, $2) RETURNING id',
      [cpf, hashedPassword]
    );

    const usuarioId = usuarioResult.rows[0].id;

    
    
    await pool.query(
      'INSERT INTO informacoes_usuario (nome, data_nascimento, telefone, email, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [nome, dataNascimento, telefone, email, usuarioId]
    );

    res.status(201).json('Usuário cadastrado com sucesso.');
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json('Erro interno no servidor.');
  }
});

// Inicializando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
