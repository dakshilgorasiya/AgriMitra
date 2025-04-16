import { Rating } from "@mui/material";

const ProductReviews = ({ review }) => {
  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50 w-full">
      <h2 className="text-2xl font-semibold mb-4">Customer Reviews</h2>
      {review.length > 0 ? (
        review?.map((review, index) => (
          <div
            key={index}
            className="border-b py-3 flex flex-col md:flex-row justify-between"
          >
            <div className="flex items-center space-x-2">
              <Rating value={review.rating} readOnly />
              <span className="text-gray-700 font-medium break-words md:truncate">
                {review.review}
              </span>
            </div>
            <div className="flex items-center mt-2 md:mt-0">
              <img
                src={review.profilePicture}
                alt={review.username}
                className="w-10 h-10 rounded-full mr-2"
              />
              <span className="text-gray-600">{review.username}</span>
              <span className="text-gray-500 text-sm ml-2">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500">No reviews yet.</p>
      )}
    </div>
  );
};

export default ProductReviews;
