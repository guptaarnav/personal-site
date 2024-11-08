// src/App.js
import React, { useEffect } from 'react';
import initAnimation from './animation';

const App = () => {
  useEffect(() => {
    initAnimation();
  }, []);

  return (
    <div>
      <div id="animation-container" />
      <div style={{ height: '100vh', backgroundColor: 'lightgray' }}>
        <h1>Scroll Down for More Content</h1>
        <p>This is a placeholder section to enable scrolling.</p>
      </div>
    </div>
  );
};

export default App;
