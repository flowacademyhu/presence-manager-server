const express = require('express');
const _ = require('lodash');

const users = express.Router({ mergeParams: true });

const { User } = require('../models/user');


//Lvl -> accessLevel Enum:[Admin:0, OfficeAdmin: 1, User:2]

//Create (lvl:0)
users.post('/', (req, res));

//Read me (lvl:2)
users.get('/me', (req, res));

//Login (lvl:2)
users.post('/login', (req, res));

//Read a user (lvl:0)
users.get('/:id', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  let id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  User.findById(id, (e, user) => {
    if (e) return res.status(500).send(e);
    return res.status(200).send(user)
  });
});


//Read all (lvl:0)
users.get('/all', (req, res));

//Read actuals (lvl:1)
users.get('/actuals', (req, res) => {
  User.find({ 'isIn': true }).then((users) => {
    let actualusers = users.map((user) => { return user.username; });
    res.send({ actualusers });
  }, (e) => {
    res.status(400).send(e);
  });
});

//Update user (lvl:2)
users.patch('/me', (req, res));

//Delete group (lvl:0)
users.delete('/group/:id', (req, res));

//Delete user (lvl: 0)
users.delete('/:id', (req, res));

module.exports = users;