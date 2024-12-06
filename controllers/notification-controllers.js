// notificationsController.js

const Notification = require('../models/notification');  // Corrected schema import
const HttpError = require('../models/http-error');  // Import HttpError class

const getUserNotifications = async (req, res, next) => {
  const userId = req.params.userId;

  let notifications;
  try {
    // Fetch notifications for the user that are unread
    notifications = await Notification.find({ userId: userId, isRead: false }).sort({ createdAt: -1 });
  } catch (err) {
    return next(new HttpError('Fetching notifications failed, please try again later.', 500));
  }

  // If no notifications found, return count as 0 and an empty array
  if (!notifications || notifications.length === 0) {
    return res.json({ count: 0, notifications: [] });
  }

  // Return both the count and the actual notifications
  res.json({ 
    count: notifications.length, 
    notifications: notifications.map(notification => notification.toObject({ getters: true })) 
  });
};


const markAsRead = async (req, res, next) => {
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds)) {
    return res.status(400).json({ message: 'Invalid notification IDs' });
  }

  try {
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { isRead: true } }
    );

    console.log(`Notifications updated: ${result.nModified}`); // Debugging
    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
};

  

  const addNotification = async (userId, message, link = null) => {

    
    console.log(" hello message:", message); // Should log the string message
    
    const notification = new Notification({
      userId,
      message,
      link,
      isRead: false,
      createdAt: new Date(),
    });
  
  
    try {
      await notification.save();
    } catch (err) {
      //console.error('Error saving notification:', err); // Log the actual error
      throw new HttpError('Failed to add notification.', 500);
    }
  };
  
  
  
exports.getUserNotifications = getUserNotifications;
exports.markAsRead = markAsRead;
exports.addNotification = addNotification;