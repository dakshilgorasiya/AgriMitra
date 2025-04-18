import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import {
  ApiError as PayPalApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  LogLevel,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import axios from "axios";
import mongoose, { mongo } from "mongoose";
import { invoiceQueue } from "../jobs/invoiceQueue.js";

const createOrder = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }
  // get cart from database
  let cart = await Cart.aggregate([
    {
      $match: {
        owner: user._id,
      },
    },
    {
      $addFields: {
        ordererQuantity: {
          _id: "$products.product",
          quantityOrder: "$products.quantity",
        },
      },
    },
    {
      $unset: "products.quantity",
    },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "products",
        pipeline: [
          {
            $project: {
              description: 0,
              images: 0,
              reviews: 0,
            },
          },
        ],
      },
    },
  ]);

  cart = cart[0];

  // check if cart is empty
  if (!cart || cart?.products?.length === 0) {
    throw new ApiError(400, "Cart is empty", null);
  }

  // map product with ordererQuantity
  cart.products = cart.products.map((product) => {
    for (let i = 0; i < cart.ordererQuantity._id.length; i++) {
      if (product._id.toString() === cart.ordererQuantity._id[i].toString()) {
        product.orderedQuantity = cart.ordererQuantity.quantityOrder[i];
      }
    }
    return product;
  });

  // check if product is available in stock
  cart.products.forEach((product) => {
    if (product.orderedQuantity > product.quantity) {
      throw new ApiError(
        400,
        `${product.category}-${product.farmName} is out of stock`,
        null
      );
    }
  });

  // get address with product details and weight details of all products in cart
  const deliveryDetails = await Promise.all(
    cart.products.map(async (product) => {
      let pickupAddress = product.address;
      let weight = product.orderedQuantity * product.size + product.unitOfSize;
      let farmDetails = {
        farmName: product.farmName,
        farmer: await User.findById(product.farmer).select("name"),
      };

      return {
        pickupAddress,
        weight,
        farmDetails,
        orderItem: product.category,
      };
    })
  );

  // get price from delivery partner

  // TODO: call delivery partner API to get price and time of delivery
  const deliveryPrice = 100; // 500 is the delivery price per product

  // calculate total price
  let totalPrice = cart.products.reduce((acc, product) => {
    return acc + product.price * product.orderedQuantity;
  }, 0);
  totalPrice += deliveryPrice; // add delivery price to total price
  // console.log(products);

  const deliveryAddress = req.body;

  // create order in database
  const order = await Order.create({
    paymentInfo: undefined,
    shippingInfo: deliveryDetails.map((detail) => {
      detail.status = "pending";
      return detail;
    }),
    deliveryInfo: deliveryAddress,
    shippingPrice: totalPrice,
    orderStatus: "Pending",
    consumer: user._id,
    orderItems: cart.products.map((product) => {
      return {
        product: product._id,
        quantity: product.orderedQuantity,
      };
    }),
  });
  // console.log("order", order);

  // check if order is created successfully
  if (!order) {
    throw new ApiError(500, "Order not created", null);
  }

  // create payment link with razorpay
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CLIENT_ID,
      oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: {
        logBody: true,
      },
      logResponse: {
        logHeaders: true,
      },
    },
  });
  // console.log("perfect");
  const ordersController = new OrdersController(client);
  const apires = await axios.get(
    `http://anyapi.io/api/v1/exchange/convert?base=INR&to=USD&amount=${totalPrice}&apiKey=fb6tiqd9fjds6n92c50gefgam95aq8gn7rqh8mu73gqlc8sfkvq4o`
  );
  let totalPriceInUSD = apires.data.converted; // convert INR to USD
  let formattedNum = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPriceInUSD);
  const createOrder = async () => {
    const collect = {
      body: {
        intent: CheckoutPaymentIntent.CAPTURE,
        purchaseUnits: [
          {
            amount: {
              currencyCode: "USD",
              value: formattedNum,
            },
          },
        ],
      },
      prefer: "return=minimal",
    };

    try {
      const { body, ...httpResponse } = await ordersController.ordersCreate(
        collect
      );
      // Get more response info...
      // const { statusCode, headers } = httpResponse;
      return {
        jsonResponse: JSON.parse(body),
        httpStatusCode: httpResponse.statusCode,
      };
    } catch (error) {
      if (error instanceof PayPalApiError) {
        // const { statusCode, headers } = error;
        throw new Error(error.message);
      }
    }
  };

  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    const { jsonResponse, httpStatusCode } = await createOrder();
    jsonResponse.orderId = order._id; // add order id to response
    jsonResponse.deliveryFee = deliveryPrice; // add delivery fee to response
    jsonResponse.totalPrice = totalPrice; // add total price to response
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    // console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

