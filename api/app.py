# Instala estas librerías en tu entorno de Vercel (deberán estar en tu requirements.txt):
# Flask
# pandas
# openpyxl
# Flask-Cors
# gspread
# oauth2client

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import logging
import gspread # Para interactuar con Google Sheets
from oauth2client.service_account import ServiceAccountCredentials # Para la autenticación
import base64 # Necesario para decodificar las credenciales base64

# Inicializa Flask. En Vercel, 'app' es el punto de entrada que espera.
app = Flask(__name__)

# Configura el logger para ver los mensajes en los logs de Vercel
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configura CORS. EN PRODUCCIÓN, ¡CAMBIA '*' por el dominio real de tu frontend en Vercel!
# Por ejemplo: CORS(app, resources={r"/*": {"origins": "https://tudominio.vercel.app"}})
# Para desarrollo local (vercel dev), '*' puede ser útil inicialmente.
CORS(app) 

# --- Configuración de Google Sheets API (obtenida de Variables de Entorno de Vercel) ---
# Las credenciales de la cuenta de servicio se pasan como una cadena base64 codificada.
# ESTAS VARIABLES SE CONFIGURARÁN EN EL DASHBOARD DE VERCEL (Parte 3.2 de las instrucciones).
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
# En un entorno serverless como Vercel, el estado no persiste entre invocaciones.
# La autenticación se intentará en cada request si 'gc' no está inicializado,
# lo cual es un patrón común para funciones serverless.

# --- Configuración del archivo Excel local (para tasas de cambio) ---
# En Vercel, la ruta se construye para apuntar al archivo `tasas_de_cambio.xlsx`
# dentro de la carpeta `data` que está en la raíz del proyecto.
# os.path.dirname(__file__) -> /var/task/api
# os.path.dirname(os.path.dirname(__file__)) -> /var/task/
# os.path.join(...) -> /var/task/data/tasas_de_cambio.xlsx
EXCEL_RATES_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'tasas_de_cambio.xlsx')

