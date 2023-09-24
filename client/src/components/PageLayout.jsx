import { React, useState, useEffect, useContext } from 'react';
import { Row, Col, Button, Card, Form, Table, Tab } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { LoginForm } from './Auth';

import MessageContext from '../messageCtx';
import SuccMessageContext from '../succMessageCtx';
import API from '../API';


function DefaultLayout(props) {

  const { flightList, loggedIn } = props;

  return (
    <>
      <h2>Discover our flights</h2>
      {
        flightList.length != 0 ?
          flightList.map((flight) => <FlightCard key={flight.id} flight={flight} loggedIn={loggedIn} />)
          :
          <h2>No flights available</h2>
      }
    </>
  );
}

function FlightCard(props) {

  const { flight, loggedIn } = props;

  return (
    <Col md={3} className='mx-3 mt-3 p-2'>
      <Card style={{ width: '15rem' }} className=" mx-auto">
        <i className="bi bi-airplane-fill icon-size"></i>
        <Card.Body className='text-center'>
          <Card.Title>{flight.type.toUpperCase()}</Card.Title>
          <Card.Text>
            {"Airbus with " + flight.rows + " rows of " + flight.seats_per_row + " seats each for a total of " + flight.seats_per_row * flight.rows + " seats."}
          </Card.Text>
          <Link to={"/seats/" + flight.id}>
            <Button variant="dark">{loggedIn ? "Book" : "Explore"}</Button>
          </Link>
        </Card.Body>
      </Card>
    </Col>
  );
}

