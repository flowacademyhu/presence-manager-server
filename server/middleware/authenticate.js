const {User} = require('../models/user');

module.exports.authenticate = (req, res, next) => {
    let token = req.header('x-auth');

    User.findByToken(token).then(user => {
        if (!user) {
            return Promise.reject(new Error());
        }

        req.user = user;
        req.token = token;
        next();
    }).catch(() => {
        res.status(401).send();
    });
};