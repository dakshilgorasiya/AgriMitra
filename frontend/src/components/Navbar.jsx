import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sprout,
  ShoppingCart,
  Sun,
  Newspaper,
  UserCircle,
  Menu,
  X,
  House,
  Home,
  User,
  BotMessageSquare,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth"; // Assuming you have this custom hook
import UserDropdown from "./UserDropdown";
import { useSelector } from "react-redux";
import MLDropDown from "./MLDropDown";
import { setLanguage } from "./setLanguage";
import LanguageSelector from "./LanguageSelector";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State to manage dropdown visibility
  const [isProfileOpen, setIsProfileOpen] = useState(false); // State to manage dropdown visibility
  const [isMLDropDownOpen, setIsMLDropDownOpen] = useState(false); // State to manage dropdown visibility

  const { user } = useAuth(); // Getting the user from auth context
  const navigate = useNavigate();
  const { products } = useSelector((state) => state.cartItems);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Toggle menu visibility
  };
  const isProfileOpenToggle = () => {
    setIsProfileOpen(!isProfileOpen); // Toggle profile menu visibility
  };

  const isMLDropDownToggle = () => {
    setIsMLDropDownOpen(!isMLDropDownOpen); // Toggle ML dropdown visibility
  };

  var cartItemsCount = products.length;
  useEffect(() => {
    cartItemsCount = products.length;
  }, [products]);

  const languageOptions = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "bn", label: "বাংলা" },
    { code: "gu", label: "ગુજરાતી" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "ml", label: "മലയാളം" },
    { code: "mr", label: "मराठी" },
    { code: "ne", label: "नेपाली" },
    { code: "or", label: "ଓଡ଼ିଆ" },
    { code: "pa", label: "ਪੰਜਾਬੀ" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
    { code: "ur", label: "اردو" },
  ];
  const handleChange = (e) => {
    setLanguage(e.target.value);
  };
  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 ">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Sprout className="h-8 w-8" />
            <span className="text-xl font-bold pr-5">Agrimitra</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="hover:text-green-200 flex items-center space-x-1"
            >
              <House className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link
              to="/shop"
              className="hover:text-green-200 flex items-center space-x-1"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Shop</span>
            </Link>
            <Link
              to="/weather"
              className="hover:text-green-200 flex items-center space-x-1"
            >
              <Sun className="h-5 w-5" />
              <span>Weather</span>
            </Link>
            <Link
              to="/news"
              className="hover:text-green-200 flex items-center space-x-1"
            >
              <Newspaper className="h-5 w-5" />
              <span>News</span>
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* ML Dropdown */}
            <div className="hover:text-green-200 relative">
              <button
                onClick={isMLDropDownToggle}
                className="flex items-center space-x-2"
              >
                <BotMessageSquare className="h-6 w-6" />
              </button>
              <MLDropDown
                isOpen={isMLDropDownOpen}
                onClose={() => setIsMLDropDownOpen(false)}
              />
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative">
              <button className="hover:text-green-200 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-green-600">
                <ShoppingCart className="h-6 w-6" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </Link>

            {/* User Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={isProfileOpenToggle}
                  className="flex items-center space-x-2"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </button>
                <UserDropdown
                  isOpen={isProfileOpen}
                  onClose={() => setIsProfileOpen(false)}
                />
              </div>
            ) : (
              <Link to="/login" className="hover:text-green-200">
                <UserCircle className="h-6 w-6" />
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Language Selector */}
            <div className="hidden md:block relative">
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/shop"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                to="/weather"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Weather
              </Link>
              <Link
                to="/news"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                onClick={() => setIsMenuOpen(false)}
              >
                News
              </Link>
              <div className="mt-4 border-t border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-300">
                  Select Language
                </h3>
                <div className="mt-2">
                  <LanguageSelector />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
