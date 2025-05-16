const inserirMedico = require('../services/inserirMedico');

async function inserirMedicoTeste(req, res) {
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
    console.error('Erro no controller:', err);
    res.status(500).send('Erro ao inserir médico.');
  }
}

module.exports = { inserirMedicoTeste };
