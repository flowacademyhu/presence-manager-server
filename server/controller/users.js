const express = require('express');
const _ = require('lodash');
const {ObjectID} = require('mongodb');
const axios = require('axios');
const moment = require('moment');
const schedule = require('node-schedule');

const users = express.Router();

const { User } = require('../models/user');
const { hashRandomPassword } = require('../middleware/hash_randomPassword');
const { authenticate } = require('../middleware/authenticate');
const { hashPassword } = require('../middleware/hash_password');

// sync
schedule.scheduleJob('*/1 * * * *', function(){
  axios.get('http://localhost:3001/logs')
    .then((response) => {

      const syncData = async (response) => {
        for (let i = 0; i < response.length; i++) {
          await User.findOneAndUpdate({_id: response[i]._user}, {$set: {logs: response[i].logs}}, {
            new: true,
            runValidators: true
          });
        }
      };

      syncData(response.data).then(() => console.log(`${new Date()} - OK`)).catch(() => console.log(`${new Date()} - ERROR`))
    })
    .catch(() => {
      console.log(`${new Date()} - ERROR - 503`);
    });
});

//Lvl -> accessLevel Enum:[Admin:0, OfficeAdmin: 1, User:2]

//Create (lvl:0)
users.post('/',[authenticate, hashRandomPassword], (req, res) => {
    if (req.user.accessLevel !== 0) {
        return res.status(401).send();
    }
  let body = _.pick(req.body, ['name', 'email', 'macAddress', 'password', 'contractId', 'accessLevel', '_group']);
  let user = new User(body);

  user.save().then((user) => {

    axios.post('http://localhost:3001/logs', {
      _user: user._id,
      macAddress: user.macAddress
    })
      .then(() =>  {
        sendMail(req.body.unHashedRandomPassword, body.email);
        res.status(200).send(user);
      })
      .catch(() => {
        User.findByIdAndRemove(user._id, (error) => {
          if (!error) {
            res.status(503).send(error);
          }
        });
      });
  }).catch(e => res.status(400).send(e));
});

// Read me (lvl:2)
users.get('/me', authenticate, (req, res) => {

  User.findById({_id: req.user._id})
    .then(user => {
      if (!user) {
        return res.status(404).send();
      }
        let body = _.pick(user, ['name', 'email', '_group', 'logs']);

      res.status(200).send(body);
  }).catch(err => {
    if (err) {
      res.status(400).send(err);
    }
  });
});

//Login (lvl:2)
users.post('/login', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);

  User.findByCredentials(body.email, body.password)
    .then(user => {
      let token =  user.generateAuthToken();
      res.send({
        idToken: token,
        expiresIn: 7200,
        accessLevel: user.accessLevel,
        isGeneratedPassword: user.isGeneratedPassword
      });
    }).catch(err => {
    res.status(400).send(err);
  });
});

//New User
users.patch('/newpassword',[authenticate, hashPassword], (req, res) => {

  User.findOneAndUpdate({
    _id: req.user._id
  }, { $set: {password: req.body.password, isGeneratedPassword: false} }, { new: true, runValidators: true }).then(user => {
    if (!user) {
      return res.status(404).send();
    }

    res.status(200).send(user);
  }).catch(err => {
    if (err) {
      res.status(400).send();
    }
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
users.get('/list/name', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }
  User.find({})
    .then(users => {
      let allUsersName = users.map((user) => {
        return [user.name, user._group, user._id]
      });
      res.send(allUsersName);
    }, (e) => {
      res.status(400).send(e);
    });
});


//Read actuals (lvl:1)
users.get('/list/actuals', authenticate, (req, res) => {
  if (req.user.accessLevel > 1) {
    return res.status(401).send();
  }

  User.find({logs: {$elemMatch: {subjectDate: moment().format('MMMM Do YYYY')}}}).then((users) => {
    let actualusers = users.map((user) => { return [user.name, user._id, user._group, user.logs[user.logs.length - 1].lastCheckIn]; });
    res.status(200).send(actualusers);
  }, (e) => {
    res.status(400).send(e);
  });
});

//Update user (lvl:0)
users.patch('/', [authenticate, hashPassword], (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  let body = _.pick(req.body, ['name', 'email', 'macAddress', 'password', 'contractId', 'accessLevel', '_group']);


  if (body.macAddress) {
    axios.patch('http://localhost:3001/logs', {
      _user: req.body._id,
      macAddress: body.macAddress
    })
      .then(() => {
        User.findOneAndUpdate({
          _id: req.body._id
        }, { $set: body }, { new: true, runValidators: true }).then(user => {
          if (!user) {
            return res.status(404).send();
          }

          res.status(200).send(user);
        }).catch(err => {
          if (err) {
            res.status(400).send();
          }
        });
      })
      .catch(error => {
        if (error.response && error.response.status === 404) {
          res.status(404).send()
        } else {
          res.status(503).send();
        }
      });
  } else {
    User.findOneAndUpdate({
      _id: req.body._id
    }, { $set: body }, { new: true, runValidators: true }).then(user => {
      if (!user) {
        return res.status(404).send();
      }

      res.status(200).send(user);
    }).catch(err => {
      if (err) {
        res.status(400).send();
      }
    });
  }
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

  axios.delete(`http://localhost:3001/logs/${id}`)
    .then(() => {
      User.findByIdAndRemove(id, (e, user) => {
        if (e) return res.status(404).send(e);
        if (!user) return res.status(404).send();
        const response = {
          message: "User successfully deleted",
          id
        };
        return res.status(200).send(response);
      });
    })
    .catch(() => {
      res.status(503).send();
    });
});

//Edit presence (lvl: 0)
users.patch('/presence/edit', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  axios.patch('http://localhost:3001/logs/presence/edit', {
    _user: req.body._user,
    _id: req.body._id,
    firstCheckIn: req.body.firstCheckIn,
    lastCheckIn: req.body.lastCheckIn
  })
    .then(() => {
      User.update({_id : req.body._user, "logs._id": req.body._id},
        {$set: {"logs.$.firstCheckIn": req.body.firstCheckIn, "logs.$.lastCheckIn": req.body.lastCheckIn}})
        .then(log => {
          if (!log) {
            return res.status(404).send();
          }
          res.status(200).send(log)
        })
        .catch(error => res.status(400).send(error))
    })
    .catch(() => {
      res.status(503).send();
    });
});

sendMail = function (randomPassword, email) {
  const api_key = process.env.API_KEY;
  const domain = process.env.DOMAIN;
  const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  console.log(email);

  const data = {
    from: 'Presence Manager Server <flowpresencemanager@gmail.com>',
    to: `${email}`,
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
