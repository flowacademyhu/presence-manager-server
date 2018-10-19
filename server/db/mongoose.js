
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_PATH,  { useNewUrlParser: true });

module.exports = { mongoose };