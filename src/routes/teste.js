const express = require('express');
const router = express.Router();
const pool = require('../db/pool'); // ajuste o caminho se necessário
const bcrypt = require('bcryptjs');

// Função inserção
async function inserirMedico({
  crm,
  senha,
  nome,
  email,
  telefone,
  data_nascimento,
  especialidade,
  imagem_perfil
}) {
  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    const medicoResult = await pool.query(
      'INSERT INTO medico (crm, senha) VALUES ($1, $2) RETURNING id',
      [crm, senhaHash]
    );

    const medicoId = medicoResult.rows[0].id;

    await pool.query(
      `INSERT INTO informacoes_medico 
        (medico_id, nome, email, telefone, data_nascimento, especialidade, imagem_perfil) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [medicoId, nome, email, telefone, data_nascimento, especialidade, imagem_perfil]
    );
  } catch (error) {
    console.error('Erro ao inserir médico:', error);
    throw error;
  }
}

// Rota de teste
router.get('/insercao-medico', async (req, res) => {
  try {
    await inserirMedico({
      crm: '123456-MG',
      senha: '123456',
      nome: 'Dra. Sergio Silva',
      email: 'Sergio@gmail.com',
      telefone: '11988887777',
      data_nascimento: '1975-04-20',
      especialidade: 'Dermatologia',
      imagem_perfil: 'https://i.imgur.com/rVtAyvh.jpeg'
    });
    res.send('Médico inserido com sucesso.');
  } catch (err) {
    res.status(500).send('Erro ao inserir médico.');
  }
});

module.exports = router;
