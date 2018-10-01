var randomstring = require("randomstring");
const bcrypt = require('bcryptjs');

module.exports.hashRandomPassword = (req, res, next) => {
    let randomPassword = randomstring.generate({
        length: 4,
        charset: 'numeric'
    });
    if (randomPassword) {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                next();
            }
            bcrypt.hash(randomPassword, salt, (err, hash) => {
                if (err) {
                    next();
                }
                req.body.password = hash;
                req.body.unHashedRandomPassword = randomPassword;
                next();
            });
        });

    } else {
        next();
    }
};