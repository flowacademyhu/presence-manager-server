const express = require('express');
const _ = require('lodash');

const users = express.Router({mergeParams: true});

const {User} = require('../models/user');


//Lvl -> accessLevel Enum:[Admin:0, OfficeAdmin: 1, User:2]

//Create (lvl:0)
users.post('/', hashPassword, (req, res) => {
    let body = _.pick(req.body, ['name','email', 'password', 'contractId', 'accessLevel', 'group']);
    let user = new User(body);

    user.save().then(() => {
        return user.generateAuthToken();
    }).then((token) => {
        res.header('x-auth', token).send({
            idToken: token,
            expiresIn: 7200,
            accessLevel: user.accessLevel
        });
    }).catch(e => res.status(400).send(e));
});

//Read me (lvl:2)
users.get('/me', (req, res));

//Login (lvl:2)
users.post('/login', (req, res));

//Read all (lvl:0)
users.get('/all', (req, res));

//Read actuals (lvl:1)
users.get('/actuals', (req, res) => {
  User.find({'isIn': true}).then((users) => {
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