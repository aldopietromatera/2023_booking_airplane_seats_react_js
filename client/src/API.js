const SERVER_URL = 'http://localhost:3001/api/';

/**
 * A utility function for parsing the HTTP response.
 */
function getJson(httpResponsePromise) {
    // server API always return JSON, in case of error the format is the following { error: <message> } 
    return new Promise((resolve, reject) => {
        httpResponsePromise
            .then((response) => {
                if (response.ok) {
                    // the server always returns a JSON, even empty {}. Never null or non json, otherwise the method will fail
                    response.json()
                        .then(json => {
                            if (json.error) {
                                reject(json);
                            }
                            resolve(json);
                        })
                        .catch(err => reject({ error: "Cannot parse server response" }))

                } else {
                    // analyzing the cause of error
                    response.json()
                        .then(obj =>
                            reject(obj)
                        ) // error msg in the response body
                        .catch(err => reject({ error: "Cannot parse server response" })) // something else
                }
            })
            .catch(err =>
                reject({ error: "Cannot communicate" })
            ) // connection error
    });
}

/**
 * Getting from the server side and returning the list of flights.
 */
const getFlights = async () => {
    return getJson(fetch(SERVER_URL + 'flights'))
        .then(json => {
            return json.map((flight) => {
                const clientFlight = {
                    id: flight.id,
                    type: flight.type,
                    rows: flight.rows,
                    seats_per_row: flight.seats_per_row
                }
                return clientFlight;
            })
        })
}

/**
* Getting from the server side and returning the list of bookings for a given flight.
*/
const getBookingsByFlightId = async (plane_id) => {
    return getJson(fetch(SERVER_URL + 'flights/' + plane_id + '/bookings'))
        .then(json => {
            return json.map((booking) => {

                const clientBooking = {
                    seat: booking.seat,
                }

                return clientBooking;
            })
        })
}

/**
* Getting from the server side and returning the list of bookings for a given flight and the current user.
*/
const getBookingsByFlightAndUser = async (plane_id) => {
    return getJson(fetch(SERVER_URL + 'flights/' + plane_id + '/user-booking', {
        credentials: 'include'
    }))
        .then(json => {
            return json.map((booking) => {
                const clientBooking = {
                    seat: booking.seat,
                }
                return clientBooking;
            })
        })
}

/**
* This function deletes a film from the back-end library.
*/
function deleteBooking(plane_id) {
    return getJson(
        fetch(SERVER_URL + "flights/" + plane_id + "/user-booking", {
            method: 'DELETE',
            credentials: 'include'
        })
    )
}

/**
 * This funciton adds a new booking(s) in the back-end.
 */
function addBooking(plane_id, vecOfBookings) {
    return getJson(
        fetch(SERVER_URL + "flights/" + plane_id + "/user-booking", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(vecOfBookings)
        })
    )
}


/**
 * This function wants username and password inside a "credentials" object.
 * It executes the log-in.
 */
const logIn = async (credentials) => {
    return getJson(fetch(SERVER_URL + 'sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',  // this parameter specifies that authentication cookie must be forwared
        body: JSON.stringify(credentials),
    })
    )
};

/**
 * This function is used to verify if the user is still logged-in.
 * It returns a JSON object with the user info.
 */
const getUserInfo = async () => {
    return getJson(fetch(SERVER_URL + 'sessions/current', {
        // this parameter specifies that authentication cookie must be forwared
        credentials: 'include'
    })
    )
};

/**
 * This function destroy the current user's session and execute the log-out.
 */
const logOut = async () => {
    return getJson(fetch(SERVER_URL + 'sessions/current', {
        method: 'DELETE',
        credentials: 'include'  // this parameter specifies that authentication cookie must be forwared
    })
    )
}

const API = { logIn, getUserInfo, logOut, getFlights, getBookingsByFlightId, getBookingsByFlightAndUser, deleteBooking, addBooking };
export default API;