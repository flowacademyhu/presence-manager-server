const mongoose = require('mongoose');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: true,
		minlength: 4
	},
	email:{
		type:String,
		required: true,
		trim: true,
		minlength: 6,
		unique: true,	
		validate:{
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
	Logs: [String]
});
let User = mongoose.model('User', UserSchema);

module.exports = { User };

