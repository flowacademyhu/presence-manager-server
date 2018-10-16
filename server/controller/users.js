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

const localhost = process.env.WIFI_SERVER;

// sync
schedule.scheduleJob('*/1 * * * *', function(){
  axios.get(`${localhost}/logs/`)
    .then((response) => {

      const syncData = async (response) => {
        for (let i = 0; i < response.length; i++) {
          await User.findOneAndUpdate({macAddress: response[i].macAddress}, {$set: {logs: response[i].logs}}, {
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

  body.macAddress = body.macAddress.toLowerCase();

  let user = new User(body);

  user.save().then((user) => {
    res.status(200).send(user);
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
users.get('/list/all', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }
  User.find({})
    .then(users => {
      let allUsersName = users.map((user) => {
        return {macAddress: user.macAddress, contractId: user.contractId, name: user.name, email: user.email, _group: user._group, _id: user._id, logs: user.logs}
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

  User.find({logs: {$elemMatch: {subjectDate: moment().format('YYYY-MM-DD')}}}).then((users) => {
    let actualusers = users.map((user) => { return {name: user.name, _id: user._id, _group: user._group}; });
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

  body.macAddress = body.macAddress.toLowerCase();

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
    if (!user) return res.status(404).send();
    const response = {
      message: "User successfully deleted",
      id
    };
    return res.status(200).send(response);
  });
});

//Edit presence (lvl: 0)
users.patch('/presence/edit', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  let update = {};

  if (req.body.firstCheckIn && req.body.lastCheckIn) {
    update = {"logs.$.firstCheckIn": req.body.firstCheckIn, "logs.$.lastCheckIn": req.body.lastCheckIn};
  } else if (req.body.firstCheckIn && !req.body.lastCheckIn) {
    update = {"logs.$.firstCheckIn": req.body.firstCheckIn};
  } else if (!req.body.firstCheckIn && req.body.lastCheckIn) {
    update = {"logs.$.lastCheckIn": req.body.lastCheckIn};
  }

  axios.patch(`${localhost}/logs/`, {
    _id: req.body._id,
    firstCheckIn: req.body.firstCheckIn,
    lastCheckIn: req.body.lastCheckIn
  })
    .then(() => {
      User.update({"logs._id": req.body._id},
        {$set: update})
        .then(log => {
          if (!log) {
            return res.status(404).send();
          }
          res.status(200).send(log)
        })
        .catch(error => res.status(400).send(error))
    })
    .catch((err) => {
      if (err.response.status === 404) {
        res.status(404).send();
      }
      if (err.response.status === 400) {
        res.status(400).send();
      }
      res.status(503).send();
    });
});

// Manual checkIn
users.get('/presence/manual', authenticate, (req, res) => {

  axios.post(`${localhost}/logs/`, {
    macAddress: req.user.macAddress,
  })
    .then(() => {
      User.findOne({macAddress: req.user.macAddress})
        .then(item => {
          if (!item) {
            res.status(404).send();
          }
          if (item) {
            let index = item.logs.findIndex(obj => {
              return obj.subjectDate === moment().format('YYYY-MM-DD')
            });
            if (index >= 0) {
              item.addTimeSameDay(index)
                .then((response) => res.status(200).send(response))
                .catch(error => res.status(400).send(error));
            } else {
              item.addTimeNewDay()
                .then((response) => res.status(200).send(response))
                .catch(error => res.status(400).send(error));
            }
          }
        })
        .catch(error => res.status(400).send(error));
    })
    .catch(() => {
      res.status(503).send();
    });
});

// alreadyInToday
users.get('/presence/manual/:id', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  axios.get(`${localhost}/logs/${req.params.id}`)
    .then((resp) => {
      res.status(200).send(resp.data)
    })
    .catch((error) => {
      res.status(503).send(error)
    });
});

sendMail = function (randomPassword, email) {
  const api_key = process.env.API_KEY;
  const domain = process.env.DOMAIN;
  const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  const data = {
    from: `Presence Manager Server <flowpresencemanager@gmail.com>`,
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
