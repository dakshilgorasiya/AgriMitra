from flask import Flask, request, jsonify
import numpy as np
import pickle
import logging
import os
import cv2
import tempfile
from werkzeug.utils import secure_filename
from tensorflow.keras.models import load_model
from flask_cors import CORS
from tensorflow.keras.preprocessing import image 
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Constants
RICE_MODEL_PATH = './Rice_classification_model/rice_model.h5'
RICE_LABEL_PATH = './Rice_classification_model/label_binarizer.pkl'
RICE_IMG_SIZE = (128, 128)

COTTON_MODEL_PATH = './Cotton_Leaf_Disease_prediction/cotton_model_final.h5'
COTTON_CLASS_LABELS = ['bacterial_blight', 'curl_virus', 'fussarium_wilt', 'healthy']
COTTON_IMG_SIZE = (128, 128)

MANGO_MODEL_PATH = './Mango_classification_model/mango_leaf_model.h5'
MANGO_CLASS_LABELS = [
    'Anthracnose',
    'Bacterial Canker',
    'Cutting Weevil',
    'Die Back',
    'Gall Midge',
    'Healthy',
    'Powdery Mildew',
    'Sooty Mould'
]
# Load all models and encoders
try:
    with open("./Crop_yield_prediction_model/random_forest_yield_model.pkl", "rb") as f:
        yield_model = pickle.load(f)

    with open("./Crop_yield_prediction_model/encoders.pkl", "rb") as f:
        yield_label_encoders = pickle.load(f)

    logger.info("Yield prediction model and encoders loaded successfully.")
    
    with open("./Soil_fertility_prediction_model/soil_model.pkl", "rb") as f:
        soil_model = pickle.load(f)

    with open("./Crop_recommendation_model/crop_recommendation_model.pkl", "rb") as f:
        crop_model = pickle.load(f)

    with open("./Fertilizer_prediction_model/fertilizer_recommendation_model.pkl", "rb") as f:
        fertilizer_model = pickle.load(f)
    with open("./Fertilizer_prediction_model/fertilizer_label_encoders.pkl", "rb") as f:
        label_encoders = pickle.load(f)

    rice_model = load_model(RICE_MODEL_PATH)
    with open(RICE_LABEL_PATH, "rb") as f:
        rice_labels = pickle.load(f)

    cotton_model = load_model(COTTON_MODEL_PATH)
    mango_model = load_model(MANGO_MODEL_PATH)  # Assuming same model for mango

    logger.info("All models and encoders loaded successfully.")
except Exception as e:
    logger.error(f"Error loading models: {e}")
    raise