const complteOrder = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  // get paypal order id from req body
  const { paypalOrderId } = req.body;

  // get order id from req body
  const { orderId } = req.body;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }

  // get order from database
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(400, "Order not found", null);
  }

  // check if order is already captured
  if (order.paymentInfo) {
    throw new ApiError(400, "Order already captured", null);
  }

  // capture payment from razorpay
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CLIENT_ID,
      oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: {
        logBody: true,
      },
      logResponse: {
        logHeaders: true,
      },
    },
  });

  const ordersController = new OrdersController(client);

  const captureOrder = async (orderID) => {
    const collect = {
      id: orderID,
      prefer: "return=minimal",
    };

    try {
      const { body, ...httpResponse } = await ordersController.ordersCapture(
        collect
      );
      // Get more response info...
      // const { statusCode, headers } = httpResponse;
      return {
        jsonResponse: JSON.parse(body),
        httpStatusCode: httpResponse.statusCode,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        // const { statusCode, headers } = error;
        throw new Error(error.message);
      }
    }
  };

  try {
    const { jsonResponse, httpStatusCode } = await captureOrder(paypalOrderId);
    // update order status in database

    // reduce quantity if products

    let cart = await Cart.findOne({ owner: user._id });

    if (cart)
      await Promise.all(
        cart.products.map(async (product) => {
          const productDetails = await Product.findById(product.product);
          if (productDetails) {
            productDetails.quantity -= product.quantity;
            await productDetails.save();
          }
        })
      );

    // remove cart from database
    await Cart.findByIdAndDelete(cart._id)

    order.paymentInfo = jsonResponse;
    order.orderStatus = "Confirmed";
    // TODO: call delivery partner API to confirm order and get tracking details
    order.shippingInfo = order.shippingInfo.map((detail) => ({
      ...detail,
      status: "confirmed",
      deliveryAddress: jsonResponse.purchase_units[0].shipping.address,
    }));
    await order.save();

    const OrderToBeSent = await getOrderByIdFunction(order._id);
    // console.log(OrderToBeSent);
    await invoiceQueue.add("send-invoice", {
      order: OrderToBeSent,
      user: {
        email: user.email,
        name: user.name,
      },
    });

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    order.orderStatus = "Cancelled";
    await order.save();
    // console.error("Failed to capture order:", error);
    // console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

const getOrderByIdFunction = async (id) => {
  try {
    let order = await Order.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "products",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "farmer",
                foreignField: "_id",
                as: "farmer",
                pipeline: [
                  {
                    $project: {
                      name: 1,
                      email: 1,
                      avatar: 1,
                      phone: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: "$farmer",
            },
            {
              $project: {
                category: 1,
                farmName: 1,
                farmer: 1,
                price: 1,
                unitOfSize: 1,
                size: 1,
                images: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          createdAt: 1,
          updatedAt: 1,
          orderStatus: 1,
          orderItems: 1,
          deliveryInfo: 1,
          products: 1,
          shippingPrice: 1,
        },
      },
    ]);

    order = order[0];

    if (!order) {
      throw new ApiError(400, "Order not found", null);
    }

    // map products and orderItems to get product details
    order?.orderItems?.forEach((item) => {
      order?.products?.forEach((product) => {
        if (item?.product?.toString() === product?._id?.toString()) {
          item.productDetails = product;
        }
      });
    });
    order.products = undefined;

    order.totalAmount = order?.orderItems?.reduce((acc, item) => {
      return acc + item.productDetails?.price * item?.quantity;
    }, 0);

    return order;
  } catch (error) {
    // console.error("Failed to get order by id:", error);
    throw new ApiError(500, "Failed to get order by id", null);
  }
};

const getOrderByFarmerId = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }

  // get order from database
  let orders = await Order.aggregate([
    {
      $match: {
        "shippingInfo.farmDetails.farmer._id": user._id,
      },
    },
    {
      $match: {
        orderStatus: {
          $ne: "Cancelled",
          // $ne: "Pending",
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "consumer",
        foreignField: "_id",
        as: "consumer",
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              phone: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$consumer",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "products",
        pipeline: [
          {
            $match: {
              farmer: user._id,
            },
          },
          {
            $project: {
              category: 1,
              price: 1,
              unitOfSize: 1,
              size: 1,
              quantity: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        orderStatus: 1,
        consumer: 1,
        orderItems: 1,
        products: 1,
      },
    },
  ]);

  // map products and orderItems to get product details
  orders?.map((order) => {
    order?.orderItems?.forEach((item) => {
      order?.products?.forEach((product) => {
        if (item?.product?.toString() === product?._id?.toString()) {
          item.productDetails = product;
        }
      });
    });
    order.products = undefined;
    return order;
  });

  // filter out orders with no products
  orders = orders.map((order) => {
    order.orderItems = order.orderItems.filter((item) => item.productDetails);
    return order;
  });

  orders?.map((order) => {
    order.totalAmount = order?.orderItems?.reduce((acc, item) => {
      return acc + item.productDetails?.price * item?.quantity;
    }, 0);

    order.orderItems = undefined;
  });

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "All orders by farmer",
      data: orders,
    })
  );
});

