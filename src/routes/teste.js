const express = require('express');
const router = express.Router();
const pool = require('../db/pool'); // caminho correto do seu pool
const bcrypt = require('bcryptjs');

async function inserirMedico({ crm, senha, nome, email, telefone, data_nascimento, especialidade, imagem_perfil }) {
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
}

router.get('/insercao-medico', async (req, res) => {
  try {
    await inserirMedico({
      crm: '123456-MG',
      senha: '123456',
      nome: 'Dra. Ana Silva',
      email: 'ana@gmail.com',
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
