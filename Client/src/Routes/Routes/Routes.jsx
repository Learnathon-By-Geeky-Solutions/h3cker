import {
    createBrowserRouter,
    RouterProvider,
  } from "react-router-dom";
import App from "../../App";
import Home from "../../components/Pages/Home/home.jsx"

  const router = createBrowserRouter([
    {
      path: "/",
      element: <App/>,
    },
    {
      path:"/test",
      element: <Home/>,
    },
  ]);

    export default router;