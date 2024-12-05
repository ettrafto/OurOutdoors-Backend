const uuid = require('uuid/v4');
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const User = require('../models/user');

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
exports.getFriends = getFriends;
exports.getFriendRequests =getFriendRequests;
exports.getUserByFirebaseUid = getUserByFirebaseUid;
exports.editUser = editUser;
exports.getUserById = getUserById;
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.getUserEvents = getUserEvents;