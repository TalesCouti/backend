const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/hospitais', async (req, res) => {
  const { lat, lng, radius = 3000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Parâmetros latitude e longitude são obrigatórios' });
  }

  // Validar se as coordenadas são números válidos
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const raio = parseInt(radius);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(raio)) {
    return res.status(400).json({ error: 'Coordenadas inválidas' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Coordenadas fora dos limites válidos' });
  }

  if (raio < 100 || raio > 50000) {
    return res.status(400).json({ error: 'Raio de busca deve estar entre 100m e 50km' });
  }

  const key = process.env.MAPS_KEY;
  if (!key) {
    console.error('Chave da API do Google Maps não configurada');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${raio}&type=hospital&key=${key}`;

  try {
    const response = await axios.get(url);
    
    if (response.data.status === 'ZERO_RESULTS') {
      return res.json({ results: [] });
    }

    if (response.data.status !== 'OK') {
      console.error('Erro na API do Google Maps:', response.data.status);
      return res.status(500).json({ error: 'Erro ao buscar hospitais' });
    }

    res.json(response.data);
  } catch (err) {
    console.error('Erro ao consultar Google Maps:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do Google Maps' });
  }
});

module.exports = router;
