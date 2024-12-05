const uuid = require('uuid/v4');
const { validationResult } = require('express-validator');
const { addNotification } = require('./notification-controllers');


const HttpError = require('../models/http-error');
const User = require('../models/user');

// Get all users, excluding passwords
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    const error = new HttpError('Fetching users failed, please try again later.', 500);
    return next(error);
  }
  res.json({ users: users.map(user => user.toObject({ getters: true })) });
};

//get a user
const getUserById = async (req, res, next) => {
  const userId = req.params.userId;

  let user;
  try {
      user = await User.findById(userId, '-password'); // Exclude password for security
  } catch (err) {
      const error = new HttpError('Fetching user failed, please try again later.', 500);
      return next(error);
  }

  if (!user) {
      const error = new HttpError('Could not find a user for the provided user id.', 404);
      return next(error);
  }

  res.json({ user: user.toObject({ getters: true }) }); // Convert to JS object and return it
};


// User signup
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { name, email, password } = req.body; // Removed 'places'

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later.', 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError('User exists already, please login instead.', 422);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: 'https://live.staticflickr.com/7631/26849088292_36fc52ee90_b.jpg',
    password,
    events: [] // Initially empty array for events
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again.', 500);
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

// User login
const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Logging in failed, please try again later.', 500);
    return next(error);
  }

  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError('Invalid credentials, could not log you in.', 401);
    return next(error);
  }

  res.json({ message: 'Logged in!' });
};

const editUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { name, email, password, image, about } = req.body;
  const userId = req.params.userId;

  let user;
  try {
      user = await User.findById(userId);
  } catch (err) {
      const error = new HttpError('Something went wrong, could not find a user.', 500);
      return next(error);
  }

  if (!user) {
      const error = new HttpError('Could not find a user for the provided id.', 404);
      return next(error);
  }


  // Update the user fields if provided in the request body
  user.name = name || user.name;
  user.email = email || user.email;
  user.password = password || user.password;
  user.image = image || user.image;
  user.about = about || user.about;

  try {
      await user.save();
  } catch (err) {
      const error = new HttpError('Something went wrong, could not update the user.', 500);
      return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

// Get all events of a user
const getUserEvents = async (req, res, next) => {
  const userId = req.params.userId;

  let userWithEvents;
  try {
    // Fetch the user and populate the 'events' array
    userWithEvents = await User.findById(userId).populate('events');
  } catch (err) {
    const error = new HttpError('Fetching user events failed, please try again later.', 500);
    return next(error);
  }

  if (!userWithEvents || userWithEvents.events.length === 0) {
    return next(new HttpError('Could not find events for the provided user id.', 404));
  }

  res.json({ events: userWithEvents.events.map(event => event.toObject({ getters: true })) });
};

const sendFriendRequest = async (req, res, next) => {
  const { senderId, recipientId } = req.body;

  let sender, recipient;
  //console.log('Sender ID:', senderId);
  //console.log('Recipient ID:', recipientId);
  try {
    sender = await User.findById(senderId);
    recipient = await User.findById(recipientId);
  } catch (err) {
    const error = new HttpError('Fetching users failed, please try again later.', 500);
    return next(error);
  }

  if (!sender || !recipient) {
    const error = new HttpError('Could not find the users for the provided ids.', 404);
    return next(error);
  }

  // Check if the request has already been sent or they are already friends
  if (recipient.friendRequestsReceived.includes(senderId) || sender.friends.includes(recipientId)) {
    const error = new HttpError('Friend request already sent or already friends.', 422);
    return next(error);
  }

  // Add the friend request
  sender.friendRequestsSent.push(recipientId);
  recipient.friendRequestsReceived.push(senderId);

  try {
    await sender.save();
    await recipient.save();
  } catch (err) {
    const error = new HttpError('Sending friend request failed, please try again.', 500);
    return next(error);
  }

  //creating a notification 
  try {
    const message = `You have a new friend request from ${req.user.username}`;
    await addNotification(targetUserId, message, `/users/${userId}`);
  } catch (err) {
    return next(new HttpError('Failed to send notification.', 500));
  }

  res.status(200).json({ message: 'Friend request sent!' });
};

const acceptFriendRequest = async (req, res, next) => {
  const { userId, senderId } = req.body;

  let user, sender;
  try {
    user = await User.findById(userId);
    sender = await User.findById(senderId);
  } catch (err) {
    const error = new HttpError('Fetching users failed, please try again later.', 500);
    return next(error);
  }

  if (!user || !sender) {
    const error = new HttpError('Could not find the users for the provided ids.', 404);
    return next(error);
  }

  // Check if the friend request exists
  if (!user.friendRequestsReceived.includes(senderId)) {
    const error = new HttpError('No friend request from this user.', 404);
    return next(error);
  }

  // Remove the friend request
  user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== senderId.toString());
  sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== userId.toString());

  // Add to friends list
  user.friends.push(senderId);
  sender.friends.push(userId);

  try {
    await user.save();
    await sender.save();
  } catch (err) {
    const error = new HttpError('Accepting friend request failed, please try again.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Friend request accepted!' });
};

const rejectFriendRequest = async (req, res, next) => {
  const { userId, senderId } = req.body;

  let user, sender;
  try {
    user = await User.findById(userId);
    sender = await User.findById(senderId);
  } catch (err) {
    const error = new HttpError('Fetching users failed, please try again later.', 500);
    return next(error);
  }

  if (!user || !sender) {
    const error = new HttpError('Could not find the users for the provided ids.', 404);
    return next(error);
  }

  // Remove the friend request
  user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== senderId.toString());
  sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== userId.toString());

  try {
    await user.save();
    await sender.save();
  } catch (err) {
    const error = new HttpError('Rejecting friend request failed, please try again.', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Friend request rejected!' });
};

const getFriends = async (req, res, next) => {
  const userId = req.params.userId;

  let userWithFriends;
  try {
    // Fetch the user and populate the 'friends' array
    userWithFriends = await User.findById(userId).populate('friends');
  } catch (err) {
    const error = new HttpError('Fetching friends failed, please try again later.', 500);
    return next(error);
  }

  /*if (!userWithFriends || userWithFriends.friends.length === 0) {
    return next(new HttpError('Could not find friends for the provided user id.', 404));
  }*/

  res.json({
    friends: userWithFriends.friends.map(friend => friend.toObject({ getters: true })),
  });
};

const getFriendRequests = async (req, res, next) => {
  const userId = req.params.userId;

  let userWithRequests;
  try {
    // Fetch the user and populate the 'friendRequestsReceived' array
    userWithRequests = await User.findById(userId).populate('friendRequestsReceived');
  } catch (err) {6
    const error = new HttpError('Fetching friend requests failed, please try again later.', 500);
    return next(error);
  }

  /*if (!userWithRequests || userWithRequests.friendRequestsReceived.length === 0) {
    return next(new HttpError('No friend requests found for the provided user id.', 404));
  }*/

  res.json({
    friendRequests: userWithRequests.friendRequestsReceived.map(request => request.toObject({ getters: true }))
  });
};


exports.editUser = editUser;
exports.getUserById = getUserById;
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.getUserEvents = getUserEvents;
exports.sendFriendRequest = sendFriendRequest;
exports.acceptFriendRequest = acceptFriendRequest;
exports.rejectFriendRequest = rejectFriendRequest;
exports.getFriends = getFriends;
exports.getFriendRequests = getFriendRequests;
