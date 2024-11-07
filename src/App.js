import React, { useEffect } from 'react';
import initAnimation from './animation';

const App = () => {
  useEffect(() => {
    initAnimation();
  }, []);

  return <div id="animation-container" style={{ width: '100vw', height: '100vh' }} />;
};

export default App;
