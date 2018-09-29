const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	username: {
		type: String,
		trim: true,
		unique: true,
		required: true,
		minlength: 2
	},
	firstName: {
		type: String,
		trim: true,
		required: true,
		minlength: 2
	},
	lastName: {
		type: String,
		trim: true,
		required: true,
		minlength: 2
	},
	password: {
		type: String,
		required: true,
		minlength: 4
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
	isIn: {
		type: Boolean,
		default: false
	},
	Logs: [String]
});
let User = mongoose.model('User', UserSchema);

module.exports = { User };

