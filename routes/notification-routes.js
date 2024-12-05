const express = require('express');
const { check, validationResult } = require('express-validator');

const notificationsController = require('../controllers/notification-controllers');
const mongoose = require('mongoose');

const router = express.Router();

// Middleware to check if ObjectId is valid
const isValidObjectId = (value, { req }) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

// Get notifications for a user
router.get(
  '/getUserNotification/:userId',
  [check('userId').custom(isValidObjectId)], // Check that userId is a valid MongoDB ObjectId
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    notificationsController.getUserNotifications(req, res, next);
  }
);

//router.get('/getNotification/:userId', notificationsController.getUserNotifications);

// Mark notification as read
router.patch(
  '/read/:notificationId',
  [check('notificationId').custom(isValidObjectId)], // Check that notificationId is a valid MongoDB ObjectId
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    notificationsController.markAsRead(req, res, next);
  }
);

// Add a new notification
router.post(
  '/',
  [
    check('userId').custom(isValidObjectId), // Validate userId as MongoDB ObjectId
    check('message').not().isEmpty().withMessage('Message is required'), // Validate that a message is provided
    check('type').not().isEmpty().withMessage('Type is required'), // Validate that a type is provided
    check('timestamp').optional().isISO8601().withMessage('Timestamp must be a valid date'), // Optional but valid timestamp
  ],
  async (req, res, next) => {
    // Validate incoming request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Destructure fields from req.body
    const { userId, message, type, timestamp } = req.body;

    try {
      // Call the addNotification function with extracted fields
      await notificationsController.addNotification(userId, message, type, timestamp);
      
      // Respond with success message
      res.status(201).json({ message: 'Notification added successfully!' });
    } catch (error) {
      // Pass error to the error handling middleware
      next(new HttpError('Failed to add notification', 500));
    }
  }
);


module.exports = router;
