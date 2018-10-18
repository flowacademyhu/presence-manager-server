const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');
const {describe, it, beforeEach} = require('mocha');

const {app} = require('../server');
const {Group} = require('../models/group');
const {populateGroup, groups, tokens} = require('./seeder/seed');

beforeEach(populateGroup);

describe('### GROUPS controller', () => {
  describe('-> POST /groups (create group)', () => {
    it('should create a group', (done) => {
      let name = 'testtest';

      request(app)
        .post('/groups/')
        .set('x-auth', tokens[0])
        .send({name})
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(name);
        })
        .end(err => {
          if (err) {
            return done(err);
          }

          Group.findOne({name}).then(user => {
            expect(user).toBeTruthy();
            done();
          });
        });
    });

    it('should return 401 if not admin', (done) => {
      let name = 'testtest';

      request(app)
        .post('/groups/')
        .set('x-auth', tokens[2])
        .send({name})
        .expect(401)
        .end(done);
    });

    it('should return 401 if no token', (done) => {
      let name = 'testtest';

      request(app)
        .post('/groups/')
        .send({name})
        .expect(401)
        .end(done);
    });

  });

  describe('-> DELETE /groups/:id (delete group)', () => {
    it('should delete group by id', (done) => {
      request(app)
        .delete(`/groups/${groups[2]._id}`)
        .set('x-auth', tokens[0])
        .expect(200)
        .end(err => {
          if (err) {
            return done(err);
          }

          Group.findOne({_id: groups[2]._id}).then(group => {
            expect(group).toBeFalsy();
            done();
          });
        });
    });

    it('should return 401 if not authenticated', (done) => {
      request(app)
        .delete(`/groups/${groups[2]._id}`)
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .delete(`/groups/${groups[2]._id}`)
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });

    it('should return 400 if param is not Object ID', (done) => {
      request(app)
        .delete(`/groups/test`)
        .set('x-auth', tokens[0])
        .expect(400)
        .end(done);
    });
  });

  describe('-> PATCH /groups (edit group)', () => {
    it('should return 401 if not authenticated', (done) => {
      request(app)
        .patch('/groups/')
        .expect(401)
        .end(done);
    });

    it('should return 401 if not admin', (done) => {
      request(app)
        .patch('/groups/')
        .set('x-auth', tokens[2])
        .expect(401)
        .end(done);
    });

    it('should return 200 and response', (done) => {
      let name = 'updated';
      let _id = groups[0]._id;

      request(app)
        .patch('/groups/')
        .set('x-auth', tokens[0])
        .send({name, _id})
        .expect(200)
        .end(err => {
          if (err) {
            return done(err);
          }

          Group.findOne({_id}).then(group => {
            expect(group.name).toBe(name);
            done();
          });
        });
    });
  });

  describe('-> GET /groups', () => {
    it('should return 401 if no token', (done) => {
      request(app)
        .get('/groups/')
        .expect(401)
        .end(done);
    });

    it('should return groups', (done) => {
      request(app)
        .get('/groups/')
        .set('x-auth', tokens[0])
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(3);
        })
        .end(done);
    });
  });
});