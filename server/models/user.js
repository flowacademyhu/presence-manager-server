const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: true,
		minlength: 4
	},
	email: {
		type: String,
		required: true,
		trim: true,
		minlength: 6,
		unique: true,
		validate: {
			validator: validator.isEmail,
			message: '{VALUE} is not a valid email',
			isAsync: false
		}
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
	group: {
		type: String,
		enum: ['Mentor', 'TeamGamma', 'TeamDelta', 'Visitor']
	},
	isIn: {
		type: Boolean,
		default: false
	},
	deletedAt: {
		type: Date,
		default: null
	},
	Logs: [String]
});

UserSchema.methods.generateAuthToken = function () {
	let user = this;
	let access = 'auth';
	return jwt.sign({ _id: user._id.toHexString(), access }, process.env.JWT_SECRET, { expiresIn: 7200 }).toString();
};

UserSchema.statics.findByToken = function (token) {
	let User = this;
	let decoded;

	try {
		decoded = jwt.verify(token, process.env.JWT_SECRET);
	} catch (e) {
		return Promise.reject();
	}

	return User.findOne({
		'_id': decoded._id
	});
};

let User = mongoose.model('User', UserSchema);

module.exports = { User };

