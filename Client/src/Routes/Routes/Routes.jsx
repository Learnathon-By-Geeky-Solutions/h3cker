// In your Routes.jsx file
import { createBrowserRouter } from "react-router-dom";
import App from "../../App";
import Home from "../../components/Pages/Home/home.jsx";
import Login from "../../components/Shared/Login/login.jsx";
import Signup from "../../components/Shared/Singup/singup.jsx";
import ForgetPassword from "../../components/Shared/ForgetPassword/forgetpassword.jsx";
import about from "../../components/Pages/About/about.jsx";



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
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/forgetpassword",
        element: <ForgetPassword />,
      },
      {
        path: "/about",
        element: <about />,
      },

    ]
  }
]);

export default router;