import React from "react";
import { Navbar,Footer } from "flowbite-react";

const NaviagationBar = () => {
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
          My Website
        </span>
      </Navbar.Brand>
      <div className="flex ">
        <form className="relative hidden md:block">
          <input
            type="text"
            className="border rounded-lg p-2 text-sm"
            placeholder="Search..."
          />
        </form>
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
export default NaviagationBar;