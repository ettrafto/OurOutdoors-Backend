const HttpError = require('../models/http-error');
const Event = require('../models/event');

const getEventsBySportId = async (req, res, next) => {
  const sportId = req.params.sportId;

  let events;
  try {
    events = await Event.find({ sportId: sportId });
  } catch (err) {
    return next(new HttpError('Fetching events failed, please try again later.', 500));
  }

  if (!events || events.length === 0) {
    return next(new HttpError('Could not find events for the provided sport ID.', 404));
  }

  res.json({ events: events.map(event => event.toObject({ getters: true })) });
};

exports.getEventsBySportId = getEventsBySportId;