import { createBrowserRouter } from "react-router-dom";
import App from "../../App";
import Home from "../../components/Pages/Home/Home.jsx";
import Login from "../../components/Shared/Login/Login.jsx";
import Signup from "../../components/Shared/Singup/Singup.jsx";
import ForgetPassword from "../../components/Shared/ForgetPassword/forgetpassword.jsx";
import About from "../../components/Pages/About/About.jsx";
import Profile from "../../components/Pages/Profile/Profile.jsx";
import Dashboard from "../../components/Pages/Dashboard/Dashboard.jsx";
import UploadVideo from "../../components/Pages/Dashboard/UploadVideo.jsx";
import VideoDetail from "../../components/Shared/VideoPlayer/VideoDetail.jsx";
import PrivateRoute from "../PrivateRoute/Privateroute.jsx";
import Video from "../../components/Pages/Video/Video.jsx";

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
        element: <About />,
      },
      {
        path: "/profile",
        element: <PrivateRoute><Profile /></PrivateRoute>,
      },
      {
        path: "/dashboard",
        element: <PrivateRoute><Dashboard /></PrivateRoute>
      },
      {
        path: "/dashboard/upload",
        element: <PrivateRoute><UploadVideo /></PrivateRoute>
      },
      {
        path: "/video/:id", 
        element: <VideoDetail />
      },
      {
        path: "/videos",
        element: <Video />
      }
    ]
  }
]);

export default router;