import React from "react";
import { Navbar } from "flowbite-react";

const AdminNaviagationBar = () => {
    return(
      <div>
      <Navbar fluid rounded className="bg-custom-gray shadow-md p-4">
      <Navbar.Brand href="/">
        <img
          src="https://flowbite.com/docs/images/logo.svg"
          className="h-6 mr-3 sm:h-9"
          alt="Logo"
        />
        <span className="self-center whitespace-nowrap text-xl font-semibold">
          H3cker
        </span>
      </Navbar.Brand>
      <div className="flex ">
       <h1>Admin Dashboard</h1>
        <Navbar.Toggle />
      </div>
      <Navbar.Collapse>
        <Navbar.Link href="/" active>
          Home
        </Navbar.Link>
        <Navbar.Link href="/about">About</Navbar.Link>
        <Navbar.Link href="/services">Videos</Navbar.Link>
        <Navbar.Link href="/contact">Profile</Navbar.Link>
      </Navbar.Collapse>
    </Navbar>
   
    </div>
    )
};
export default AdminNaviagationBar;