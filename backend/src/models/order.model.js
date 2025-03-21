import mongoose from "mongoose";
import { ORDER_STATUS } from "../constants.js";

const orderSchema = new mongoose.Schema({
  paymentInfo: {},
  orderValue: {
    type: Number,
    required: true,
  },
  shippingInfo: {},
  shippingPrice: {
    type: Number,
    required: true,
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ORDER_STATUS,
    default: "Pending",
  },
  delivedAt: {
    type: Date,
  },
  orderItems: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  Consumer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

export const Order = mongoose.model("Order", orderSchema);