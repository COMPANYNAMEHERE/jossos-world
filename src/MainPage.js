import React, { useState, useEffect } from 'react';

const Landing = ({ onAnimationComplete }) => {
  const [messages, setMessages] = useState([]);
  const messagesSequence = [
    'Initializing system...',
    'Loading modules...',
    'Verifying credentials...',
    'Logging in as username...',
    'Access granted. Welcome!',
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setMessages(prev => [...prev, messagesSequence[index]]);
      index++;
      if (index === messagesSequence.length) {
        clearInterval(interval);
        // Delay a moment before transitioning to the main page
        setTimeout(onAnimationComplete, 1000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onAnimationComplete]);

  return (
    <div style={{
      backgroundColor: 'black',
      color: 'green',
      fontFamily: 'monospace',
      height: '100vh',
      padding: '20px'
    }}>
      {messages.map((msg, i) => <div key={i}>{msg}</div>)}
    </div>
  );
};

export default Landing;