function PlaneView(props) {

  /* General HOOKS */

  const { plane_id } = useParams();
  const { handleErrors } = useContext(MessageContext);
  const { handleSuccess } = useContext(SuccMessageContext);

  const { loggedIn, flightList } = props;

  const listOfOneFlight = flightList.filter((f) => f.id == plane_id);
  const flight = listOfOneFlight[0];
  const total_seats = flight.rows * flight.seats_per_row;

  //status for all the seats
  const [seatsStatus, setSeatsStatus] = useState(new Array(total_seats).fill(0));

  const [numWish, setNumWish] = useState(0);
  const [requested, setRequested] = useState([]);

  //booking for the current user
  const [userBookings, setUserBookings] = useState([]);
  const [flightBookings, setFlightBookings] = useState([]);

  //used as a flag and setted after some operations
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(true);

  /* USE EFFECT */
  //used to retrieve booked seats and to perform some other operations
  useEffect(() => {

    const checkBookings = async () => {
      try {

        setSeatsStatus(new Array(total_seats).fill(0));

        //getting bookings
        let listOfBookings = await API.getBookingsByFlightId(flight.id);
        setFlightBookings(listOfBookings);
        setRequested([]);

        listOfBookings = listOfBookings.map((b) => {
          return fromCodeToIndex(b.seat, flight.seats_per_row);
        })
        for (let i of listOfBookings) {
          //update status to booked
          updateSeatStatus(i, 1);
        }

      } catch (err) {
        //flight is simply with no bookings
        setFlightBookings([]);
        setRequested([]);
      }

      try {
        if (loggedIn) {
          let listOfUserBookings = await API.getBookingsByFlightAndUser(flight.id);
          setUserBookings(listOfUserBookings);

          listOfUserBookings = listOfUserBookings.map((b) => {
            return fromCodeToIndex(b.seat, flight.seats_per_row);
          })
          for (let i of listOfUserBookings) {
            //update status to booked
            updateSeatStatus(i, 3);
          }
        }
      } catch (err) {
        //current user has no bookings for this flight
      }
    };

    if (dirty) {
      checkBookings();
      setDirty(false)
    }

  }, [dirty]);

  /*function that given an index and a status modify the status in that position*/
  const updateSeatStatus = (index, status) => {

    setSeatsStatus((prev) => {
      const list = prev.map((x, i) => {
        if (i == index) {
          return status;
        }
        else {
          return x;
        }
      });

      return list;
    });


    if (status == 2) {
      setRequested(old => [...old, fromIndexToCode(index, flight.seats_per_row)])
    }
    else if (status == 0) {
      setRequested(old => {
        return old.filter((seat) => fromCodeToIndex(seat, flight.seats_per_row) != index)
      });
    }
  };

  /*delete booking*/
  const deleteBooking = (plane_id) => {
    API.deleteBooking(plane_id)
      .then(() => {
        setDirty(true);
        setUserBookings([]);
        handleSuccess("Deleted successfully!");
      })
      .catch((e) => {
        handleErrors(e);
      });
  }

  //used to select automatically number seats
  const handleAutoChoice = (number) => {
    if (isNaN(number) || number === undefined || number === '') number = 0;
    for (const [idx, val] of seatsStatus.entries()) {
      if (number === 0) {
        setNumWish(0);
        break;
      }
      if (val === 0) {
        updateSeatStatus(idx, 2);
        number = number - 1;
      }
    }
  };

  //used to cancel the selection
  const handleCancel = () => {
    //setRequested([])
    setDirty(true);
  };

  const handleTimeout = () => {
    setDirty(true);
    setConflict(false);
  }

  //used to cancel the selection
  const handleBook = async () => {
    let mapped = requested.map((code) => { return { seat: code }; });

    API.addBooking(plane_id, mapped)
      .then((res) => {

        handleSuccess("Booked successfully!");
        setDirty(true);
      })
      .catch((e) => {
        if (e.error) {
          handleErrors(e);
        }
        else {
          setConflict(true);

          for (let r of requested) {
            const idx = fromCodeToIndex(r, flight.seats_per_row);
            updateSeatStatus(idx, 0);
          }

          for (let b of e) {
            const idx = fromCodeToIndex(b.seat, flight.seats_per_row);
            updateSeatStatus(idx, -1);
          }

          setTimeout(handleTimeout, 5000);
          handleErrors({ error: "Sorry, some of the selected seats have been already booked! Please, retry in a few moments." });
        }
      });

  };

  const handleRefresh = () => {
    setDirty(true);

    handleSuccess("View refreshed");
  }

  return (
    <>
      <Col md={4} className='mx-auto pt-5'>
        <h2>{flight.type.toUpperCase()}</h2>
        <SeatDispostion flight={flight} seatsStatus={seatsStatus} updateSeatStatus={updateSeatStatus} loggedIn={loggedIn}
          userBookings={userBookings} conflict={conflict} />
      </Col>
      <Col md={6} className='mx-auto pt-5'>
        <h3>Flight Information</h3>
        <Table className=''>
          <tbody>
            <tr>
              <th>
                Total seats
              </th>
              <th>
                Booked
              </th>
              <th>
                Vacant
              </th>
              {
                loggedIn ?
                  <th>
                    Requested
                  </th>
                  :
                  <></>
              }
            </tr>
            <tr>
              <td>
                {flight.rows * flight.seats_per_row}
              </td>
              <td>
                {flightBookings.length}
              </td>
              <td>
                {total_seats - flightBookings.length - requested.length}
              </td>
              {
                loggedIn ?
                  <td>
                    {requested.length}
                  </td>
                  :
                  <></>
              }
            </tr>
          </tbody>
        </Table>

        {
          loggedIn ?
            <LoggedInfo userBookings={userBookings} deleteBooking={deleteBooking} requested={requested} flightBookings={flightBookings}
              numWish={numWish} setNumWish={setNumWish} handleAutoChoice={handleAutoChoice} total_seats={total_seats}
              handleCancel={handleCancel} handleBook={handleBook} handleRefresh={handleRefresh} conflict={conflict} />
            :
            <Col md={6} className='mx-auto pt-5'>
              <Card>
                <i className="bi bi-box-arrow-in-right icon-size"></i>
                <Card.Body>
                  <Card.Title>{"Login to book seats for this flight !"}</Card.Title>
                </Card.Body>
              </Card>
            </Col>
        }
      </Col>
    </>
  );
}

