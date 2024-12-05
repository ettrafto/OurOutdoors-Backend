const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true }, // Ensure this is required
  message: { type: String, required: true }, // Make sure it's required
  link: { type: String, default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }, // Automatically sets current date
});

module.exports = mongoose.model('Notification', notificationSchema);
