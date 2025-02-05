import { Footer } from "flowbite-react";
import React from "react";

const MainFooter = () => {
    return (
        <Footer container className="bg-custom-gray">
          <Footer.Copyright href="#" by="h3cker™" year={2024} />
          <Footer.LinkGroup>
            <Footer.Link href="#">About</Footer.Link>
            <Footer.Link href="#">Privacy Policy</Footer.Link>
            <Footer.Link href="#">Licensing</Footer.Link>
            <Footer.Link href="#">Contact</Footer.Link>
          </Footer.LinkGroup>
        </Footer>
      );
}
export default MainFooter;