@app.route('/api/exchange-rates', methods=['GET'])
def get_exchange_rates():
    """
    Endpoint para obtener las tasas de cambio desde un archivo Excel local.
    Este endpoint ahora también tiene un fallback de datos si el archivo Excel no se encuentra
    durante el despliegue en Vercel.
    """
    try:
        if not os.path.exists(EXCEL_RATES_FILE_PATH):
            logging.error(f"Archivo de tasas de cambio no encontrado: {EXCEL_RATES_FILE_PATH}")
            # Fallback a datos de ejemplo si el archivo no se encuentra
            country_data_fallback = [
                {
                    "name": "VENEZUELA", "code": "VES", "exchangeRate": 137, "symbol": "Bs.",
                    "paymentMethods": [
                        {"name": "Pago Móvil", "details": "C.I.: V-32147818, Teléfono: 04126027407, Banco: 0105 (Banco Mercantil)"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "COLOMBIA", "code": "COP", "exchangeRate": 4300, "symbol": "COP",
                    "paymentMethods": [
                        {"name": "Nequi", "details": "Número: 3012660676 Nombre:Ali."},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "PERU", "code": "PEN", "exchangeRate": 3.9, "symbol": "S/.",
                    "paymentMethods": [
                        {"name": "BCP", "details": "Cuenta: 38097062947042, Titular: Yoshimara"},
                        {"name": "Yape", "details": "Número: 974610375"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "MEXICO", "code": "MXN", "exchangeRate": 20.1, "symbol": "MXN",
                    "paymentMethods": [
                        {"name": "SPIN BY OXXO", "details": "TARJETA: 4217 4701 8364 0099"},
                        {"name": "BANCO AZTECA", "details": "INTERBANCARIA: 1277 9700 1467 5859 00"},
                        {"name": "Titular", "details": "Jesus Carrillo"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "ESTADOS UNIDOS", "code": "USD", "exchangeRate": 1.05, "symbol": "$",
                    "paymentMethods": [
                        {"name": "Zelle", "details": "+1 (661) 736 - 0564, Nombre: Jannett Martinez Lopez"},
                        {"name": "Titular", "details": "Jannett Martinez Lopez"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "ARGENTINA", "code": "ARS", "exchangeRate": 1260, "symbol": "$",
                    "paymentMethods": [
                        {"name": "Mercado pago", "details": "0000003100069089540216"},
                        {"name": "UALA", "details": "3840200500000000199867"},
                        {"name": "Titular", "details": "Pamela Schneider"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "ECUADOR", "code": "USD", "exchangeRate": 1.06, "symbol": "$",
                    "paymentMethods": [
                        {"name": "Banco Pichincha", "details": "Cta. ahorros 2204277346"},
                        {"name": "Banco de Guayaquil", "details": "Cta. ahorros 0039924590"},
                        {"name": "Titular", "details": "María de los Ángeles Ronquillo León. CI: 0941414203"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "CHILE", "code": "CLP", "exchangeRate": 1010, "symbol": "$",
                    "paymentMethods": [
                        {"name": "BANCO FALABELLA", "details": "RUT: 17244216-1 / gi553ll30@gmail.com / Cta Corriente: 1-983-036407-8"},
                        {"name": "BANCO ESTADO", "details": "RUT: 17244216-1 / Cta Corriente: 37100135052 / 300 PESOS EXTRAS AL VALOR TOTAL"},
                        {"name": "Titular", "details": "GISSELLE GONZALEZ"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "ESPAÑA", "code": "EUR", "exchangeRate": 1.03, "symbol": "€",
                    "paymentMethods": [
                        {"name": "BIZUM", "details": "612237372 / 614153840 / CUALQUIERA DE LOS DOS"},
                        {"name": "BANCO SANTANDER", "details": "Cuenta bancaria : ES0800495939582916425258"},
                        {"name": "Titular", "details": "MAX FRANCIS SILVA RAMOS"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "COSTA RICA", "code": "CRC", "exchangeRate": 600, "symbol": "₡",
                    "paymentMethods": [
                        {"name": "SIMPE", "details": "63223852"},
                        {"name": "Titular", "details": "Solange Granja Duarte"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                    ]
                },
                {
                    "name": "BOLIVIA", "code": "BOB", "exchangeRate": 16.9, "symbol": "Bs.",
                    "paymentMethods": [
                        {"name": "SIMPE", "details": "63223852"},
                        {"name": "Titular", "details": "Solange Granja Duarte"},
                        {"name": "¡IMPORTANTE!", "details": "¡No colocar conceptos EN LOS PAGOS!"}
                        ]
                }
            ]
            return jsonify(country_data_fallback)
            
        df = pd.read_excel(EXCEL_RATES_FILE_PATH, engine='openpyxl')
        rates = df.to_dict(orient='records')

        # Asegura que los paymentMethods se parseen si están como string JSON en el Excel
        for rate in rates:
            if 'paymentMethods' in rate and isinstance(rate['paymentMethods'], str):
                try:
                    rate['paymentMethods'] = json.loads(rate['paymentMethods'])
                except json.JSONDecodeError:
                    logging.warning(f"Error al decodificar JSON en paymentMethods para {rate.get('name')}: {rate['paymentMethods']}")
                    rate['paymentMethods'] = [] 

        logging.info("Tasas de cambio cargadas exitosamente desde Excel local en serverless function.")
        return jsonify(rates)

    except Exception as e:
        logging.error(f"Error al obtener las tasas de cambio: {e}")
        return jsonify({"error": f"Error interno del servidor al cargar tasas de cambio: {str(e)}"}), 500

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
        # El orden DEBE coincidir con los encabezados en tu Google Sheet (Parte 2.3 de las instrucciones)
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
            # Abrir la hoja de cálculo por su ID (obtenida de la variable de entorno)
            spreadsheet = gc.open_by_key(GOOGLE_SHEET_ID)
            logging.info(f"Hoja de cálculo '{GOOGLE_SHEET_ID}' abierta exitosamente.")
            
            # Seleccionar la hoja de trabajo (pestaña) del vendedor
            # EL NOMBRE DE ESTA PESTAÑA DEBE COINCIDIR EXACTAMENTE CON el 'seller_name'
            worksheet = spreadsheet.worksheet(seller_name)
            logging.info(f"Hoja de trabajo '{seller_name}' seleccionada exitosamente.")

            # Añadir la fila al final de la hoja de trabajo
            worksheet.append_row(sale_record_row)
            logging.info(f"Venta registrada exitosamente para {seller_name} en Google Sheet.")

        except gspread.exceptions.SpreadsheetNotFound:
            logging.error(f"Google Sheet con ID '{GOOGLE_SHEET_ID}' no encontrada. Asegúrate de que la ID sea correcta y la cuenta de servicio tenga acceso.")
            return jsonify({"error": f"La hoja de cálculo principal de Google no fue encontrada. Revisa la GOOGLE_SHEET_ID en Vercel y los permisos."}), 404
        except gspread.exceptions.WorksheetNotFound:
            logging.error(f"Hoja de trabajo (tab) '{seller_name}' no encontrada en la Google Sheet. Asegúrate de que exista una pestaña con ese nombre EXACTO.")
            return jsonify({"error": f"No se encontró una pestaña para el vendedor '{seller_name}' en la Google Sheet. Revisa los nombres de las pestañas."}), 404
        except gspread.exceptions.APIError as api_err:
            logging.error(f"Error de API de Google Sheets: {api_err.response.text}")
            # Puedes parsear api_err.response.text para mensajes más específicos si lo deseas
            return jsonify({"error": f"Error en la API de Google Sheets: {api_err.response.text}. Revisa los permisos de la cuenta de servicio."}), 500
        except Exception as e:
            logging.error(f"Error general al escribir en Google Sheet: {e}", exc_info=True)
            return jsonify({"error": f"Error al registrar la venta en Google Sheets: {str(e)}"}), 500

        return jsonify({"message": "Venta registrada exitosamente en Google Sheets."}), 200

    except Exception as e:
        logging.error(f"Error general en el endpoint /api/record-sale: {e}", exc_info=True)
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

if __name__ == '__main__':
    # Esta sección se ejecuta solo si corres el script directamente (por ejemplo, para pruebas locales).
    # En Vercel, el servidor web se encargará de ejecutar tu aplicación Flask.
    # No es necesario ejecutar `app.run()` en el entorno de producción de Vercel.
    app.run(host='0.0.0.0', port=5000, debug=True)
