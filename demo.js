const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/geoserver/wfs', (req, res) => {
  res.json({ message: 'This route is CORS-enabled' });
});

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
