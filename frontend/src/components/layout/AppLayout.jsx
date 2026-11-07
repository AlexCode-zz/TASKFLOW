import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const AppLayout = () => {
  return (
    <div className="app-wrapper d-flex">
      <Sidebar />
      <main className="flex-grow-1 d-flex flex-column">
        <Navbar />
        <div className="container-fluid px-4 py-3 flex-grow-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
