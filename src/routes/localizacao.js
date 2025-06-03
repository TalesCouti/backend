const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/hospitais', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Parâmetros latitude e longitude são obrigatórios' });
  }

  const key = process.env.MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=hospital&key=${key}`;

  try {
    const response = await axios.get(url);
    res.json(response.data.results || []);
  } catch (err) {
    console.error('Erro ao consultar Google Maps:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do Google Maps' });
  }
});

module.exports = router;
