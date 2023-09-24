import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './App.css'

import { useState, useEffect } from 'react'
import { Container, Toast, Row, Col } from 'react-bootstrap/'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import { Navigation } from './components/Navigation';
import { NotFoundLayout, LoginLayout, LoadingLayout, DefaultLayout, PlaneView } from './components/PageLayout';

import MessageContext from './messageCtx';
import SuccMessageContext from './succMessageCtx';
import API from './API';

function App() {

  // This state keeps track if the user is currently logged-in.
  const [loggedIn, setLoggedIn] = useState(false);
  // This state contains the user's info.
  const [user, setUser] = useState(null);

  const [message, setMessage] = useState('');
  const [succMessage, setSuccMessage] = useState('');


  const [loading, setLoading] = useState(true);

  const [flights, setFlights] = useState([]);

  // If an error occurs, the error message will be shown in a toast.
  const handleErrors = (err) => {
    let msg = '';
    if (err.error) msg = err.error;
    else if (String(err) === "string") msg = String(err);
    else msg = "Unknown Error";
    setMessage(msg); // WARN: a more complex application requires a queue of messages. In this example only last error is shown.
  }

  const handleSuccess = (msg) => {
    if (msg == undefined) {
      msg = '';
    }

    setSuccMessage(msg);
  }

  /*Auth and retrieve flights*/
  useEffect(() => {

    const firstCheck = async () => {
      try {

        //getting flights
        const listflights = await API.getFlights();
        setFlights(listflights);
        setLoading(false);

        // here you have the user info, if already logged in
        const user = await API.getUserInfo();
        setLoggedIn(true);
        setUser(user);
      } catch (err) {
        // NO need to do anything: user is simply not yet authenticated

      }
    };

    firstCheck();

  }, []);

  /**
 * This function handles the login process.
 * It requires a username and a password inside a "credentials" object.
 */
  const handleLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);
      setUser(user);
      setLoggedIn(true);
      handleSuccess("Logged in");
    } catch (err) {
      // error is handled and visualized in the login form, do not manage error, throw it
      throw err;
    }
  };

  /**
  * This function handles the logout process.
  */
  const handleLogout = async () => {
    await API.logOut();
    setLoggedIn(false);
    handleSuccess("Logged out");
    // clean up everything
    setUser(null);
  };

  return (
    <BrowserRouter>
      <MessageContext.Provider value={{ handleErrors }}>
        <SuccMessageContext.Provider value={{ handleSuccess }}>

          <Container fluid className="App">
            <Navigation logout={handleLogout} user={user} loggedIn={loggedIn} />
            <Container fluid className='vw-100 below-nav'>
              <Row className='justify-content-md-center text-center'>
                <Routes>
                  <Route path="/" element={loading ? <LoadingLayout /> : <DefaultLayout flightList={flights} loggedIn={loggedIn} />} ></Route>
                  <Route path="/seats/:plane_id" element={flights.length != 0 ? <PlaneView flightList={flights} loggedIn={loggedIn} /> : <Navigate replace to='/' />} />
                  <Route path="/login" element={!loggedIn ? <LoginLayout login={handleLogin} /> : <Navigate replace to='/' />} />
                  <Route path="*" element={<NotFoundLayout />} />
                </Routes>
              </Row>
            </Container>

            <Toast show={message !== ''} onClose={() => { setMessage(''); setSuccMessage(''); }} delay={5000} autohide bg="danger">
              <Toast.Body className='text-white'>{message}</Toast.Body>
            </Toast>

            <Toast show={succMessage !== '' && message == ''} onClose={() => setSuccMessage('')} delay={3000} autohide bg="success">
              <Toast.Body className='text-white'>{succMessage}</Toast.Body>
            </Toast>

          </Container>
        </SuccMessageContext.Provider>
      </MessageContext.Provider>

    </BrowserRouter >
  )
}

export default App