function LoggedInfo(props) {

  const { userBookings, deleteBooking, requested, numWish, setNumWish,
    handleAutoChoice, handleCancel, handleBook, handleRefresh, conflict, total_seats, flightBookings } = props;

  return (
    userBookings.length > 0 ? <Book userBookings={userBookings} deleteBooking={deleteBooking} handleRefresh={handleRefresh} /> :
      <WhileBooking requested={requested} numWish={numWish} setNumWish={setNumWish}
        handleAutoChoice={handleAutoChoice} handleCancel={handleCancel} handleBook={handleBook}
        handleRefresh={handleRefresh} conflict={conflict} total_seats={total_seats} flightBookings={flightBookings} />
  );
}

function Book(props) {
  const { plane_id } = useParams();
  const { userBookings, deleteBooking, handleRefresh } = props;
  let str = '';

  for (let b of userBookings) {
    str += b.seat;
    str += " ";
  }

  return (
    <Col md={6} className='mx-auto pt-1'>
      <Button variant="dark" className='mt-4' onClick={handleRefresh}>Refresh view</Button>
      <Card className='mt-3'>
        <i className="bi bi-check2-square icon-size"></i>
        <Card.Body>
          <Card.Title>{"Your current booking"}</Card.Title>
          <Card.Text>
            {"You already booked the following " + userBookings.length + " seat(s): "}
          </Card.Text>
          <Card.Text>
            {str}
          </Card.Text>
          <Button variant="dark" onClick={() => deleteBooking(plane_id)}>Delete booking</Button>
        </Card.Body>
      </Card>
    </Col>
  );


}

function WhileBooking(props) {

  const { total_seats, flightBookings, requested, numWish, setNumWish, handleAutoChoice, handleCancel,
    handleBook, handleRefresh, conflict } = props;

  let str = '';
  for (let s of requested) {
    str += s;
    str += " "
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleAutoChoice(numWish);
  }

  return (
    <>
      {
        requested.length > 0 ?

          <Col md={6} className='mx-auto pt-5'>
            <Card>
              <i className="bi bi-plus-lg icon-size"></i>
              <Card.Body className='text-center'>
                <Card.Title>{"Your selection"}</Card.Title>
                <Card.Text>
                  {"You are going to book the following seat(s): "}
                </Card.Text>
                <Card.Text>
                  {str}
                </Card.Text>
                <Button variant="dark" className='m-1' onClick={handleBook}> Book now </Button>
                <Button variant="dark" onClick={handleCancel}>Cancel</Button>
              </Card.Body>
            </Card>
          </Col>
          :
          <Col md={6} className='mx-auto pt-1'>
            <Button variant="dark" className='pt-1' onClick={handleRefresh} disabled={conflict}>Refresh view</Button>
            <Card className='mt-3'>
              <i className="bi bi-plus-lg icon-size"></i>
              <Card.Body className='text-center'>
                <h6>Click on a free seat and try to reserve it </h6>
                <h6 className='pt-1'>OR</h6>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-2">
                    <Form.Label htmlFor="insertScore">
                      choose a number of seats you want to request
                    </Form.Label>
                    <Form.Control type="number" id="insertScore" placeholder="0" min={0} max={total_seats - flightBookings.length - requested.length} value={numWish}
                      disabled={conflict || total_seats == flightBookings.length}
                      onChange={(event) => isNaN(parseInt(event.target.value)) ? setNumWish('') : setNumWish(parseInt(event.target.value))} />
                    <Button type='submit' variant='dark' className='mt-2' disabled={conflict || total_seats == flightBookings.length}> Request </Button>
                  </Form.Group>
                </Form>
              </Card.Body>
            </Card>
          </Col>
      }
    </>


  );
}

