import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <nav className={`main-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="logo">STELLARIS</div>
        <div className="nav-links">
            <Link to="/model">Model</Link>
            <Link to="/">Catalog</Link>
        </div>
    </nav>
  );
}

export default Navbar;