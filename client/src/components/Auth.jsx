import { useState } from 'react';
import { Form, Button, Alert, Col, Row } from 'react-bootstrap';
import { useLocation, useNavigate, Link } from 'react-router-dom';

function LoginForm(props) {
  const [username, setUsername] = useState('aldo@email.it');
  const [password, setPassword] = useState('pass');

  const [show, setShow] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const location = useLocation();
  const navigate = useNavigate();


  const handleSubmit = (event) => {
    event.preventDefault();
    const credentials = { username, password };

    props.login(credentials)
      .then(() => navigate("/"))
      .catch((err) => {
        setErrorMessage(err.error); setShow(true);
      });
  };

  return (
    <Row className="vh-100 justify-content-md-center">
      <Col md={4} >
        <h1 className="pb-3">Login</h1>

        <Form onSubmit={handleSubmit}>
          <Alert
            dismissible
            show={show}
            onClose={() => setShow(false)}
            variant="danger">
            {errorMessage}
          </Alert>
          <Form.Group className="mb-3" controlId="username">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={username} placeholder="Example: john.doe@polito.it"
              onChange={(ev) => setUsername(ev.target.value)}
              required={true}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password} placeholder="Enter the password."
              onChange={(ev) => setPassword(ev.target.value)}
              required={true} minLength={1}
            />
          </Form.Group>
          <Button className="mt-3" type="submit" variant='dark'>Login</Button>
          <Button className="mt-3 mx-2" variant='dark' onClick={() => navigate("/")} >Go Back</Button>
        </Form>
      </Col>
    </Row>
  )
};

function LogoutButton(props) {
  return (
    <Link to="/">
      <Button variant="outline-light" onClick={props.logout}>Logout</Button>
    </Link>
  )
}

function LoginButton(props) {
  const navigate = useNavigate();
  return (
    <Button variant="outline-light" onClick={() => navigate('/login')}>Login</Button>
  )
}

export { LoginForm, LogoutButton, LoginButton };
