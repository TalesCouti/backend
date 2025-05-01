const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


app.use(cors());
app.use(express.json());


const SECRET = process.env.JWT_SECRET;

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


// Nova rota de cadastro
app.post('/cadastro', async (req, res) => {
  const { nome, cpf, senha, email, telefone, dataNascimento, endereco } = req.body;

  try {
    // Verificar se CPF já existe
    const cpfExistente = await pool.query('SELECT id FROM usuarios WHERE cpf = $1', [cpf]);
    if (cpfExistente.rows.length > 0) {
      return res.status(400).json('CPF já cadastrado.');
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir no usuários (cpf + senha)
    const usuarioResult = await pool.query(
      'INSERT INTO usuarios (cpf, senha) VALUES ($1, $2) RETURNING id',
      [cpf, hashedPassword]
    );

    const usuarioId = usuarioResult.rows[0].id;

    // Inserir nas informações do usuário (ligado ao id do usuário)
    await pool.query(
      'INSERT INTO informacoes_usuario (id, nome, data_nascimento, endereco, telefone, email) VALUES ($1, $2, $3, $4, $5, $6)',
      [usuarioId, nome, dataNascimento, endereco, telefone, email]
    );

    res.status(201).json('Usuário cadastrado com sucesso.');
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json('Erro interno no servidor.');
  }
});
