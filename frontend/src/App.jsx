import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import News from "./pages/News";
import Weather from "./pages/Weather";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Error from "./pages/Error";
import Profile from "./pages/Profile";
import ProductDetail from "./pages/ProductDetail";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";
import CompleteProfile from "./pages/CompleteProfile";
import { useDispatch } from "react-redux";
import { getUser } from "./redux/slices/authSlice";
import { useEffect } from "react";
import { getCartProducts } from "./redux/slices/Cart/GetCart";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ChatBot from "./pages/ChatBot";
import FertilityPrediction from "./components/FertilityPrediction";
import CropPrediction from "./components/CropPrediction";
import FertilizerPrediction from "./components/FertilizerPrediction";
import FarmerDashboard from "./pages/FarmerDashboard";
import NewProduct from "./pages/NewProduct";
import Chat from "./pages/Chat";
import MLPrediction from "./pages/MLPrediction";
import CropYieldPrediction from "./components/CropYieldPrediction";
import MangoPrediction from "./components/MangoPrediction";
import CottonPrediction from "./components/CottonPrediction";
import RicePrediction from "./components/RicePrediction";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProtectedRoute from "./components/ProtectedRoute";
import OrderConfirmation from "./components/OrderConformation";
import PlantLoader from "./components/PlantLoader";

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getUser());
    dispatch(getCartProducts());
  }, [dispatch]);
  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover:true
        draggable
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/product" element={<ProductDetail />} />
            <Route path="/news" element={<News />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/reset-password/:id" element={<ResetPassword />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Error />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatBot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fertility"
              element={
                <ProtectedRoute>
                  <FertilityPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crop"
              element={
                <ProtectedRoute>
                  <CropPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fertilizer"
              element={
                <ProtectedRoute>
                  <FertilizerPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/dashboard"
              element={
                <ProtectedRoute>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/products/new"
              element={
                <ProtectedRoute>
                  <NewProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ml-models"
              element={
                <ProtectedRoute>
                  <MLPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crop-yield"
              element={
                <ProtectedRoute>
                  <CropYieldPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mango-prediction"
              element={
                <ProtectedRoute>
                  <MangoPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotton-prediction"
              element={
                <ProtectedRoute>
                  <CottonPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rice-prediction"
              element={
                <ProtectedRoute>
                  <RicePrediction />
                </ProtectedRoute>
              }
            />

            <Route
              path="/order-success"
              element={
                <ProtectedRoute>
                  <OrderConfirmation />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
