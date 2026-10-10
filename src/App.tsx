import { RouterProvider } from 'react-router';
import router from './routes/Router';
import './css/globals.css';
import { CareProvider } from './context/itcare';

function App() {
  return (
    <>
    
      <CareProvider><RouterProvider router={router} /></CareProvider>
    </>
  );
}

export default App;
