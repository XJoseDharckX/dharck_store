    # api/record_sale.py

    from flask import Flask, jsonify, request
    from flask_cors import CORS
    import os
    import json
    from datetime import datetime
    import logging
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    import base64 # Necesario para decodificar las credenciales base64

    # Inicializa Flask. En Vercel, 'app' es el punto de entrada que espera.
    app = Flask(__name__)

    # Configura el logger para ver los mensajes en los logs de Vercel
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    # Configura CORS. EN PRODUCCIÓN, CAMBIA '*' por el dominio real de tu frontend en Vercel.
    # Por ejemplo: CORS(app, resources={r"/*": {"origins": "https://tudominio.vercel.app"}})
    # Para desarrollo local (vercel dev), '*' puede ser útil inicialmente.
    CORS(app) 

    # --- Configuración de Google Sheets API (obtenida de Variables de Entorno de Vercel) ---
    # Las credenciales de la cuenta de servicio se pasan como una cadena base64 codificada.
    # ESTAS VARIABLES SE CONFIGURARÁN EN EL DASHBOARD DE VERCEL.
    GOOGLE_CREDS_BASE64 = os.environ.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64')
    # El ID de tu Google Sheet principal también viene de una variable de entorno.
    GOOGLE_SHEET_ID = os.environ.get('GOOGLE_SHEET_ID')

    # Alcances (scopes) necesarios para acceder a Google Sheets
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
    gc = None # Variable global para el cliente de gspread

    def authenticate_google_sheets():
        """
        Autentica la cuenta de servicio con Google Sheets API usando las credenciales de las variables de entorno.
        Esta función se ejecutará al inicio de la función serverless o cuando sea necesario.
        """
        global gc
        if not GOOGLE_CREDS_BASE64:
            logging.critical("Error: La variable de entorno GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64 no está configurada.")
            return

        try:
            # Decodifica la cadena base64 a bytes, luego a una cadena UTF-8, y finalmente a JSON
            creds_json_str = base64.b64decode(GOOGLE_CREDS_BASE64).decode('utf-8')
            creds_info = json.loads(creds_json_str)
            
            creds = ServiceAccountCredentials.from_json(creds_info, SCOPES)
            gc = gspread.authorize(creds)
            logging.info("Autenticación de Google Sheets exitosa desde variables de entorno.")
        except Exception as e:
            logging.critical(f"Error al autenticar Google Sheets desde variables de entorno: {e}", exc_info=True)
            gc = None

    # NO LLAMES authenticate_google_sheets() DIRECTAMENTE AQUÍ A NIVEL GLOBAL
    # Vercel no garantiza que el estado persista entre invocaciones.
    # La autenticación se intentará en cada request si 'gc' no está inicializado.

    @app.route('/api/record-sale', methods=['POST'])
    def record_sale():
        """
        Endpoint para registrar una venta en la hoja de Google del vendedor correspondiente.
        """
        # Asegura que la autenticación se intente si gc aún no está inicializado
        if gc is None:
            authenticate_google_sheets()
            if gc is None: # Si la autenticación falló incluso después de reintentarlo
                return jsonify({"error": "El servicio de Google Sheets no está disponible. Contacta al administrador. (Autenticación fallida)"}), 503

        if not GOOGLE_SHEET_ID:
            logging.error("GOOGLE_SHEET_ID no configurado en las variables de entorno de Vercel.")
            return jsonify({"error": "Configuración del ID de la hoja de Google faltante."}), 500

        try:
            data = request.get_json()
            if not data:
                logging.warning("Solicitud POST sin datos JSON en /api/record-sale.")
                return jsonify({"error": "Se requiere enviar datos JSON."}), 400

            seller_name = data.get('sellerName')
            if not seller_name:
                logging.warning("Nombre del vendedor no proporcionado en los datos de la venta.")
                return jsonify({"error": "Nombre del vendedor es requerido."}), 400

            # Prepara los datos de la venta para ser insertados en Google Sheets
            # El orden debe coincidir con los encabezados en tu Google Sheet (Parte 2.3)
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
                # Abrir la hoja de cálculo por su ID
                spreadsheet = gc.open_by_key(GOOGLE_SHEET_ID)
                logging.info(f"Hoja de cálculo '{GOOGLE_SHEET_ID}' abierta exitosamente.")
                
                # Seleccionar la hoja de trabajo (tab) del vendedor
                # EL NOMBRE DE ESTA PESTAÑA DEBE COINCIDIR EXACTAMENTE CON seller_name
                worksheet = spreadsheet.worksheet(seller_name)
                logging.info(f"Hoja de trabajo '{seller_name}' seleccionada exitosamente.")

                # Añadir la fila al final de la hoja de trabajo
                worksheet.append_row(sale_record_row)
                logging.info(f"Venta registrada exitosamente para {seller_name} en Google Sheet.")

            except gspread.exceptions.SpreadsheetNotFound:
                logging.error(f"Google Sheet con ID '{GOOGLE_SHEET_ID}' no encontrada. Asegúrate de que la ID sea correcta y la cuenta de servicio tenga acceso.")
                return jsonify({"error": f"La hoja de cálculo principal de Google no fue encontrada. Revisa la GOOGLE_SHEET_ID."}), 404
            except gspread.exceptions.WorksheetNotFound:
                logging.error(f"Hoja de trabajo (tab) '{seller_name}' no encontrada en la Google Sheet. Asegúrate de que exista una pestaña con ese nombre exacto.")
                return jsonify({"error": f"No se encontró una pestaña para el vendedor '{seller_name}' en la Google Sheet."}), 404
            except gspread.exceptions.APIError as api_err:
                logging.error(f"Error de API de Google Sheets: {api_err.response.text}")
                return jsonify({"error": f"Error en la API de Google Sheets: {api_err.response.text}"}), 500
            except Exception as e:
                logging.error(f"Error al escribir en Google Sheet: {e}", exc_info=True)
                return jsonify({"error": f"Error al registrar la venta en Google Sheets: {str(e)}"}), 500

            return jsonify({"message": "Venta registrada exitosamente en Google Sheets."}), 200

        except Exception as e:
            logging.error(f"Error general en el endpoint /api/record-sale: {e}", exc_info=True)
            return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

    # Esto es necesario para que Vercel encuentre la aplicación Flask
    # Aunque no se llama directamente aquí, Vercel lo importará.
    