    # api/exchange_rates.py

    from flask import Flask, jsonify, request
    from flask_cors import CORS
    import pandas as pd
    import os
    import json
    import logging
    # Aunque gspread y oauth2client no se usan en este archivo, se importan para
    # asegurar que estén disponibles en el entorno de ejecución de Vercel si fueran necesarios
    # en el futuro o para satisfacer las dependencias del requirements.txt.
    import gspread 
    from oauth2client.service_account import ServiceAccountCredentials 

    # Inicializa Flask
    app = Flask(__name__)

    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    # Configura CORS. En producción, CAMBIA '*' por el dominio real de tu frontend en Vercel.
    CORS(app) 

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

    # `app` es la instancia de Flask que Vercel espera como punto de entrada.
    