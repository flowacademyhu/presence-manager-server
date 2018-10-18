const {ObjectID} = require('mongodb');
const jwt = require('jsonwebtoken');

const {User} = require('../../models/user');
const {Group} = require('../../models/group');

const userOneID = new ObjectID();
const userTwoID = new ObjectID();
const userThreeID = new ObjectID();

const userOneLogID = new ObjectID();
const userTwoLogID = new ObjectID();
const userThreeLogID = new ObjectID();

const groupOneID = new ObjectID();
const groupTwoID = new ObjectID();
const groupThreeID = new ObjectID();

let access = 'auth';
const userOneToken = jwt.sign({ _id: userOneID.toHexString(), access }, process.env.JWT_SECRET, { expiresIn: 7200 }).toString();
const userTwoToken = jwt.sign({ _id: userTwoID.toHexString(), access }, process.env.JWT_SECRET, { expiresIn: 7200 }).toString();
const userThreeToken = jwt.sign({ _id: userThreeID.toHexString(), access }, process.env.JWT_SECRET, { expiresIn: 7200 }).toString();
const tokens = [userOneToken, userTwoToken, userThreeToken];

const userPassword = 'admin';

const users = [
  {
    _id: userOneID,
    name: 'TestAdmin',
    email: 'admin@flow.com',
    password: '$2a$10$c0OXHOTQ/zb3bX/TWtBJTOpt8jp9.6DhmbBTFDOf.1LWE1AF7yZ5.',
    macAddress: 'ff:ff:ff:ff:ff:ff',
    contractId: 'flow001',
    accessLevel: 0,
    _group: groupOneID,
    isGeneratedPassword: false,
    logs: [{
      _id: userOneLogID,
      subjectDate: '2018-12-24',
      firstCheckIn: '09:00:00.000',
      lastCheckIn: '17:00:00.000'
    }]
  },
  {
    _id: userTwoID,
    name: 'TestOfficeAdmin',
    email: 'officeadmin@flow.com',
    password: '$2a$10$c0OXHOTQ/zb3bX/TWtBJTOpt8jp9.6DhmbBTFDOf.1LWE1AF7yZ5.',
    macAddress: 'ff:ff:ff:ff:ff:ff',
    contractId: 'flow002',
    accessLevel: 1,
    _group: groupTwoID,
    isGeneratedPassword: false,
    logs: [{
      _id: userTwoLogID,
      subjectDate: '2018-12-24',
      firstCheckIn: '09:00:00.000',
      lastCheckIn: '17:00:00.000'
    }]
  },
  {
    _id: userThreeID,
    name: 'TestMember',
    email: 'member@flow.com',
    password: '$2a$10$c0OXHOTQ/zb3bX/TWtBJTOpt8jp9.6DhmbBTFDOf.1LWE1AF7yZ5.',
    macAddress: 'ff:ff:ff:ff:ff:ff',
    contractId: 'flow003',
    accessLevel: 2,
    _group: groupThreeID,
    isGeneratedPassword: true,
    logs: [{
      _id: userThreeLogID,
      subjectDate: '2018-11-18',
      firstCheckIn: '09:00:00.000',
      lastCheckIn: '17:00:00.000'
    }]
  }
];

const populateUsers = (done) => {
  User.deleteMany({}).then(() => {
    let userOne = new User(users[0]).save();
    let userTwo = new User(users[1]).save();
    let userThree = new User(users[2]).save();

    return Promise.all([userOne, userTwo, userThree]);
  }).then(() => done());
};


const groups = [
  {
    _id : groupOneID,
    name : 'Mentor'
  },
  {
    _id : groupTwoID,
    name : 'Gamma'
  },
  {
    _id : groupThreeID,
    name : 'Delta'
  }
];

const populateGroup = (done) => {
  Group.deleteMany({}).then(() => {
    let groupOne = new Group(groups[0]).save();
    let groupTwo = new Group(groups[1]).save();
    let groupThree = new Group(groups[2]).save();

    return Promise.all([groupOne, groupTwo, groupThree]);
  }).then(() => done());
};

module.exports = {
  users,
  populateUsers,
  userPassword,
  tokens,
  groups,
  populateGroup
};