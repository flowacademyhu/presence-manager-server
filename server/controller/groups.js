const express = require('express');
const groups = express.Router();
const _ = require('lodash');
const axios = require('axios');

const { Group } = require('../models/group');
const { User } = require('../models/user');

const { authenticate } = require('../middleware/authenticate');

groups.post('/', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }
  let body = _.pick(req.body, ['name']);
  let group = new Group(body);

  group.save()
    .then(group => {
      res.status(200).send(group);
    })
    .catch(error => {
      res.status(400).send(error);
    })
});


// DELETE /groups
groups.delete('/:id', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  Group.deleteOne({ '_id': req.params.id }).then((group) => {
    const deleteRecords = async () => {
      let users = await User.find({'_group': req.params.id});
      let IDs = users.map(user => {return user._id});

      let results = [];

      for (let i = 0; i < IDs.length; i++) {
        let serverResp = await User.deleteOne({_id: IDs[i]});
        results.push(serverResp);
      }

      return results;
    };

    deleteRecords().then(ids => {
      if (group && ids.length === 0) {
        res.status(200).send(group);
      }

      if (ids.length === 0) {
        res.status(400).send({message: 'No record by the provided param'});
      }
      res.status(200).send({ids});
    })
      .catch(error => {
        if (error.errno === 'ECONNREFUSED') {
          res.status(503).send();
        }
      });
  }, (e) => {
    res.status(400).send(e);
  });
});

// PATCH /groups
groups.patch('/', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  Group.findOneAndUpdate({
    _id: req.body._group
  }, { $set: { name: req.body.name } }, { new: true, runValidators: true }).then(group => {
    if (!group) {
      return res.status(404).send();
    }

    res.status(200).send(group);
  }).catch(err => {
    if (err) {
      res.status(400).send();
    }
  });
});


// GET /groups
groups.get('/', authenticate, (req, res) => {
  if (req.user.accessLevel !== 0) {
    return res.status(401).send();
  }

  Group.find().then((groups) => {
    res.status(200).send(groups);
  }, (e) => {
    res.status(400).send(e);
  });
});


module.exports = groups;