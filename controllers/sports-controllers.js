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

  // Respond with an empty array if no events are found
  if (!events || events.length === 0) {
    return res.status(200).json({ events: [] });
  }

  res.json({ events: events.map(event => event.toObject({ getters: true })) });
};

exports.getEventsBySportId = getEventsBySportId;
