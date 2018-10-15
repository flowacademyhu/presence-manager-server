const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    minlength: 4
  },
  email: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
      isAsync: false
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  macAddress: {
    type: String,
    required: true,
    minlength: 5
  },
  contractId: {
    type: String,
    unique: true,
    required: true,
    minlength: 1
  },
  accessLevel: {
    type: Number,
    min: 0,
    max: 2,
    default: 2
  },
  _group: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isGeneratedPassword: {
    type: Boolean,
    default: true
  },
  logs: [{
    subjectDate: {
      type: String,
      required: true
    },
    firstCheckIn: {
      type: String,
    },
    lastCheckIn: {
      type: String,
    }
  }]
});

UserSchema.methods.generateAuthToken = function () {
  let user = this;
  let access = 'auth';
  return jwt.sign({ _id: user._id.toHexString(), access }, process.env.JWT_SECRET, { expiresIn: 7200 }).toString();
};

UserSchema.statics.findByToken = function (token) {
  let User = this;
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return Promise.reject();
  }

  return User.findOne({
    '_id': decoded._id
  });
};

UserSchema.statics.findByCredentials = function (email, password) {
  let User = this;

  return User.findOne({email}).then(user => {
    if (!user) {
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject();
        }
      });
    });
  });
};

UserSchema.methods.addTimeSameDay = function (index) {
  let user = this;

  user.logs[index].lastCheckIn = moment().format('hh:mm:ss.SSS');

  return user.save();
};

UserSchema.methods.addTimeNewDay = function () {
  let user = this;
  let time = moment().format('hh:mm:ss.SSS');
  let subjectDate = moment().format('YYYY-MM-DD');


  user.logs = user.logs.concat([{subjectDate: subjectDate, firstCheckIn: time}]);

  return user.save();
};


let User = mongoose.model('User', UserSchema);

module.exports = { User };

