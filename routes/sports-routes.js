const express = require('express');
const sportsControllers = require('../controllers/sports-controllers'); 

const router = express.Router();

//get all events by sport ID
router.get('/:sportId', sportsControllers.getEventsBySportId);

module.exports = router;