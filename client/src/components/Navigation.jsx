import React from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { Navbar, Nav, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { LogoutButton, LoginButton } from './Auth';

const Navigation = (props) => {

  return (
    <Navbar bg="dark" expand="sm" variant="dark" fixed="top" className="navbar-padding">
      <Link to="/">
        <Navbar.Brand>
          <i className="bi bi-airplane-fill icon-size" /> FlightAP
        </Navbar.Brand>
      </Link>
      <Link to="/">
        <Navbar.Text>
          Home
        </Navbar.Text>
      </Link>
      <Nav className="log-right">
        <Navbar.Text className="mx-2">
          {props.user && props.user.name && `Welcome, ${props.user.name}!`}
        </Navbar.Text>
        <Form className="mx-2">
          {props.loggedIn ? <LogoutButton logout={props.logout} /> : <LoginButton />}
        </Form>
      </Nav>
    </Navbar>
  );
}

export { Navigation };
