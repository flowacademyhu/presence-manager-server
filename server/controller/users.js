const express = require('express');
const _ = require('lodash');

const users = express.Router({ mergeParams: true });

const {User} = require('../models/user');
const {hashRandomPassword, authenticate, hashPassword} = require('../middleware/hash_randomPassword');

//Lvl -> accessLevel Enum:[Admin:0, OfficeAdmin: 1, User:2]

//Create (lvl:0)
users.post('/', hashRandomPassword, (req, res) => {
  let body = _.pick(req.body, ['name', 'email', 'password', 'contractId', 'accessLevel', 'group']);
  let user = new User(body);
  let unHashedRandomPassword = _.pick(req.body, ['unHashedRandomPassword']);
  sendMail(unHashedRandomPassword, body.email);

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
users.post('/login', (req, res) => {
    let body = _.pick(req.body, ['email', 'password']);

    User.findByCredentials(body.email, body.password).then(user => {
        return user.generateAuthToken().then(token => {
            res.header('x-auth', token).send({
                idToken: token,
                expiresIn: 7200,
                accessLevel: user.accessLevel
            });
        });
    }).catch(err => {
        res.status(400).send(err);
    });
});

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
users.get('/name', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }
  User.find({})
    .then(users => {
      let allUsersName = users.map((user) => {
        return user.name
      });
      res.send({ allUsersName });
    }, (e) => {
      res.status(400).send(e);
    });
});


//Read actuals (lvl:1)
users.get('/actuals', authenticate, (req, res) => {

  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  User.find({ 'isIn': true }).then((users) => {
    let actualusers = users.map((user) => { return user.name; });
    res.send({ actualusers });
  }, (e) => {
    res.status(400).send(e);
  });
});

//Update user (lvl:2)
users.patch('/me', (req, res));

//Update user (lvl:0)
users.patch('/users', [authenticate, hashPassword], (req, res) => {
    let body = _.pick(req.body, ['name','email', 'password', 'contractId', 'accessLevel', 'group']);

    User.findOneAndUpdate({
        _id: req.body._id
    }, {$set: body}, {new: true, runValidators: true}).then(user => {
        if (!user) {
            return res.status(404).send();
        }

        res.status(200).send({user});
    }).catch(err => {
        if (err) {
            res.status(400).send();
        }
    });
});

//Delete group (lvl:0)
users.delete('/users/group/:id', (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(400).send();
  }
  User.remove({ 'group': req.params.id }).then((user) => {
    res.send({ user });
  }, (e) => {
    res.status(400).send(e);
  });
});

//Delete user (lvl: 0)
users.delete('/:id', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  let id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  User.findByIdAndRemove(id, (e, user) => {
    if (e) return res.status(404).send(e);
    const response = {
      message: "User successfully deleted",
      id: user._id
    };
    return res.status(200).send(response);
  });
});

sendMail = function (randomPassword, email) {
  var api_key = process.env.API_KEY;
  var domain = process.env.DOMAIN;
  var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  var data = {
    from: 'Presence Manager Server <flowpresencemanager@gmail.com>',
    to: email,
    subject: 'Flow Academy Regisztrációs Jelszó',
    text: `Kedves Regisztráló! Első belépéshez való belépési kódod: ${randomPassword}`
  };

  mailgun.messages().send(data, function (error, body) {
    if (error) {
      console.log(error);
    }
    console.log(body);
  });
};

module.exports = users;