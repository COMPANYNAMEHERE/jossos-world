import React, { useState } from 'react';
import Landing from './Landing';
import MainPage from './MainPage';

function App() {
  const [showMainPage, setShowMainPage] = useState(false);

  const handleAnimationComplete = () => {
    setShowMainPage(true);
  };

  return showMainPage ? <MainPage /> : <Landing onAnimationComplete={handleAnimationComplete} />;
}

export default App;