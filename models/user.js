const mongoose = require('mongoose');
const uniqueValidator =  require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true},
    email: { type: String, required: true, unique: true},
    about: { type:String, required: false},
    password: {type: String, required: false, minlength: 6},
    firebaseUid: { type: String, required: true, unique: true }, // Link to Firebase user
    image: {type: String, required: false},
    //array means that it is a many to one relationship
    events: [{type: mongoose.Types.ObjectId, required: true, ref: 'Event'}],

    // Friends
    friends: [{ type: mongoose.Types.ObjectId, ref: 'User' }],  // List of friends (confirmed)

        // Friend requests
    friendRequestsSent: [{ type: mongoose.Types.ObjectId, ref: 'User' }],  // Sent friend requests
    friendRequestsReceived: [{ type: mongoose.Types.ObjectId, ref: 'User' }]  // Received friend requests
});
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User',userSchema);