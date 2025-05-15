const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/usuario', require('./routes/usuario'));

app.get('/', (req, res) => res.send('API funcionando!'));

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
