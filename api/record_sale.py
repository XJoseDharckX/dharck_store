# api/record_sale.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
from datetime import datetime
import logging
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import base64 # Necessary to decode base64 credentials

# Initialize Flask. In Vercel, 'app' is the expected entry point.
app = Flask(__name__)

# Configure the logger to view messages in Vercel logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configure CORS. IN PRODUCTION, CHANGE '*' to your frontend's real domain on Vercel.
# Example: CORS(app, resources={r"/*": {"origins": "https://yourdomain.vercel.app"}})
# For local development (vercel dev), '*' can be useful initially.
CORS(app) 

# --- Google Sheets API Configuration (obtained from Vercel Environment Variables) ---
# Service account credentials are passed as a base64 encoded string.
# THESE VARIABLES WILL BE CONFIGURED IN THE VERCEL DASHBOARD.
GOOGLE_CREDS_BASE64 = os.environ.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64')
# The ID of your main Google Sheet also comes from an environment variable.
GOOGLE_SHEET_ID = os.environ.get('GOOGLE_SHEET_ID')

# Scopes necessary to access Google Sheets
SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
gc = None # Global variable for the gspread client

def authenticate_google_sheets():
    """
    Authenticates the service account with the Google Sheets API using credentials from environment variables.
    This function will run at the start of the serverless function or when needed.
    """
    global gc
    if not GOOGLE_CREDS_BASE64:
        logging.critical("Error: The GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64 environment variable is not configured.")
        return

    try:
        # Decode the base64 string to bytes, then to a UTF-8 string, and finally to JSON
        creds_json_str = base64.b64decode(GOOGLE_CREDS_BASE64).decode('utf-8')
        creds_info = json.loads(creds_json_str)
        
        creds = ServiceAccountCredentials.from_json(creds_info, SCOPES)
        gc = gspread.authorize(creds)
        logging.info("Google Sheets authentication successful from environment variables.")
    except Exception as e:
        logging.critical(f"Error authenticating Google Sheets from environment variables: {e}", exc_info=True)
        gc = None

# DO NOT CALL authenticate_google_sheets() DIRECTLY HERE AT THE GLOBAL LEVEL
# In a serverless environment like Vercel, state does not persist between invocations.
# Authentication will be attempted on each request if 'gc' is not initialized,
# which is a common pattern for serverless functions.

@app.route('/api/record-sale', methods=['POST'])
def record_sale():
    """
    Endpoint to record a sale in the corresponding Google Sheet tab for the seller.
    """
    # Ensure authentication is attempted if gc is not yet initialized
    if gc is None:
        authenticate_google_sheets()
        if gc is None: # If authentication failed even after retrying
            return jsonify({"error": "The Google Sheets service is unavailable. Contact the administrator. (Authentication failed)"}), 503

    if not GOOGLE_SHEET_ID:
        logging.error("GOOGLE_SHEET_ID not configured in Vercel environment variables.")
        return jsonify({"error": "Google Sheet ID configuration missing."}), 500

    try:
        data = request.get_json()
        if not data:
            logging.warning("POST request without JSON data to /api/record-sale.")
            return jsonify({"error": "JSON data is required."}), 400

        seller_name = data.get('sellerName')
        if not seller_name:
            logging.warning("Seller name not provided in sale data.")
            return jsonify({"error": "Seller name is required."}), 400

        # Prepare sale data to be inserted into Google Sheets
        # The order MUST match the headers in your Google Sheet (Part 2.3 of the instructions)
        sale_record_row = [
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            seller_name,
            data.get('gameName'),
            data.get('itemLabel'),
            data.get('amountUSD'),
            data.get('totalPrice'),
            data.get('currencySymbol'),
            data.get('playerId'),
            data.get('playerName'),
            data.get('countryName')
        ]

        try:
            # Open the spreadsheet by its ID (obtained from the environment variable)
            spreadsheet = gc.open_by_key(GOOGLE_SHEET_ID)
            logging.info(f"Spreadsheet '{GOOGLE_SHEET_ID}' opened successfully.")
            
            # Select the seller's worksheet (tab)
            # THE NAME OF THIS TAB MUST EXACTLY MATCH the 'seller_name'
            worksheet = spreadsheet.worksheet(seller_name)
            logging.info(f"Worksheet '{seller_name}' selected successfully.")

            # Add the row to the end of the worksheet
            worksheet.append_row(sale_record_row)
            logging.info(f"Sale successfully recorded for {seller_name} in Google Sheet.")

        except gspread.exceptions.SpreadsheetNotFound:
            logging.error(f"Google Sheet with ID '{GOOGLE_SHEET_ID}' not found. Ensure the ID is correct and the service account has access.")
            return jsonify({"error": f"The main Google spreadsheet was not found. Check the GOOGLE_SHEET_ID in Vercel and permissions."}), 404
        except gspread.exceptions.WorksheetNotFound:
            logging.error(f"Worksheet (tab) '{seller_name}' not found in the Google Sheet. Ensure a tab with that EXACT name exists.")
            return jsonify({"error": f"No tab found for seller '{seller_name}' in the Google Sheet. Check tab names."}), 404
        except gspread.exceptions.APIError as api_err:
            logging.error(f"Google Sheets API error: {api_err.response.text}")
            # You can parse api_err.response.text for more specific messages if desired
            return jsonify({"error": f"Error in Google Sheets API: {api_err.response.text}. Check service account permissions."}), 500
        except Exception as e:
            logging.error(f"General error writing to Google Sheet: {e}", exc_info=True)
            return jsonify({"error": f"Error recording sale in Google Sheets: {str(e)}"}), 500

        return jsonify({"message": "Sale successfully recorded in Google Sheets."}), 200

    except Exception as e:
        logging.error(f"General error in /api/record-sale endpoint: {e}", exc_info=True)
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# `app` is the Flask instance that Vercel expects as an entry point.
