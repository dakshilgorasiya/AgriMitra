import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowLeft } from "lucide-react";
import { Autocomplete, TextField } from "@mui/material";
import { CROP_CATEGORY } from "../assets/constants"; // Assuming you have a constants file for categories
import axios from "axios";
import { toast } from "react-toastify";
const NewProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    farmName: "",
    description: "",
    price: "",
    category: "",
    quantity: "",
    size: "",
    unitOfSize: "",
    address: {
      houseNo: "",
      street: "",
      city: "",
      state: "",
      pinCode: "",
    },
    images: [],
  });

  // Handle address change
  const handleAddressChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      address: {
        ...prevState.address,
        [id]: value,
      },
    }));
  };
  const categories = CROP_CATEGORY;
  const [previews, setPreviews] = useState([]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [...formData.images, ...files];

    setFormData({ ...formData, images: newImages });

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append("farmName", formData.farmName);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", formData.price);
    formDataToSend.append("category", formData.category);
    formDataToSend.append("quantity", formData.quantity);
    formDataToSend.append("size", formData.size);
    formDataToSend.append("unitOfSize", formData.unitOfSize);
    formDataToSend.append("address", JSON.stringify(formData.address));

    // Append images
    formData.images.forEach((image) => {
      formDataToSend.append("images", image);
    });

    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/product/create-product`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (response.status === 201) {
        // console.log("Product created successfully", response.data);
        toast.success("Product created successfully!");
        navigate("/farmer/dashboard");
      }
    } catch (error) {
      // console.error(
      //   "Error creating product:",
      //   error.response?.data || error.message
      // );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>
              <div className="mt-1 flex flex-wrap gap-4">
                {previews.map((src, index) => (
                  <img
                    key={index}
                    src={src}
                    alt={`Preview ${index}`}
                    className="h-20 w-20 object-cover rounded-md border"
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="image-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500"
                    >
                      <span>Upload files</span>
                      <input
                        id="image-upload"
                        name="image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
            {/* Product Details */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Farm Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.farmName}
                  onChange={(e) =>
                    setFormData({ ...formData, farmName: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Price per unit
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      id="price"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="size"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Size per unit
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      id="size"
                      value={formData.size}
                      onChange={(e) =>
                        setFormData({ ...formData, size: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Quantity
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      id="quantity"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-green-500 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="unitOfSize"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Unit Of Size
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="unitOfSize"
                      value={formData.unitOfSize}
                      onChange={(e) =>
                        setFormData({ ...formData, unitOfSize: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <Autocomplete
                  options={categories}
                  value={formData.category}
                  onChange={(event, newValue) =>
                    setFormData({ ...formData, category: newValue || "" })
                  }
                  renderInput={(params) => (
                    <TextField {...params} variant="outlined" />
                  )}
                />
              </div>
            </div>
            {/* Address Details */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Address Details</h5>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="houseNo"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    House No.
                  </label>
                  <input
                    type="text"
                    id="houseNo"
                    value={formData.address.houseNo}
                    onChange={handleAddressChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="House No."
                  />
                </div>
                <div>
                  <label
                    htmlFor="street"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Street
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={formData.address.street}
                    onChange={handleAddressChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Street Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.address.city}
                    onChange={handleAddressChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="City Name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={formData.address.state}
                    onChange={handleAddressChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label
                  htmlFor="pinCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Pincode
                </label>
                <input
                  type="text"
                  id="pinCode"
                  value={formData.address.pinCode}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="Pincode"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </button>
              {loading ? (
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium cursor-not-allowed"
                  disabled
                >
                  Creating...
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Create Product
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewProduct;
