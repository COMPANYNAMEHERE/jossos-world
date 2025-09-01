import { useState } from 'react';
import './LandingPage.css';

export default function LandingPage() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { innerWidth, innerHeight } = window;
    const y = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const x = -((e.clientY - innerHeight / 2) / (innerHeight / 2));
    setTilt({ x: x * 10, y: y * 10 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  const handleRipple = (e) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - diameter / 2}px`;
    circle.style.top = `${e.clientY - rect.top - diameter / 2}px`;
    circle.className = 'ripple';
    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) {
      ripple.remove();
    }
    button.appendChild(circle);
  };

  return (
    <div className="landing" onMouseMove={handleMouseMove} onMouseLeave={resetTilt}>
      <div className="card" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <h1>Jossos World</h1>
        <p>A playground for new ideas. Watch this space as we build the future.</p>
        <button className="explore" onClick={handleRipple}>Explore</button>
      </div>
    </div>
  );
}
