import React from 'react';
import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen">
      <main>
        <Outlet /> {/* The actual content will be rendered here */}
      </main>
    </div>
  );
}

export default App;
