const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  }
});

let Group = mongoose.model('Group', GroupSchema);

module.exports = { Group };