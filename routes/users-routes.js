const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/users-controllers');

const router = express.Router();

router.get('/', usersController.getUsers);

router.get('/:userId', usersController.getUserById);

router.post(
  '/signup',
  [
    check('name')
      .not()
      .isEmpty(),
    check('email')
      .normalizeEmail()
      .isEmail(),
    check('password').isLength({ min: 6 })
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
