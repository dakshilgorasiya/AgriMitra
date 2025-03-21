import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Rating } from "../models/ratings.model.js";
import { Product } from "../models/product.model.js";

const createRating = asyncHandler(async (req, res) => {
    const { rating, review, productId } = req.body;

    if (!rating || !review || !productId) {
        throw new ApiError(400, "Rating, review, and productId are required");
    }

    if(!Number.isInteger(rating))
    {
        throw new ApiError(400, "Rating must be an integer");
    }

    if (rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5");
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const newRating = new Rating({
        rating,
        review,
        userId: req.user._id,
        productId,
    });

    await newRating.save();

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

    const ratings = await Rating.find({ productId });

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
                ratings,
                averageRating: parseFloat(averageRating),
                totalRatings,
                ratingCounts, // Include rating breakdown
            },
            message: "Ratings retrieved successfully",
        })
    );
});

export { createRating, getRatings };


// const getRatings = asyncHandler(async (req, res) => {
//     const { productId } = req.params;

//     if (!productId) {
//         throw new ApiError(400, "Product ID is required");
//     }

//     const ratings = await Rating.find({ productId });

//     return res.status(200).json(
//         new ApiResponse({
//             statusCode: 200,
//             data: ratings,
//             message: "Ratings retrieved successfully",
//         })
//     );
// });





// const getRatings = asyncHandler(async (req, res) => {
//     const { productId } = req.params;

//     if (!productId) {
//         throw new ApiError(400, "Product ID is required");
//     }

//     const ratings = await Rating.find({ productId });

//     let totalRating = 0;
//     let totalRatings = ratings.length;

//     ratings.forEach((rating) => {
//         totalRating += rating.rating;
//     });

//     const averageRating = totalRatings > 0 ? (totalRating / totalRatings).toFixed(1) : "0.0";

//     return res.status(200).json(
//         new ApiResponse({
//             statusCode: 200,
//             data: { ratings, averageRating: parseFloat(averageRating), totalRatings },
//             message: "Ratings retrieved successfully",
//         })
//     );
// });