const getOrderByConsumerId = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }

  // get order from database
  const orders = await Order.aggregate([
    {
      $match: {
        consumer: user._id,
      },
    },
    {
      $match: {
        orderStatus: {
          $ne: "Cancelled",
          $ne: "Pending",
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "consumer",
        foreignField: "_id",
        as: "consumer",
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              phone: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$consumer",
    },
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "products",
        pipeline: [
          {
            $project: {
              category: 1,
              price: 1,
              unitOfSize: 1,
              size: 1,
              quantity: 1,
            },
          },
        ],
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        orderStatus: 1,
        orderItems: 1,
        products: 1,
      },
    },
  ]);

  // map products and orderItems to get product details
  orders?.map((order) => {
    order?.orderItems?.forEach((item) => {
      order?.products?.forEach((product) => {
        if (item?.product?.toString() === product?._id?.toString()) {
          item.productDetails = product;
        }
      });
    });
    order.products = undefined;
    return order;
  });

  orders?.map((order) => {
    order.totalAmount = order?.orderItems?.reduce((acc, item) => {
      return acc + item.productDetails?.price * item?.quantity;
    }, 0);

    order.orderItems = undefined;
  });

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "All orders by consumer",
      data: orders,
    })
  );
});

const getOrderById = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }

  // get order id from params
  const { id } = req.params;
  // get order from database
  let order = await Order.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "products",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "farmer",
              foreignField: "_id",
              as: "farmer",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    email: 1,
                    avatar: 1,
                    phone: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$farmer",
          },
          {
            $project: {
              category: 1,
              farmName: 1,
              farmer: 1,
              price: 1,
              unitOfSize: 1,
              size: 1,
              images: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        orderStatus: 1,
        orderItems: 1,
        deliveryInfo: 1,
        products: 1,
        shippingPrice: 1,
      },
    },
  ]);

  order = order[0];

  if (!order) {
    throw new ApiError(400, "Order not found", null);
  }

  // map products and orderItems to get product details
  order?.orderItems?.forEach((item) => {
    order?.products?.forEach((product) => {
      if (item?.product?.toString() === product?._id?.toString()) {
        item.productDetails = product;
      }
    });
  });
  order.products = undefined;

  order.totalAmount = order?.orderItems?.reduce((acc, item) => {
    return acc + item.productDetails?.price * item?.quantity;
  }, 0);

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Order details",
      data: order,
    })
  );
});

const getOrderByIdForFarmer = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }

  // get order id from params
  const { id } = req.params;

  // get order from database
  let order = await Order.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "products",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "farmer",
              foreignField: "_id",
              as: "farmer",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    email: 1,
                    avatar: 1,
                    phone: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$farmer",
          },
          {
            $project: {
              category: 1,
              farmName: 1,
              farmer: 1,
              price: 1,
              unitOfSize: 1,
              size: 1,
              images: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        orderStatus: 1,
        orderItems: 1,
        deliveryInfo: 1,
        products: 1,
        shippingPrice: 1,
      },
    },
  ]);

  order = order[0];

  if (!order) {
    throw new ApiError(400, "Order not found", null);
  }

  // map products and orderItems to get product details
  order?.orderItems?.forEach((item) => {
    order?.products?.forEach((product) => {
      if (item?.product?.toString() === product?._id?.toString()) {
        item.productDetails = product;
      }
    });
  });
  order.products = undefined;

  // remove products from order which do not belong to farmer
  order.orderItems = order?.orderItems?.filter((item) => {
    return item.productDetails.farmer._id.toString() === user._id.toString();
  });
  if (order?.orderItems?.length === 0) {
    throw new ApiError(400, "Order not found", null);
  }

  order.totalAmount = order?.orderItems?.reduce((acc, item) => {
    return acc + item.productDetails?.price * item?.quantity;
  }, 0);

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Order details",
      data: order,
    })
  );
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  // get user from req
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized", null);
  }

  // get order id from params
  const { orderId, status } = req.body;

  // get order from database
  let order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(400, "Order not found", null);
  }

  // check if user is farmer or consumer
  if (user.role !== "farmer") {
    throw new ApiError(401, "Unauthorized", null);
  }

  // update order status in database
  order.orderStatus = status;
  await order.save();

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Order status updated",
      data: order,
    })
  );
});

export {
  createOrder,
  complteOrder,
  getOrderByConsumerId,
  getOrderByFarmerId,
  getOrderById,
  getOrderByIdForFarmer,
  updateOrderStatus,
};
