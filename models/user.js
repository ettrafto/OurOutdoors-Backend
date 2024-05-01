const mongoose = require('mongoose');
const uniqueValidator =  require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true},
    email: { type: String, required: true, unique: true},
    about: { type:String, required: false},
    password: {type: String, required: true, minlength: 6},
    image: {type: String, required: true},
    //array means that it is a many to one relationship
    events: [{type: mongoose.Types.ObjectId, required: true, ref: 'Event'}]

});
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User',userSchema);