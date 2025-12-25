// ErrorPage.jsx
import React from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { NavLink } from "react-router-dom";

const NotFound = () => {
  return (
    <div className=" fixed top-0 left-0 flex items-center justify-center h-screen w-full bg-gray-950 text-white px-4">
      <div className="text-center max-w-lg">
        <motion.div
          className="inline-block bg-gray-900 p-6 rounded-full shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 150 }}
        >
          <Lock className="text-red-500 w-12 h-12" />
        </motion.div>
        <h1 className="text-5xl font-bold mt-6">Access Denied</h1>
        <p className="text-lg text-gray-400 mt-4">
          Sorry, you don't have permission to access this page or it doesn't exist.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Error Code: <span className="text-red-400">403 / 404</span>
        </p>
        <NavLink
          to="/"
          className="inline-block mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
        >
          Go Back Home
        </NavLink>
      </div>
    </div>
  );
};

export default NotFound;