# ======== SOIL FERTILITY PREDICTION ========
@app.route("/predict/soil", methods=["POST", "OPTIONS"])
def predict_soil():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json()
        if "features" not in data:
            return jsonify({"error": "Missing 'features' key in request"}), 400

        input_features = np.array(data["features"]).reshape(1, -1)
        prediction = soil_model.predict(input_features)
        return jsonify({"fertility": int(prediction[0])})
    except Exception as e:
        logger.error(f"Error in soil prediction: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# ======== CROP RECOMMENDATION ========
@app.route("/predict/crop", methods=["POST", "OPTIONS"])
def predict_crop():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json()
        if "features" not in data:
            return jsonify({"error": "Missing 'features' key in request"}), 400

        input_features = np.array(data["features"]).reshape(1, -1)
        prediction = crop_model.predict(input_features)
        return jsonify({"recommended_crop": prediction[0]})
    except Exception as e:
        logger.error(f"Error in crop prediction: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# ======== FERTILIZER PREDICTION ========
@app.route("/predict/fertilizer", methods=["POST", "OPTIONS"])
def predict_fertilizer():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json()
        features = data.get("features", [])
        if len(features) != 8:
            return jsonify({"error": "Invalid input: 'features' must be an array of length 8"}), 400

        try:
            soil_type_encoded = label_encoders["soil_type"][features[3]]
            crop_type_encoded = label_encoders["crop_type"][features[4]]
        except KeyError as e:
            return jsonify({"error": f"Invalid value for {str(e)}"}), 400

        input_features = np.array([
            float(features[0]), float(features[1]), float(features[2]),
            soil_type_encoded, crop_type_encoded,
            float(features[5]), float(features[6]), float(features[7])
        ]).reshape(1, -1)

        prediction = fertilizer_model.predict(input_features)
        return jsonify({"recommended_fertilizer": prediction[0]})
    except Exception as e:
        logger.error(f"Error in fertilizer prediction: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ======== RICE CLASSIFICATION ========
@app.route("/predict/rice", methods=["POST", "OPTIONS"])
def predict_rice():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    temp_file_path = None
    
    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({'error': 'No image file in request'}), 400
        
        file = request.files['image']
        
        # If user does not select file, browser might send empty file
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        # Save uploaded file to temporary location
        filename = secure_filename(file.filename)
        temp_file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_file_path)
        
        logger.info(f"Saved uploaded image for rice prediction to: {temp_file_path}")
        
        # Process the image
        image = cv2.imread(temp_file_path)
        if image is None:
            logger.error(f"cv2 failed to read image at: {temp_file_path}")
            return jsonify({'error': 'Failed to read image using OpenCV'}), 400

        image = cv2.resize(image, RICE_IMG_SIZE)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = image.astype('float32') / 255.0
        image = np.expand_dims(image, axis=0)

        prediction = rice_model.predict(image)
        predicted_class = rice_labels[np.argmax(prediction)]
        confidence = float(np.max(prediction))

        return jsonify({
            'predicted_class': predicted_class,
            'confidence': confidence
        })

    except Exception as e:
        logger.error(f"Error in rice prediction: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Clean up: Delete the temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Deleted temporary image after processing: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary image: {temp_file_path} - {e}")


# ======== COTTON DISEASE PREDICTION ========
@app.route("/predict/cotton", methods=["POST", "OPTIONS"])
def predict_cotton():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    temp_file_path = None
    
    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({'error': 'No image file in request'}), 400
        
        file = request.files['image']
        
        # If user does not select file, browser might send empty file
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        # Save uploaded file to temporary location
        filename = secure_filename(file.filename)
        temp_file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_file_path)
        
        logger.info(f"Saved uploaded image for cotton prediction to: {temp_file_path}")
        
        # Process the image
        image = cv2.imread(temp_file_path)
        if image is None:
            logger.error(f"cv2 failed to read image at: {temp_file_path}")
            return jsonify({'error': 'Failed to read image using OpenCV'}), 400

        image = cv2.resize(image, COTTON_IMG_SIZE)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = image.astype('float32') / 255.0
        image = np.expand_dims(image, axis=0)

        prediction = cotton_model.predict(image)
        predicted_class = COTTON_CLASS_LABELS[np.argmax(prediction)]
        confidence = float(np.max(prediction))

        return jsonify({
            'predicted_class': predicted_class,
            'confidence': confidence
        })

    except Exception as e:
        logger.error(f"Error in cotton prediction: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Clean up: Delete the temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Deleted temporary image after processing: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary image: {temp_file_path} - {e}")

# Keep existing crop yield prediction API route unchanged...
@app.route("/predict/mango", methods=["POST", "OPTIONS"])
def predict_mango():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    temp_file_path = None


    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        filename = secure_filename(file.filename)
        temp_file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_file_path)
    
        logger.info(f"Saved uploaded image for cotton prediction to: {temp_file_path}")

    # Load image and preprocess
        img = image.load_img(temp_file_path, target_size=(128, 128))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0  # normalize

    # Predict
        predictions = mango_model.predict(img_array)
        class_index = np.argmax(predictions)
        result = MANGO_CLASS_LABELS[class_index]
        confidence = float(np.max(predictions))    
        return jsonify({
                'predicted_class': result,   
                'confidence': f'{confidence * 100:.2f}%'
            })
        

    except Exception as e:
        logger.exception("An error occurred during mango prediction.")
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

    finally:
        # Optionally clean up the temp file
         # Clean up: Delete the temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Deleted temporary image after processing: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temporary image: {temp_file_path} - {e}")

    
    
    

# ======== CROP YIELD PREDICTION ========
@app.route("/predict/yield", methods=["POST", "OPTIONS"])
def predict_yield():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Missing input data"}), 400

        input_df = pd.DataFrame([data])

        # Encode categorical columns
        for col in ["Soil_Type", "Crop", "Weather_Condition"]:
            if col in input_df.columns:
                le = yield_label_encoders[col]
                input_df[col] = le.transform([input_df[col].iloc[0]])

        # Convert booleans
        input_df["Fertilizer_Used"] = int(input_df["Fertilizer_Used"].iloc[0])
        input_df["Irrigation_Used"] = int(input_df["Irrigation_Used"].iloc[0])

        # Reorder columns to match training data
        ordered_columns = [
            "Soil_Type", "Crop", "Rainfall_mm", "Temperature_Celsius",
            "Fertilizer_Used", "Irrigation_Used", "Weather_Condition", "Days_to_Harvest"
        ]
        input_df = input_df[ordered_columns]

        # Predict
        prediction = yield_model.predict(input_df)[0]

        return jsonify({"predicted_yield_tons_per_hectare": round(prediction, 3)})

    except Exception as e:
        logger.error(f"Error in yield prediction: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ======== RUN APP ========
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000,debug=True)