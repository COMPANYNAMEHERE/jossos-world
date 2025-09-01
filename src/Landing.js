import React, { useState, useEffect } from 'react';
import './css/Landing.css';

const Landing = ({ onAnimationComplete }) => {
  const [messages, setMessages] = useState([]);
  const [loginMessage, setLoginMessage] = useState('');
  const [showLoginBox, setShowLoginBox] = useState(false);

  // Helper to simulate a typewriter effect
  const typeOutText = (text, callback) => {
    let i = 0;
    const interval = setInterval(() => {
      setLoginMessage(text.slice(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(interval);
        setMessages(prev => [...prev, text]);
        setLoginMessage('');
        callback && callback();
      }
    }, 100); // adjust typing speed as needed
  };

  useEffect(() => {
    // Phase 1: initial system messages
    const phase1Messages = [
      'Initializing system...',
      'Loading modules...',
      'Verifying credentials...'
    ];
    // Phase 3: final messages after login details are typed out
    const phase3Messages = [
      'Logging in as admin...',
      'Access granted. Welcome!'
    ];
    const usernameText = 'Username: admin';
    const passwordText = 'Password: password123';

    let index = 0;
    const phase1Interval = setInterval(() => {
      setMessages(prev => [...prev, phase1Messages[index]]);
      index++;
      if (index === phase1Messages.length) {
        clearInterval(phase1Interval);
        // Phase 2: type out username then password
        typeOutText(usernameText, () => {
          typeOutText(passwordText, () => {
            // Show login box with auto-filled credentials
            setShowLoginBox(true);
            // Phase 3: final messages one per second
            let finalIndex = 0;
            const phase3Interval = setInterval(() => {
              setMessages(prev => [...prev, phase3Messages[finalIndex]]);
              finalIndex++;
              if (finalIndex === phase3Messages.length) {
                clearInterval(phase3Interval);
                setTimeout(onAnimationComplete, 1000);
              }
            }, 1000);
          });
        });
      }
    }, 1000);

    return () => clearInterval(phase1Interval);
  }, [onAnimationComplete]);

  return (
    <div className="landing">
      {messages.map((msg, i) => (
        <div key={i} className="message">{msg}</div>
      ))}
      {loginMessage && <div className="login-animation">{loginMessage}</div>}
      {showLoginBox && (
        <div className="login-box">
          <div className="login-field">
            <label>Username:</label>
            <input type="text" value="admin" readOnly />
          </div>
          <div className="login-field">
            <label>Password:</label>
            <input type="password" value="password123" readOnly />
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;