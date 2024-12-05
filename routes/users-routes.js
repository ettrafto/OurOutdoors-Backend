const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/users-controllers');

const router = express.Router();


router.get('/events/:userId', usersController.getUserEvents);

router.get('/:userId', usersController.getUserById);

router.get('/', usersController.getUsers);

router.get('/getByFirebaseUid/:firebaseUid', usersController.getUserByFirebaseUid);

router.get('/events/:userId', usersController.getUserEvents); // Fetch user events

router.get('/:userId/friends', usersController.getFriends); // Fetch user friends

router.get('/:userId/friend-requests', usersController.getFriendRequests); // Fetch friend requests


router.post(
  '/signup',
  [
    check('name')
      .not()
      .isEmpty(),
    check('email')
      .normalizeEmail()
      .isEmail()
  ],
  usersController.signup
);

router.post('/login', usersController.login);

router.patch(
  '/edit/:userId',
  [
      check('name').optional().not().isEmpty(),
      check('email').optional().normalizeEmail().isEmail(),
      check('password').optional().isLength({ min: 6 }),
      check('image').optional().isURL(),
      check('about').optional()
  ],
  usersController.editUser
);


module.exports = router;
