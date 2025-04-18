import React from "react";
import { Footer } from "flowbite-react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { BsFacebook, BsInstagram, BsTwitter, BsGithub, BsLinkedin } from "react-icons/bs";

const MainFooter = () => {
  const currentYear = new Date().getFullYear();

  // Custom theme for Flowbite Footer to match dark theme
  const customTheme = {
    root: {
      base: "w-full bg-gray-900 shadow md:flex md:items-center md:justify-between z-10 relative border-t border-gray-800",
    },
    brand: {
      base: "m-6 flex items-center",
    },
    groupLink: {
      base: "flex flex-wrap text-gray-400",
      link: {
        base: "mb-3 mr-3 md:mr-6 last:mr-0 hover:text-blue-500 transition-colors text-white",
      },
    },
    icon: {
      base: "text-gray-400 hover:text-blue-500 transition-colors",
    },
    title: {
      base: "mb-4 text-lg font-semibold text-white",
    },
    divider: {
      base: "w-full my-6 border-gray-800 lg:my-8",
    },
    copyright: {
      base: "text-sm text-gray-400 sm:text-center",
      href: "hover:text-blue-500 transition-colors text-gray-400",
      span: "ml-1 text-gray-400",
    },
    link: {
      base: "hover:text-blue-500 transition-colors text-gray-400",
    }
  };

  return (
    <Footer container className="bg-gray-900 rounded-none border-t border-gray-800 z-10 relative" theme={customTheme}>
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid w-full grid-cols-1 gap-8 px-6 py-8 md:grid-cols-4">
          <div>
            <Footer.Brand
              as={Link}
              to="/"
              className="mb-4"
            >
              <div className="flex items-center">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg mr-2">
                  <BarChart3 size={15} className="text-white" />
                </div>
                <span className="self-center text-xl font-semibold whitespace-nowrap text-white">
                  Engage Analytics
                </span>
              </div>
            </Footer.Brand>
            <p className="text-gray-400 mb-6 text-sm">
              Advanced facial emotion detection for video advertisements. Optimize your content with data-driven insights.
            </p>
            <div className="flex space-x-4">
              <Footer.Icon href="#" icon={BsFacebook} />
              <Footer.Icon href="#" icon={BsInstagram} />
              <Footer.Icon href="#" icon={BsTwitter} />
              <Footer.Icon href="https://github.com/Learnathon-By-Geeky-Solutions/h3cker" icon={BsGithub} />
              <Footer.Icon href="#" icon={BsLinkedin} />
            </div>
          </div>
          
          <div>
            <Footer.Title title="Products" />
            <Footer.LinkGroup col className="text-gray-400">
              <Footer.Link as={Link} to="/features" className="text-gray-400 hover:text-blue-500">Features</Footer.Link>
              <Footer.Link as={Link} to="/pricing" className="text-gray-400 hover:text-blue-500">Pricing</Footer.Link>
              <Footer.Link as={Link} to="/analytics" className="text-gray-400 hover:text-blue-500">Analytics</Footer.Link>
              <Footer.Link as={Link} to="/api" className="text-gray-400 hover:text-blue-500">API</Footer.Link>
            </Footer.LinkGroup>
          </div>
          
          <div>
            <Footer.Title title="Resources" />
            <Footer.LinkGroup col className="text-gray-400">
              <Footer.Link as={Link} to="/documentation" className="text-gray-400 hover:text-blue-500">Documentation</Footer.Link>
              <Footer.Link as={Link} to="/guides" className="text-gray-400 hover:text-blue-500">Guides</Footer.Link>
              <Footer.Link as={Link} to="/blog" className="text-gray-400 hover:text-blue-500">Blog</Footer.Link>
              <Footer.Link as={Link} to="/support" className="text-gray-400 hover:text-blue-500">Support</Footer.Link>
            </Footer.LinkGroup>
          </div>
          
          <div>
            <Footer.Title title="Company" />
            <Footer.LinkGroup col className="text-gray-400">
              <Footer.Link as={Link} to="/about" className="text-gray-400 hover:text-blue-500">About</Footer.Link>
              <Footer.Link as={Link} to="/careers" className="text-gray-400 hover:text-blue-500">Careers</Footer.Link>
              <Footer.Link as={Link} to="/contact" className="text-gray-400 hover:text-blue-500">Contact</Footer.Link>
              <Footer.Link as={Link} to="/privacy" className="text-gray-400 hover:text-blue-500">Privacy Policy</Footer.Link>
            </Footer.LinkGroup>
          </div>
        </div>
        
        <Footer.Divider />
        
        <div className="w-full px-4 py-6 sm:flex sm:items-center sm:justify-between">
          <Footer.Copyright href="#" by="EngageAnalytics™" year={currentYear} className="text-gray-400" />
          <div className="mt-4 flex space-x-6 sm:mt-0 sm:justify-center">
            <Footer.Link as={Link} to="/privacy" className="text-gray-400 hover:text-blue-500">Privacy Policy</Footer.Link>
            <Footer.Link as={Link} to="/terms" className="text-gray-400 hover:text-blue-500">Terms of Service</Footer.Link>
            <Footer.Link as={Link} to="/cookie" className="text-gray-400 hover:text-blue-500">Cookie Policy</Footer.Link>
          </div>
        </div>
      </div>
    </Footer>
  );
};

export default MainFooter;