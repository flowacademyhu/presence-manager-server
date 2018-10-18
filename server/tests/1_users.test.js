const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');
const {describe, it, beforeEach} = require('mocha');

const {app} = require('../server');
const {User} = require('../models/user');
const {users, populateUsers, userPassword, tokens, populateGroup, groups} = require('./seeder/seed');

beforeEach(populateUsers);

describe('### USERS controller', () => {
  describe('-> POST /users (create user)', () => {
    it('should create a user', (done) => {
      let name = 'Test Elek';
      let email = 'elek@test.com';
      let macAddress = 'ff:ff:ff:ff:ff:ff';
      let contractId = 'flow00001';
      let accessLevel = 2;
      let _group = new ObjectID().toHexString();

      request(app)
        .post('/users')
        .set('x-auth', tokens[0])
        .send({name, email, macAddress, contractId, accessLevel, _group})
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(name);
          expect(res.body.email).toBe(email);
          expect(res.body.macAddress).toBe(macAddress);
          expect(res.body.accessLevel).toBe(accessLevel);
          expect(res.body._group).toBe(_group);
        })
        .end(err => {
          if (err) {
            return done(err);
          }

          User.findOne({email}).then(user => {
            expect(user).toBeTruthy();
            done();
          });
        });
    });

    it('should return 401 if user is not admin', (done) => {
      let name = 'Test Elek';
      let email = 'elek@test.com';
      let macAddress = 'ff:ff:ff:ff:ff:ff';
      let contractId = 'flow00001';
      let accessLevel = 2;
      let _group = new ObjectID().toHexString();

      request(app)
        .post('/users')
        .set('x-auth', tokens[1])
        .send({name, email, macAddress, contractId, accessLevel, _group})
        .expect(401)
        .end(done);
    });

    it('should return validation error if email invalid', (done) => {
      let name = 'Test Elek';
      let email = 'elek';
      let macAddress = 'ff:ff:ff:ff:ff:ff';
      let contractId = 'flow00001';
      let accessLevel = 2;
      let _group = new ObjectID().toHexString();

      request(app)
        .post('/users')
        .set('x-auth', tokens[0])
        .send({name, email, macAddress, contractId, accessLevel, _group})
        .expect(400)
        .end(done);
    });

    it('should not create user if e-mail in use', (done) => {
      let name = 'Test Elek';
      let email = users[0].email;
      let macAddress = 'ff:ff:ff:ff:ff:ff';
      let contractId = 'flow00001';
      let accessLevel = 2;
      let _group = new ObjectID().toHexString();

      request(app)
        .post('/users')
        .set('x-auth', tokens[0])
        .send({name, email, macAddress, contractId, accessLevel, _group})
        .expect(400)
        .end(done);
    });

    it('should not create user if contractId in use', (done) => {
      let name = 'Test Elek';
      let email = 'elek';
      let macAddress = 'ff:ff:ff:ff:ff:ff';
      let contractId = users[0].contractId;
      let accessLevel = 2;
      let _group = new ObjectID().toHexString();

      request(app)
        .post('/users')
        .set('x-auth', tokens[0])
        .send({name, email, macAddress, contractId, accessLevel, _group})
        .expect(400)
        .end(done);
    });
  });

  describe('-> GET /users/me (self data)', () => {
    it('should show self data', (done) => {
      request(app)
        .get('/users/me')
        .set('x-auth', tokens[1])
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(users[1].name);
          expect(res.body.email).toBe(users[1].email);
          expect(res.body.logs[0]._id).toBe(users[1].logs[0]._id.toHexString());
          expect(res.body._group).toBe(users[1]._group.toHexString());
        })
        .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
      request(app)
        .get('/users/me')
        .expect(401)
        .end(done);
    });
  });

  describe('-> POST /users/login (login user)', () => {
    it('should login user and return auth token', (done) => {
      request(app)
        .post('/users/login')
        .send({
          email: users[0].email,
          password: userPassword
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.idToken).toBeTruthy();
          expect(res.body.expiresIn).toBeTruthy();
          expect(res.body.accessLevel).toBe(users[0].accessLevel);
          expect(res.body.isGeneratedPassword).toBeFalsy();
        })
        .end(done);
    });

    it('should reject invalid login', (done) => {
      request(app)
        .post('/users/login')
        .send({
          email: users[1].email,
          password: userPassword + 1
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.idToken).toBeFalsy();
          expect(res.body.expiresIn).toBeFalsy();
          expect(res.body.accessLevel).toBeFalsy();
          expect(res.body.isGeneratedPassword).toBeFalsy();
        })
        .end(done);
    });
  });

  describe('-> POST /users/newpassword (update generated password)', () => {
    it('should change password if generated', (done) => {
      request(app)
        .patch('/users/newpassword')
        .set('x-auth', tokens[2])
        .send({
          password: 'asd123'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.password).not.toBe('asd123');
          expect(res.body.password).not.toBe(users[2].password);
        })
        .end(err => {
          if (err) {
            return done(err);
          }

          User.findOne({email: users[2].email}).then(user => {
            expect(user).toBeTruthy();
            expect(user.isGeneratedPassword).toBe(false);
            expect(user.password).not.toBe(users[2].password);
            done();
          });
        });
    });

    it('should return 400 if password already changed', (done) => {
      request(app)
        .patch('/users/newpassword')
        .set('x-auth', tokens[1])
        .send({
          password: 'asd123'
        })
        .expect(400)
        .end(done)
    });

    it('should return 400 if password is invalid', (done) => {
      request(app)
        .patch('/users/newpassword')
        .set('x-auth', tokens[2])
        .send({
          password: 'admin'
        })
        .expect(400)
        .end(done)
    });

    it('should return 401 if not authorized', (done) => {
      request(app)
        .patch('/users/newpassword')
        .send({
          password: 'admin'
        })
        .expect(401)
        .end(done)
    });

  });

  describe('-> GET /users/:id', () => {
    it('should return user by id', (done) => {
      request(app)
        .get(`/users/${users[2]._id}`)
        .set('x-auth', tokens[0])
        .expect(200)
        .expect((res) => {
          expect(res.body.macAddress).toBe(users[2].macAddress);
          expect(res.body.email).toBe(users[2].email);
        })
        .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
      request(app)
        .get(`/users/${users[2]._id}`)
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .get(`/users/${users[2]._id}`)
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });

    it('should return 400 if param is not Object ID', (done) => {
      request(app)
        .get(`/users/test`)
        .set('x-auth', tokens[0])
        .expect(400)
        .end(done);
    });
  });

  describe('-> GET /users/list/all', () => {
    it('should return all users data', (done) => {
      request(app)
        .get('/users/list/all')
        .set('x-auth', tokens[0])
        .expect(200)
        .expect((res) => {
          expect(res.body[0].email).toBe(users[0].email);
          expect(res.body[1].email).toBe(users[1].email);
          expect(res.body[2].email).toBe(users[2].email);
        })
        .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
      request(app)
        .get('/users/list/all')
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .get('/users/list/all')
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });
  });

  describe('-> GET /users/list/actuals', () => {
    it('should return 401 if not authenticated', (done) => {
      request(app)
        .get('/users/list/actuals')
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .get('/users/list/actuals')
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });

    it('should return all users data if logged in today', (done) => {
      request(app)
        .get('/users/list/actuals')
        .set('x-auth', tokens[0])
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(0);
        })
        .end(done);
    });
  });

  describe('-> PATCH /users/', () => {
    it('should return 401 if not authenticated', (done) => {
      request(app)
        .patch('/users/')
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .patch('/users/')
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });

    it('should return 200 and response', (done) => {
      let macAddress = 'ff:ff:ff:ff:ff:ff';
      let _id = users[2]._id;

      request(app)
        .patch('/users/')
        .set('x-auth', tokens[0])
        .send({macAddress, _id})
        .expect(200)
        .end(err => {
          if (err) {
            return done(err);
          }

          User.findOne({_id}).then(user => {
            expect(user.macAddress).toBe(macAddress);
            done();
          });
        });
    });

  });

  describe('-> DELETE /users/:id', () => {
    it('should delete user by id', (done) => {
      request(app)
        .delete(`/users/${users[2]._id}`)
        .set('x-auth', tokens[0])
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('User successfully deleted');
        })
        .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
      request(app)
        .delete(`/users/${users[2]._id}`)
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .delete(`/users/${users[2]._id}`)
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });

    it('should return 400 if param is not Object ID', (done) => {
      request(app)
        .delete(`/users/test`)
        .set('x-auth', tokens[0])
        .expect(404)
        .end(done);
    });
  });
});