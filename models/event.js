const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true, minlength: 5 },  // Ensuring a minimum length for descriptions
    userId: {type: mongoose.Types.ObjectId, required: true, ref: 'User'},  // Creator's user ID
    skill: {type: String, required: true},
    sportId: { type: String, required: true },  // ID of the sport type
    location: { type: String, required: true },  // Physical location of the event
    datetime: { type: Date, required: true },  // Using Date type for event timing
    participants: [{ type: mongoose.Types.ObjectId, ref: 'User' }],  // Array of participant user IDs
    comments: [{
        userId: { type: String, required: true },
        text: { type: String, required: true }
    }],  // Array of comment objects
    likes: [{ type: mongoose.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Event', eventSchema);  