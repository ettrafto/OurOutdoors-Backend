const uuid = require('uuid/v4');
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const User = require('../models/user');
const { addNotification } = require('./notification-controllers')

// Get all users, excluding passwords
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({});
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
      user = await User.findById(userId); // Exclude password for security
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
  console.log("Request body:", req.body); // Log incoming data for debugging

  const { name, email, firebaseUid } = req.body; // Ensure firebaseUid is destructured here

  // Check for existing user
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    console.error("Error checking existing user:", err);
    return next(new HttpError("Signing up failed, please try again later.", 500));
  }

  if (existingUser) {
    return next(new HttpError("User exists already, please login instead.", 422));
  }

  // Create user
  const createdUser = new User({
    name,
    email,
    firebaseUid, // Ensure firebaseUid is included here
    image: "https://default.image.url",
    events: [],
  });

  console.log("Created user object:", createdUser); // Log the user object before saving

  try {
    await createdUser.save();
    console.log("User successfully saved to database.");
  } catch (err) {
    console.error("Error saving user to database:", err);
    return next(new HttpError("Signing up failed, please try again later.", 500));
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
    return res.json({ message: 'No events found for this user.' });
  }

  res.json({ events: userWithEvents.events.map(event => event.toObject({ getters: true })) });
};

// Fetch MongoDB user by Firebase UID
const getUserByFirebaseUid = async (req, res, next) => {
  const { firebaseUid } = req.params;

  let user;
  try {
    user = await User.findOne({ firebaseUid });
  } catch (err) {
    const error = new HttpError('Fetching user failed, please try again later.', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('User not found.', 404);
    return next(error);
  }

  res.json({ user: user.toObject({ getters: true }) });
};

const getFriends = async (req, res, next) => {
  const userId = req.params.userId;

  let userWithFriends;
  try {
    userWithFriends = await User.findById(userId).populate('friends');
  } catch (err) {
    const error = new HttpError('Fetching friends failed, please try again later.', 500);
    return next(error);
  }

  res.json({
    friends: userWithFriends?.friends?.map(friend => friend.toObject({ getters: true })) || [],
  });
};

const getFriendRequests = async (req, res, next) => {
  const userId = req.params.userId;

  let userWithRequests;
  try {
    userWithRequests = await User.findById(userId).populate('friendRequestsReceived');
  } catch (err) {
    const error = new HttpError('Fetching friend requests failed, please try again later.', 500);
    return next(error);
  }

  res.json({
    friendRequests: userWithRequests?.friendRequestsReceived?.map(request => request.toObject({ getters: true })) || [],
  });
};

const getFriendEvents = async (req, res, next) => {
  const { userId } = req.params;
  const { sport } = req.query; // Accept sport as a query parameter

  try {
    const user = await User.findById(userId).populate('friends');
    if (!user) {
      return next(new HttpError('User not found.', 404));
    }

    // If no friends, return an empty array
    if (!user.friends || user.friends.length === 0) {
      return res.status(200).json({ events: [] });
    }

    const friendIds = user.friends.map(friend => friend._id);

    // Filter events based on friends and optional sport
    const query = { userId: { $in: friendIds } };
    if (sport) {
      query.sportId = sport;
    }

    const friendEvents = await Event.find(query);

    res.status(200).json({ events: friendEvents.map(event => event.toObject({ getters: true })) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Fetching friend events failed.', 500));
  }
};


const addFriendByEmail = async (req, res, next) => {
  const { mongoUserId, email } = req.body;

  // Validate input
  if (!mongoUserId || !email) {
    return next(new HttpError('Invalid inputs passed.', 400));
  }

  let user, recipient;
  try {
    // Find the sender (initiating user) by ID
    user = await User.findById(mongoUserId);
    if (!user) {
      return next(new HttpError('User not found.', 404));
    }

    // Find the recipient by email
    recipient = await User.findOne({ email });
    if (!recipient) {
      return next(new HttpError('No user found with that email.', 404));
    }

    // Check if the recipient is already in the user's friends list
    if (user.friends.includes(recipient._id)) {
      return res.status(409).json({ message: 'You are already friends with this user.' });
    }

    // Call sendFriendRequest to handle the logic of sending the request
    req.body.senderId = mongoUserId;
    req.body.recipientId = recipient._id.toString();

    await sendFriendRequest(req, res, next);
  } catch (err) {
    console.error(err);
    return next(new HttpError('Adding friend failed, please try again later.', 500));
  }
};

const sendFriendRequest = async (req, res, next) => {
  const { senderId, recipientId } = req.body;

  console.log('Sender ID:', senderId);
  console.log('Recipient ID:', recipientId);

  let sender, recipient;

  try {
    sender = await User.findById(senderId);
    recipient = await User.findById(recipientId);
    console.log('Sender Object:', sender);
    console.log('Recipient Object:', recipient);
  } catch (err) {
    console.error('Error fetching users:', err);
    const error = new HttpError('Fetching users failed, please try again later.', 500);
    return next(error);
  }

  if (!sender || !recipient) {
    const error = new HttpError('Could not find the users for the provided IDs.', 404);
    return next(error);
  }

  console.log('Sender Requests Sent:', sender.friendRequestsSent);
  console.log('Recipient Requests Received:', recipient.friendRequestsReceived);
  console.log('Sender Friends:', sender.friends);

  if (recipient.friendRequestsReceived.includes(senderId) || sender.friends.includes(recipientId)) {
    const error = new HttpError('Friend request already sent or already friends.', 422);
    return next(error);
  }

  sender.friendRequestsSent.push(recipientId);
  recipient.friendRequestsReceived.push(senderId);

  console.log('Updated Sender:', sender);
  console.log('Updated Recipient:', recipient);

  try {
    console.log('Saving Sender...');
    await sender.save();
    console.log('Sender Saved.');

    console.log('Saving Recipient...');
    await recipient.save();
    console.log('Recipient Saved.');
  } catch (err) {
    console.error('Error during save:', err);
    const error = new HttpError('Sending friend request failed, please try again.', 500);
    return next(error);
  }

  try {
    const message = `You have a new friend request from ${sender.name}`;
    console.log('Creating Notification...');
    console.log(`Notification for: ${recipientId}, Message: ${message}, Link: /users/${senderId}`);
    await addNotification(recipientId, message, `/users/${senderId}`);
  } catch (err) {
    console.error('Notification error:', err);
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



exports.addFriendByEmail = addFriendByEmail;
exports.getFriendEvents = getFriendEvents;
exports.getFriends = getFriends;
exports.getFriendRequests =getFriendRequests;
exports.getUserByFirebaseUid = getUserByFirebaseUid;
exports.editUser = editUser;
exports.getUserById = getUserById;
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.getUserEvents = getUserEvents;
exports.sendFriendRequest = sendFriendRequest;
exports.acceptFriendRequest = acceptFriendRequest;
exports.rejectFriendRequest = rejectFriendRequest;
