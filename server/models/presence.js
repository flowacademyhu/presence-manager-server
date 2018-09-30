const mongoose = require('mongoose');

const PrecenseSchema = new mongoose.Schema({

});

let Precense = mongoose.model('Precense', PrecenseSchema);

module.exports = { Precense };