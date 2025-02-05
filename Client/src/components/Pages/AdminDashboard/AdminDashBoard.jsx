import React from "react";
import AdminNavigationBar from "../../Shared/AdminNavbar/AdminNavbar";
import MainFooter from "../../Shared/Footer/Footer";
import AdminSidebar from "../../Shared/AdminSidebar/AdminSidebar";

const AdminDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavigationBar />
      <div className="flex flex-grow overflow-y-auto">
        <AdminSidebar className="w-auto" />
        <div className="flex-1 p-10 space-y-10">
          {/* User Statistics Section */}
          <section>
            <h1 className="text-4xl font-bold text-center mb-6">User Statistics</h1>
            <div className="flex justify-center gap-6">
              <div className="border p-4 rounded text-center w-1/3">
                <p className="text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">5000</p>
              </div>
              <div className="border p-4 rounded text-center w-1/3">
                <p className="text-gray-500">Active Users</p>
                <p className="text-2xl font-bold">2500</p>
              </div>
            </div>
          </section>

          {/* Video Performance Section */}
          <section>
            <h1 className="text-4xl font-bold text-center mb-6">Video Performance</h1>
            <div className="flex justify-center gap-6">
              <div className="border p-4 rounded text-center w-1/3">
                <p className="text-gray-500">Total Ads</p>
                <p className="text-2xl font-bold">1000</p>
              </div>
              <div className="border p-4 rounded text-center w-1/3">
                <p className="text-gray-500">Avg Engagement Score</p>
                <p className="text-2xl font-bold">75%</p>
              </div>
            </div>
          </section>

          {/* System Health Section */}
          <section>
            <h1 className="text-4xl font-bold text-center mb-6">System Health</h1>
            <div className="flex justify-center gap-6">
              <div className="border p-4 rounded text-center w-1/3">
                <p className="text-gray-500">Server Uptime</p>
                <p className="text-2xl font-bold">99.8%</p>
              </div>
              <div className="border p-4 rounded text-center w-1/3">
                <p className="text-gray-500">Error Logs</p>
                <p className="text-2xl font-bold">15</p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <MainFooter />
    </div>
  );
};

export default AdminDashboard;