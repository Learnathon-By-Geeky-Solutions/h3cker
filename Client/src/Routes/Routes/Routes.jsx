import { createBrowserRouter } from "react-router-dom";
import App from "../../App";
import Home from "../../components/Pages/Home/home.jsx";
import Login from "../../components/Shared/Login/login.jsx";
import AdminDashboard from "../../components/Pages/AdminDashboard/AdminDashBoard.jsx";
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path:"/admin",
        element:<AdminDashboard/>
      }
    ]

  }
]);

export default router;