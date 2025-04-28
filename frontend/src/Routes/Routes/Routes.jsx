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
import DeviceManager from "../../components/Shared/DeviceManager/DeviceManager.jsx";
import UserWatchHistory from "../../components/Pages/Dashboard/UserWatchHistory.jsx";


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
        path: "/devices",
        element: <PrivateRoute><DeviceManager /></PrivateRoute>,
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
        path: "/dashboard/history",
        element: <PrivateRoute><UserWatchHistory /></PrivateRoute>
      },
      {
        path: "/dashboard/liked",
        element: <PrivateRoute><UserWatchHistory initialTab="liked" /></PrivateRoute>
      },
      {
        path: "/video/:id", 
        element: <PrivateRoute><VideoDetail /></PrivateRoute>,
      },
      {
        path: "/videos",
        element: <PrivateRoute><Video /></PrivateRoute>,
      },
    ]
  }
]);

export default router;