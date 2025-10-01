import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="main-nav">
      <ul>
        <li>
          <Link to="/">Головна</Link>
        </li>
        <li>
          <Link to="/model">Model</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;