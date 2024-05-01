const uuid = require('uuid/v4');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Event = require('../models/event');
const User = require('../models/user');

// Retrieve a single event by ID
const getEventById = async (req, res, next) => {
  const eventId = req.params.eventId;

  let event;
  try {
    event = await Event.findById(eventId);
  } catch (err) {
    const error = new HttpError('Something went wrong, could not find an event.', 500);
    return next(error);
  }

  if (!event) {
    const error = new HttpError('Could not find an event for the provided id.', 404);
    return next(error);
  }

  res.json({ event: event.toObject({ getters: true }) });
};

// Retrieve all events for the feed
const getFeed = async (req, res, next) => {
  let events;
  try {
    events = await Event.find({});
  } catch (err) {
    const error = new HttpError('Fetching events failed, please try again later.', 500);
    return next(error);
  }

  res.json({ events: events.map(event => event.toObject({ getters: true })) });
};

// Create a new event and link it to the user
const createEvent = async (req, res, next) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { sportId, userId, title, description, skill, datetime, location, participants, comments, likes } = req.body;

  // Convert participants and likes from strings to ObjectIds
  const participantsIds = participants.map(id => new mongoose.Types.ObjectId(id));
  const likesIds = likes.map(id => new mongoose.Types.ObjectId(id));

  const createdEvent = new Event({
      sportId,
      userId,
      title,
      description,
      skill,
      datetime,
      location,
      participants: participantsIds,
      comments,
      likes: likesIds
  });

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError('Finding user failed, please try again.', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdEvent.save({ session: sess });
    user.events.push(createdEvent);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError('Creating event failed, please try again.', 500);
    return next(error);
  }

  res.status(201).json({ event: createdEvent });
};

// Update an existing event
const updateEvent = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { title, description, datetime, location, participants, comments, likes } = req.body;
  const eventId = req.params.eventId;

  let event;
  try {
    event = await Event.findById(eventId);
    event.title = title;
    event.description = description;
    event.datetime = datetime;
    event.location = location;
    event.participants = participants;
    event.comments = comments;
    event.likes = likes;

    await event.save();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not update event.', 500);
    return next(error);
  }

  res.status(200).json({ event: event.toObject({ getters: true }) });
};

// Delete an event and update user relations
const deleteEvent = async (req, res, next) => {
  const eventId = req.params.eventId;

  let event;
  try {
    event = await Event.findById(eventId).populate('userId');
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete event.', 500);
    return next(error);
  }

  if (!event) {
    const error = new HttpError('Could not find event for this id.', 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await event.remove({ session: sess });
    event.userId.events.pull(event);
    await event.userId.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete event.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Deleted event.' });
};

const joinEvent = async (req, res, next) => {
  const eventId = req.params.eventId;
  const userId = new mongoose.Types.ObjectId(req.body.userId); // Convert to ObjectId

  try {
      const event = await Event.findById(eventId);

      if (!event) {
          throw new HttpError('Event not found', 404);
      }

      // Check if user is already a participant
      if (event.participants.includes(userId)) {
          throw new HttpError('User already joined the event', 422);
      }

      event.participants.push(userId);
      await event.save();

      res.status(200).json({ message: 'User joined the event successfully.' });
  } catch (err) {
      next(err);
  }
};


const leaveEvent = async (req, res, next) => {
  const eventId = req.params.eventId;
  const userId = req.body.userId; 

  try {
      const event = await Event.findById(eventId);

      if (!event) {
          throw new HttpError('Event not found', 404);
      }

      // Check if user is a participant
      if (!event.participants.includes(userId)) {
          throw new HttpError('User not part of the event', 422);
      }

      event.participants.pull(userId);  // remove from array
      await event.save();

      res.status(200).json({ message: 'User left the event successfully.' });
  } catch (err) {
      next(err);
  }
};


// Post a Comment
const postComment = async (req, res, next) => {
  const eventId = req.params.eventId;
  const { userId, text } = req.body; 

  let event;
  try {
    event = await Event.findById(eventId);
  } catch (err) {
    return next(new HttpError('Finding event failed, please try again later.', 500));
  }

  if (!event) {
    return next(new HttpError('Event not found.', 404));
  }

  // Add comment to event
  const comment = { userId, text };
  event.comments.push(comment);

  try {
    await event.save();
    res.status(201).json({ event: event.toObject({ getters: true }) });
  } catch (err) {
    return next(new HttpError('Posting comment failed, please try again.', 500));
  }
};

// Get Comments
const getComments = async (req, res, next) => {
  const eventId = req.params.eventId;

  let event;
  try {
    event = await Event.findById(eventId);
  } catch (err) {
    return next(new HttpError('Fetching event failed, please try again later.', 500));
  }

  if (!event) {
    return next(new HttpError('Event not found.', 404));
  }

  res.json({ comments: event.comments });
};

// Toggle Like
const toggleLikeEvent = async (req, res, next) => {
  const eventId = req.params.eventId;
  const userId = req.body.userId;

  let event;
  try {
    event = await Event.findById(eventId);
  } catch (err) {
    return next(new HttpError('Finding event failed, please try again later.', 500));
  }

  if (!event) {
    return next(new HttpError('Event not found.', 404));
  }

  const index = event.likes.indexOf(userId);
  if (index === -1) {
    event.likes.push(userId);
  } else {
    event.likes.splice(index, 1); // Toggle like
  }

  try {
    await event.save();
    res.status(200).json({ likes: event.likes.length, event: event.toObject({ getters: true }) });
  } catch (err) {
    return next(new HttpError('Updating likes failed, please try again.', 500));
  }
};



exports.getEventById = getEventById;
exports.getFeed = getFeed;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.joinEvent = joinEvent;
exports.leaveEvent = leaveEvent;
exports.postComment = postComment;
exports.getComments = getComments;
exports.toggleLikeEvent = toggleLikeEvent;