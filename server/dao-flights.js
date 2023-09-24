'use strict';

/* Data Access Object (DAO) module for accessing flights data */

const db = require('./db');

// This function returns flights list
exports.listFlights = () => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM flights';
      db.all(sql, [], (err, rows) => {
        if (err) {reject(err); }
        else if (rows.length === 0){
          resolve({ error: 'There are no flights' });}
        else{
            const flights = rows.map((f) => ({ id: f.id, type: f.type, rows: f.rows, seats_per_row: f.seats_per_row }));
            resolve(flights);
        }
      });
    });
  };

// This function returns booking list of a flight
exports.getListBookingByFlightId = (id_plane) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM bookings WHERE plane_id=?';
    db.all(sql, [id_plane], (err, rows) => {
      if (err) {reject(err); }
      else if (rows.length === 0){
        resolve({ error: 'There are no bookings for this flight' });}
      else{
          const bookings = rows.map((b) => ({ seat: b.seat}));
          resolve(bookings);
      }
    });
  });
};

// This function returns bookings of the current logged in user, given a flight
exports.getListBookingByFlightAndUser = (id_user, id_plane) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM bookings WHERE plane_id=? AND user_id = ?';
    db.all(sql, [id_plane, id_user], (err, rows) => {
      if (err) {reject(err); }
      else if (rows.length === 0){
        resolve({ error: 'There are no bookings for this user' });}
      else{
          const bookings = rows.map((b) => ({ seat: b.seat}));
          resolve(bookings);
      }
    });
  });
};

// This function deletes an existing user booking of a given flight
exports.deleteBooking = (user_id, plane_id) => {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM bookings WHERE plane_id=? and user_id=?';
    db.run(sql, [plane_id, user_id], function (err) {
      if (err) {
        reject(err);
      }
      if (this.changes < 1)
        resolve({ error: 'No booking deleted.' });
      else
        resolve(this.changes);
    });
  });
}

/**
 * This function adds new booking in the database.
 */
exports.addBookingSeat = (booking) => {

  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO bookings (plane_id, seat, user_id) VALUES(?, ?, ?)';
    db.run(sql, [booking.plane_id, booking.seat, booking.user_id], function (err) {
      if (err) {
        resolve({error: 1 });
      }
      // Returning 0 if it is all right
      resolve({ error: 0 });
    });
  });
};

// This function retrieves a single entry of the bookings table (if exists)
exports.getBookingEntry = (plane_id, seat) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM bookings WHERE plane_id=? and seat=?';
    db.get(sql, [plane_id, seat], (err, row) => {
      if (err) {
        reject(err);
      }
      if (row == undefined) {
        //resolve({ error: 'Seat not found.' });
        resolve({ error: 0 });
      } else {
        //resolve({ error: 'Seat already booked.' });
        resolve({ error: 1 });
      }
    });
  });
};

// This function checks if the user has bookings for this flight
exports.checkBookingsForUser = (id_user, id_plane) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM bookings WHERE plane_id=? AND user_id = ?';
    db.all(sql, [id_plane, id_user], (err, rows) => {
      if (err) {reject(err); }
      else if (rows.length === 0){
        resolve({ error: 0});
      }
      else{
        resolve({ error: 1});
      }
    });
  });
};