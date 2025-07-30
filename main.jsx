    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import App from './App.jsx'
    import './index.css' // Make sure this line is present

    // Get the root element from your public/index.html
    const rootElement = document.getElementById('root');

    // Check if the root element exists before creating the React root
    if (rootElement) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    } else {
      console.error('Root element with ID "root" not found in index.html. React app cannot mount.');
    }
    