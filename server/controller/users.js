const express = require('express');
const _ = require('lodash');

const users = express.Router({ mergeParams: true });

const {User} = require('../models/user');
const {hashRandomPassword} = require('../middleware/hash_randomPassword');

//Lvl -> accessLevel Enum:[Admin:0, OfficeAdmin: 1, User:2]

//Create (lvl:0)
users.post('/', hashRandomPassword, (req, res) => {
    let body = _.pick(req.body, ['name','email', 'password', 'contractId', 'accessLevel', 'group']);
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
users.post('/login', (req, res));

//Read all (lvl:0)
users.get('/name', authenticate, (req, res) => {
	if(req.user.accessLevel !== 0) {
		return res.status(401).send();
	}
	user.find ({
		_name: req.user._name,
		_id: req.user._id 
	})
	.then(users => res.send(users))
	.catch(e => res.status(400).send(e));
});


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
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

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