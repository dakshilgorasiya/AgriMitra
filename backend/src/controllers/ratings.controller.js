import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Rating } from "../models/ratings.model.js";
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";

const createRating = asyncHandler(async (req, res) => {
    const { rating, review, productId } = req.body;

    if (!rating || !review || !productId) {
        throw new ApiError(400, "Rating, review, and productId are required");
    }

    if (!Number.isInteger(rating)) {
        throw new ApiError(400, "Rating must be an integer");
    }

    if (rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5");
    }
    const isReviewed = await Rating.findOne({ userId: req.user._id, productId });
    let newRating = null;
    if (isReviewed) {
        newRating = await Rating.findByIdAndUpdate(isReviewed._id, { rating, review });
    } else {
        const product = await Product.findById(productId);

        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        newRating = new Rating({
            rating,
            review,
            userId: req.user._id,
            productId,
        });

        await newRating.save();

    }
    return res.status(201).json(
        new ApiResponse({
            statusCode: 201,
            data: newRating,
            message: "Rating created successfully",
        })
    );
});

const getRatings = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        throw new ApiError(400, "Product ID is required");
    }

    const objectIdProductId = new mongoose.Types.ObjectId(productId);

    const ratings = await Rating.aggregate([
        {
            $match: {
                productId: objectIdProductId, // Match the ObjectId
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
            }
        }, {
            $unwind: "$user"
        }, {
            $project: {
                _id: 1,
                rating: 1,
                review: 1,
                createdAt: 1,
                updatedAt: 1,
                userId: "$user._id",
                username: "$user.name",
                profilePicture: "$user.avatar",
            }
        }
    ]);



    if (ratings.length === 0) {
        throw new ApiError(404, "No ratings awailable for this product");
    }

    let totalRating = 0;
    let totalRatings = ratings.length;

    // Initialize count for each rating (1-star to 5-star)
    let ratingCounts = {
        "1-star": 0,
        "2-star": 0,
        "3-star": 0,
        "4-star": 0,
        "5-star": 0,
    };

    ratings.forEach((rating) => {
        totalRating += rating.rating;

        // Count occurrences of each rating (1 to 5)
        if (rating.rating >= 1 && rating.rating <= 5) {
            ratingCounts[`${rating.rating}-star`] += 1;
        }
    });

    const averageRating = totalRatings > 0 ? (totalRating / totalRatings).toFixed(1) : "0.0";

    return res.status(200).json(
        new ApiResponse({
            statusCode: 200,
            data: {
                ratings: ratings.map(({ userId, ...rest }) => ({
                    user: userId, // Rename `userId` to `user`
                    ...rest
                })),
                averageRating: parseFloat(averageRating),
                totalRatings,
                ratingCounts, // Include rating breakdown
            },
            message: "Ratings retrieved successfully",
        })
    );
});

export { createRating, getRatings };