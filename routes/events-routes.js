const express = require('express');
const { check } = require('express-validator');

const eventsControllers = require('../controllers/events-controllers');

const router = express.Router();

// Fetching all events in the feed
router.get('/', eventsControllers.getFeed);

// View a single event by eventId
router.get('/:eventId', eventsControllers.getEventById);

//new event
router.post(
  '/',
  [
    check('title', 'Title is required and cannot be empty.').not().isEmpty(),
    check('description', 'Description must be at least 5 characters long.').isLength({ min: 5 }),
    check('datetime', 'Datetime must be provided and cannot be empty.').not().isEmpty(),
    check('location', 'Location must be provided and cannot be empty.').not().isEmpty(),
    check('sportId', 'Sport ID must be provided and cannot be empty.').not().isEmpty(),
    check('userId', 'User ID must be provided and cannot be empty.').not().isEmpty()
  ],
  eventsControllers.createEvent
);

// Update an existing event
router.patch(
  '/:eventId',
  [
    check('title', 'Title is required and cannot be empty.').not().isEmpty(),
    check('description', 'Description must be at least 5 characters long.').isLength({ min: 5 }),
    check('datetime', 'Datetime must be provided and cannot be empty.').not().isEmpty(),
    check('location', 'Location must be provided and cannot be empty.').not().isEmpty()
  ],
  eventsControllers.updateEvent
);

// Delete an event
router.delete('/:eventId', eventsControllers.deleteEvent);

// Post a comment to an event
router.post(
  '/:eventId/comments',
  [
    check('comment', 'Comment must not be empty.').not().isEmpty(),
    check('userId', 'User ID must be provided.').not().isEmpty()
  ],
  eventsControllers.postComment
);

router.patch('/:eventId/join', eventsControllers.joinEvent);
router.patch('/:eventId/leave', eventsControllers.leaveEvent);

// Get comments for an event
router.get('/:eventId/comments', eventsControllers.getComments);

// Like an event
router.patch('/:eventId/like', eventsControllers.toggleLikeEvent);

module.exports = router;