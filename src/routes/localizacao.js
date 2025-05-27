const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/hospitais', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Parâmetros lat e lng são obrigatórios' });
  }

  const key = process.env.MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=hospital&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.results || []);
  } catch (err) {
    console.error('Erro ao consultar Google Maps:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do Google Maps' });
  }
});

module.exports = router;
