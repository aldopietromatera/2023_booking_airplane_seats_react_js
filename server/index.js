'use strict';

/*** Importing modules ***/
const express = require('express');
const morgan = require('morgan');                                  // logging middleware
const cors = require('cors');

const { check, validationResult, body, } = require('express-validator'); // validation middleware

const userDao = require('./dao-users'); // module for accessing the users table in the DB
const flightDao = require('./dao-flights'); // module for accessing the flights table in the DB

// init express
const app = new express();
app.use(morgan('dev'));
app.use(express.json());
const port = 3001;

/** Set up and enable Cross-Origin Resource Sharing (CORS) **/
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

/*** Passport ***/

/** Authentication-related imports **/
const passport = require('passport');                              // authentication middleware
const LocalStrategy = require('passport-local');                   // authentication strategy (username and password)

/** Set up authentication strategy to search in the DB a user with a matching password.
 * The user object will contain other information extracted by the method userDao.getUser (i.e., id, username, name).
 **/
passport.use(new LocalStrategy(async function verify(username, password, callback) {
  const user = await userDao.getUser(username, password)
  if (!user)
    return callback(null, false, 'Incorrect username or password');

  return callback(null, user); // NOTE: user info in the session (all fields returned by userDao.getUser, i.e, id, username, name)
}));

// Serializing in the session the user object given from LocalStrategy(verify).
passport.serializeUser(function (user, callback) { // this user is id + username + name 
  callback(null, user);
});

// Starting from the data in the session, we extract the current (logged-in) user.
passport.deserializeUser(function (user, callback) { // this user is id + email + name 
  // if needed, we can do extra check here (e.g., double check that the user is still in the database, etc.)
  // e.g.: return userDao.getUserById(id).then(user => callback(null, user)).catch(err => callback(err, null));

  return callback(null, user); // this will be available in req.user
});

/** Creating the session */
const session = require('express-session');

app.use(session({
  secret: "shhhhh... it's a secret!",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));


/** Defining authentication verification middleware **/
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Not authorized' });
}

/*** Utility Functions ***/

// This function is used to format express-validator errors as strings
const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
  return `${location}[${param}]: ${msg}`;
};

/*** Flights APIs ***/

// 1. Retrieve the list of all the available flights.
// GET /api/flights
// This route returns the list of flights.
app.get('/api/flights',
  (req, res) => {
    flightDao.listFlights()
      .then(flights => res.json(flights))
      .catch((err) => res.status(500).json(err)); // always return a json and an error message
  }
);

// 2. Retrieve bookings, given the plane “id”.
// GET /api/flights/<id>
// Given a plane id, this route returns the associated bookings.
app.get('/api/flights/:id/bookings',
  [check('id').isInt({ min: 1 })],    // check: is the id a positive integer?
  async (req, res) => {

    const errors = validationResult(req).formatWith(errorFormatter); // format error message
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
    }

    try {
      const result = await flightDao.getListBookingByFlightId(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).end();
    }
  }
);

// 3. Retrieve bookings, given the plane “id”, for the current logged in user
// GET /api/flights/<id>
// Given a plane id, this route returns the associated bookings for the current user.
app.get('/api/flights/:id/user-booking',
  isLoggedIn,
  [check('id').isInt({ min: 1 })],    // check: is the id a positive integer?
  async (req, res) => {

    const errors = validationResult(req).formatWith(errorFormatter); // format error message
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
    }

    try {
      const result = await flightDao.getListBookingByFlightAndUser(req.user.id, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).end();
    }
  }
);

// 4. Delete an existing user booking, given the flight id
// DELETE /api/flights/<id>/user-booking
// Given a plane id, this route deletes the associated bookings of the logged user.
app.delete('/api/flights/:id/user-booking',
  isLoggedIn,
  [check('id').isInt({ min: 1 })],
  async (req, res) => {

    const errors = validationResult(req).formatWith(errorFormatter); // format error message
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
    }

    try {
      const result = await flightDao.deleteBooking(req.user.id, req.params.id);
      if (result > 0)
        return res.status(200).json(result);
      else
        return res.status(404).json(result);
    } catch (err) {
      res.status(503).json({ error: `Database error during the deletion of booking: ${err} ` });
    }
  }
);

// 5. Create a new booking, by providing all relevant information.
// POST /api/flights/<id>/user-booking
app.post('/api/flights/:id/user-booking',
  isLoggedIn,
  [
    check('id').isInt({ min: 1 }),

    body().isArray({ min: 1 }),
    body('*.seat', 'seat field must a be a String').exists().isString()
  ],
  async (req, res) => {
    //Is there any validation error?
    const errors = validationResult(req).formatWith(errorFormatter); // format error message
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
    }

    try {
      const result = await flightDao.checkBookingsForUser(req.user.id, req.params.id); // NOTE: checkBookingForUser returns error 0 if it is all right
      //res.json(result); //it send an HTTP responde with the result
      if (result.error != 0) {
        return res.status(403).json({ error: `User has already bookings` });
      }
    } catch (err) {
      return res.status(503).json({ error: `Database error during check: ${err}` });
    }

    const vecOfBookings = req.body;
    const rejectedBookings = [];

    for (let b of vecOfBookings) {

      const booking = {
        plane_id: req.params.id,
        seat: b.seat,
        user_id: req.user.id
      };

      try {
        const result1 = await flightDao.getBookingEntry(booking.plane_id, booking.seat); // NOTE: getBookingEntry returns error 0 if the seat is not booked
        if (result1.error != 0) {
          rejectedBookings.push(booking);
        }
      } catch (err) {
        return res.status(503).json({ error: `Database error during the creation of new booking: ${err}` });
      }
    }

    if (rejectedBookings.length != 0) {
      return res.status(403).json(rejectedBookings);
    }
    else {

      let flag = 0;

      for (let b of vecOfBookings) {

        const booking = {
          plane_id: req.params.id,
          seat: b.seat,
          user_id: req.user.id
        };

        try {
          const result2 = await flightDao.addBookingSeat(booking); // NOTE: addBookingSeat returns error 0 if it is all right
          if (result2.error != 0) {
            flag = 1;
          }
        } catch (err) {
          return res.status(503).json({ error: `Database error during the creation of new booking: ${err}` });
        }
      }

      if (!flag) {
        res.status(200).json([]);  //booked successfully
      }
      else {

        //In case of some errors during the insertion of a booking, you must delete all the bookings of the current user

        try {
          const result = await flightDao.deleteBooking(req.user.id, req.params.id);
          return res.status(503).json({ error: `Error during insertion of a seat in the bookings table` });
        } catch (err) {
          return res.status(503).json({ error: `Database error during the deletion of booking: ${err} ` });
        }
      }
    }
  }
);

/*** Users APIs ***/

// POST /api/sessions 
// This route is used for performing login.
app.post('/api/sessions', function (req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err)
      return next(err);
    if (!user) {
      // display wrong login messages
      return res.status(401).json({ error: info });
    }
    // success, perform the login and extablish a login session
    req.login(user, (err) => {
      if (err)
        return next(err);

      // req.user contains the authenticated user, we send all the user info back
      // this is coming from userDao.getUser() in LocalStratecy Verify Fn
      return res.json(req.user);
    });
  })(req, res, next);
});

// GET /api/sessions/current
// This route checks whether the user is logged in or not.
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json(req.user);
  }
  else
    res.status(401).json({ error: 'Not authenticated' });
});

// DELETE /api/sessions/current
// This route is used for loggin out the current user.
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});


// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
