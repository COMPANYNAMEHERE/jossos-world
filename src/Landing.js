// landing.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TerminalLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate "login" animation duration
    const timer = setTimeout(() => {
      navigate('/main');
    }, 3000); // 3 seconds, for example
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.terminal}>
        <p>> Logging in...</p>
        <p>> Authenticating user...</p>
        <p>> Welcome!</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#000',
  },
  terminal: {
    color: '#0f0',
    fontFamily: 'Courier, monospace',
    fontSize: '1.2rem',
  },
};

export default TerminalLanding;