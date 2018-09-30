require('./config/config');
require('./db/mongoose');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

let app = express();

const port = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const users = require('./controller/users');
app.use('/users', users);

const presences = require('./controller/presences')
app.use('/presences', precenses);

if (!module.parent) {
    app.listen(port, () => { console.log(`Started on port ${port}`); });
  }
  
  module.exports = { app };