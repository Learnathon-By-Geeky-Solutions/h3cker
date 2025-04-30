import { createBrowserRouter } from "react-router-dom";
import App from "../../App";
import Home from "../../components/Pages/Home/Home.jsx";
import Login from "../../components/Shared/Login/Login.jsx";
import Signup from "../../components/Shared/Singup/Singup.jsx";
import ForgetPassword from "../../components/Shared/ForgetPassword/forgetpassword.jsx";
import About from "../../components/Pages/About/About.jsx";
import Profile from "../../components/Pages/Profile/Profile.jsx";
import Dashboard from "../../components/Pages/Dashboard/Dashboard.jsx";
import DashboardLayout from "../../components/Shared/DashboardLayout/DashboardLayout.jsx";
import UploadVideo from "../../components/Pages/Dashboard/Admin/UploadVideo.jsx";
import VideoDetail from "../../components/Shared/VideoPlayer/VideoDetail.jsx";
import PrivateRoute from "../PrivateRoute/Privateroute.jsx";
import AdminRoute from "../AdminRoute/AdminRoute.jsx";
import Video from "../../components/Pages/Video/Video.jsx";
import DeviceManager from "../../components/Shared/DeviceManager/DeviceManager.jsx";
import UserWatchHistory from "../../components/Pages/Dashboard/User/UserWatchHistory.jsx";
import AdminVideos from "../../components/Pages/Dashboard/Admin/AdminVideos.jsx";
import EditVideo from "../../components/Pages/Dashboard/Admin/EditVideo.jsx";
import AdminRoleManagement from "../../components/Pages/Dashboard/Admin/AdminRoleManagement.jsx";
import UserLikedVideo from "../../components/Pages/Dashboard/User/UserLikedVideo.jsx";
import RecordedVideos from "../../components/Pages/Dashboard/Admin/RecordedVideos.jsx";
import DetailedAnalytics from "../../components/Pages/Dashboard/Admin/DetailedAnalytics.jsx";


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
        path: "/video/:id", 
        element: <PrivateRoute><VideoDetail /></PrivateRoute>,
      },
      {
        path: "/videos",
        element: <PrivateRoute><Video /></PrivateRoute>,
      }

    ]
  },

  {
    path: "/dashboard",
    element: <PrivateRoute><DashboardLayout /></PrivateRoute>,
    children: [
      {
        path: "", 
        element: <Dashboard />
      },
  
      {
        path: "upload",
        element: <AdminRoute><UploadVideo /></AdminRoute>
      },
      {
        path: "videos",
        element: <AdminRoute><AdminVideos /></AdminRoute>
      },
      {
        path: "edit-video/:id",
        element: <AdminRoute><EditVideo /></AdminRoute>
      },
      {
        path: "role-management",
        element: <AdminRoute><AdminRoleManagement /></AdminRoute>
      },
      {
        path: "recorded-videos",
        element: <AdminRoute><RecordedVideos /></AdminRoute>
      },
      {
        path: "detailed-analytics",
        element: <AdminRoute><DetailedAnalytics /></AdminRoute>
      },
      {
        path: "liked-videos",
        element: <PrivateRoute><UserLikedVideo /></PrivateRoute>,
      },
      {
        path: "history",
        element: <PrivateRoute><UserWatchHistory /></PrivateRoute>,
      }
    ]
  }
]);

export default router;