function SeatDispostion(props) {

  const { flight, seatsStatus, updateSeatStatus, loggedIn, userBookings, conflict } = props;
  const values_rows = arrayRange(1, flight.rows, 1);


  if (flight === undefined)
    return <p> There are no seats for the selected flight</p>
  else
    return (
      <Table>
        <tbody>
          {
            values_rows.map((val, index) => {
              return <SeatRow key={index} seatsPerRow={flight.seats_per_row} r={val}
                seatsStatus={seatsStatus} updateSeatStatus={updateSeatStatus}
                loggedIn={loggedIn} userBookings={userBookings} conflict={conflict} />
            }
            )
          }
        </tbody>
      </Table>
    );
}

function SeatRow(props) {

  const { r, seatsPerRow, updateSeatStatus, seatsStatus, loggedIn, userBookings, conflict } = props;
  const values_seats = arrayRange(0, seatsPerRow - 1, 1);


  return (
    <tr className='mx-auto'>
      {
        values_seats.map((val_seat, idx) => {
          val_seat = 'A'.charCodeAt(0) + val_seat;
          let str = r.toString() + String.fromCharCode(val_seat);
          const index = fromCodeToIndex(str, seatsPerRow);
          return (
            <td key={idx}>
              <Seat key={index} code={str} index={index} seatStatus={seatsStatus[index]}
                updateSeatStatus={updateSeatStatus} loggedIn={loggedIn}
                userBookings={userBookings} conflict={conflict} />
            </td>);
        })
      }
    </tr>
  );
}

function Seat(props) {
  const { code, seatStatus, updateSeatStatus, index, loggedIn, userBookings, conflict } = props;

  let color = 'primary';
  let disabled = loggedIn && seatStatus != 1 && userBookings.length == 0 && !conflict ? false : true;

  switch (seatStatus) {
    case 0: //free
      color = "dark";
      break;
    case 1: //booked by others
      color = "danger";
      break;
    case 2: //requested
      color = "warning";
      break;
    case 3: //booked by the current user
      color = "success";
      break;
    default: //conflict
      color = "info";
  }

  const nextStatus = seatStatus == 0 ? 2 : 0;

  return (
    <Button className="p-auto" variant={color} disabled={disabled} onClick={() => updateSeatStatus(index, nextStatus)}>
      {code}
    </Button>
  );
}

function NotFoundLayout() {
  return (
    <>
      <h2>This is not the route you are looking for!</h2>
      <Link to="/">
        <Button variant="dark">Go Home!</Button>
      </Link>
    </>
  );
}

/**
 * This layout shuld be rendered while we are waiting a response from the server.
 */
function LoadingLayout(props) {
  return (
    <Row className="vh-100">
      <Col md={12} className="below-nav">
        <h3>loading ...</h3>
        <h6>In the case you started the client first and then the server, please refresh the page.</h6>
      </Col>
    </Row>
  );
}

function LoginLayout(props) {
  return (
    <Row className="vw-100">
      <Col md={12} className="below-nav">
        <LoginForm login={props.login} />
      </Col>
    </Row>
  );
}

/* Utilities */
function fromCodeToIndex(code, cols) {
  // Extract the row and column values from the code
  let row = parseInt(code.slice(0, -1)) - 1;
  let col = code.charCodeAt(code.length - 1) - 65;

  // Calculate the corresponding index based on the row, column, and number of columns
  return parseInt(row * cols + col);
}

function fromIndexToCode(index, cols) {
  let row = Math.floor(parseInt(index) / parseInt(cols));
  let col = index % cols;
  let res = (row + 1) + String.fromCharCode(col + 65);
  return res;
}

/*Method to generate a range */
const arrayRange = (start, stop, step) =>
  Array.from(
    { length: (stop - start) / step + 1 },
    (value, index) => start + index * step
  );

export { NotFoundLayout, LoadingLayout, LoginLayout, DefaultLayout, PlaneView }; 
