import React from "react";

function PendingApprovalPage() {
  return (
    <div>
      please wait for the admin to approve your request
      <div className="flex justify-center items-center h-screen">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h1 className="text-2xl font-bold mb-4">Pending Approval</h1>
          <p className="text-gray-700">
            Your request is under review. Please check back later.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PendingApprovalPage;
