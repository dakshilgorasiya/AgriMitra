import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import PlantLoader from "./PlantLoader";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader">
          <PlantLoader />
        </div>
      </div>
    );
  }

  if (!user) {
    toast.error("Please log in to access this page");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
