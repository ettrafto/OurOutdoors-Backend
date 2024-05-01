const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const eventsRoutes = require('./routes/events-routes');
const usersRoutes = require('./routes/users-routes');
const sportsRoutes = require('./routes/sports-routes');
const HttpError = require('./models/http-error');

const app = express();

app.use(bodyParser.json());

app.use('/api/events', eventsRoutes); 
app.use('/api/users', usersRoutes);
app.use('/api/sports', sportsRoutes);


app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500)
  res.json({message: error.message || 'An unknown error occurred!'});
});

//returns promise
mongoose.connect('mongodb+srv://ettrafto:mypassword@cluster0.juykqy2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => {
  app.listen(5000);
})
.catch(err => {
  console.log(err)
});
