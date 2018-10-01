const bcrypt = require('bcryptjs');

module.exports.hashPassword = (req, res, next) => {
    if (req.body.password) {
        if (req.body.password.length < 6) {
            next();
        }
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                next();
            }
            bcrypt.hash(req.body.password, salt, (err, hash) => {
                if (err) {
                    next();
                }
                req.body.password = hash;
                next();
            });
        });
    } else {
        next();
    }
};