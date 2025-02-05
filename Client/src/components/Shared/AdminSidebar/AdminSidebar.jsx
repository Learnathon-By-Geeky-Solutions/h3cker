import React from "react";
import { Sidebar } from "flowbite-react";
const AdminSidebar = () => {

    return(
    <div>
    <Sidebar className="shadow-lg">
        <Sidebar.Items>
            <Sidebar.ItemGroup>
                <Sidebar.Item href="#" className="font-custom-font">Dashboard</Sidebar.Item>
                <Sidebar.Item href="#">Users</Sidebar.Item>
                <Sidebar.Item href="#">Videos</Sidebar.Item>
                
            </Sidebar.ItemGroup>
        </Sidebar.Items>
    </Sidebar>
    </div>
    );
};
export default AdminSidebar;