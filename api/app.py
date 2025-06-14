# Instala estas librerías en tu entorno de Vercel (requirements.txt):
# Flask
# pandas
# openpyxl
# Flask-Cors

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import logging

app = Flask(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configura CORS. En producción, ¡CAMBIA '*' por el dominio de tu frontend!
# Por ejemplo: CORS(app, resources={r"/*": {"origins": "https://tudominio.vercel.app"}})
CORS(app) 

# Ruta base para los archivos Excel de ventas.
# En Vercel, este directorio se creará en el entorno de tu función serverless.
EXCEL_SALES_DIR = os.path.join(os.path.dirname(__file__), 'ventas_excel')

# Ruta para el archivo Excel de tasas de cambio
# Este archivo DEBE estar en la carpeta 'data/' dentro de tu proyecto.
# os.path.dirname(__file__) -> api/
# os.path.dirname(os.path.dirname(__file__)) -> raíz del proyecto
EXCEL_RATES_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'tasas_de_cambio.xlsx')

@app.route('/api/exchange-rates', methods=['GET'])
def get_exchange_rates():
    """
    Endpoint para obtener las tasas de cambio desde un archivo Excel local.
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

        logging.info("Tasas de cambio cargadas exitosamente desde Excel local.")
        return jsonify(rates)

    except FileNotFoundError:
        return jsonify({"error": "Archivo de tasas de cambio (tasas_de_cambio.xlsx) no encontrado."}), 404
    except pd.errors.EmptyDataError:
        return jsonify({"error": "El archivo de Excel de tasas de cambio está vacío o no tiene datos."}), 500
    except Exception as e:
        logging.error(f"Error al obtener las tasas de cambio: {e}")
        return jsonify({"error": f"Error interno del servidor al cargar tasas de cambio: {str(e)}"}), 500


@app.route('/api/record-sale', methods=['POST'])
def record_sale():
    """
    Endpoint para registrar una venta en el archivo Excel del vendedor correspondiente.
    Recibe los datos del pedido en formato JSON.
    """
    try:
        data = request.get_json()
        if not data:
            logging.warning("Solicitud POST sin datos JSON en /api/record-sale.")
            return jsonify({"error": "Se requiere enviar datos JSON."}), 400

        seller_name = data.get('sellerName')
        if not seller_name:
            logging.warning("Nombre del vendedor no proporcionado en los datos de la venta.")
            return jsonify({"error": "Nombre del vendedor es requerido."}), 400

        # Generar el nombre del archivo Excel para el vendedor
        excel_filename = f"Ventas {seller_name}.xlsx"
        excel_filepath = os.path.join(EXCEL_SALES_DIR, excel_filename)

        # Crear el directorio si no existe (importante para el entorno de Vercel)
        os.makedirs(EXCEL_SALES_DIR, exist_ok=True)

        # Preparar los datos de la venta
        sale_record = {
            'Fecha_Hora': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Vendedor': seller_name,
            'Juego': data.get('gameName'),
            'Articulo_Label': data.get('itemLabel'),
            'Monto_USD': data.get('amountUSD'),
            'Total_Pagado': data.get('totalPrice'),
            'Moneda': data.get('currencySymbol'),
            'ID_Jugador': data.get('playerId'),
            'Nombre_Jugador': data.get('playerName'),
            'Pais': data.get('countryName') # Se reintroduce el campo País
        }

        # Verificar si el archivo Excel existe
        if os.path.exists(excel_filepath):
            try:
                df = pd.read_excel(excel_filepath, engine='openpyxl')
                # Concatenar el nuevo registro. Usamos pd.DataFrame con un solo registro
                new_row_df = pd.DataFrame([sale_record])
                df = pd.concat([df, new_row_df], ignore_index=True)
                df.to_excel(excel_filepath, index=False, engine='openpyxl')
                logging.info(f"Venta registrada exitosamente para {seller_name} en {excel_filepath}")
            except Exception as e:
                logging.error(f"Error al actualizar el archivo Excel existente {excel_filepath}: {e}")
                return jsonify({"error": f"Error al actualizar el registro de ventas: {str(e)}"}), 500
        else:
            # Si el archivo no existe, crear uno nuevo con la fila actual
            try:
                df = pd.DataFrame([sale_record])
                df.to_excel(excel_filepath, index=False, engine='openpyxl')
                logging.info(f"Nuevo archivo de ventas creado para {seller_name}: {excel_filepath}")
            except Exception as e:
                logging.error(f"Error al crear un nuevo archivo Excel {excel_filepath}: {e}")
                return jsonify({"error": f"Error al crear el registro de ventas: {str(e)}"}), 500

        return jsonify({"message": "Venta registrada exitosamente."}), 200

    except Exception as e:
        logging.error(f"Error en el endpoint /api/record-sale: {e}", exc_info=True)
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

if __name__ == '__main__':
    # --- CONSIDERACIONES PARA DESPLIEGUE EN PRODUCCIÓN ---
    # La línea `app.run(host='0.0.0.0', port=5000, debug=True)` es IDEAL SOLO PARA DESARROLLO.
    # En un entorno de producción (como un VPS de Contabo), NO debes usar app.run() directamente.
    # Necesitas un servidor WSGI (Web Server Gateway Interface) como Gunicorn o uWSGI
    # para servir la aplicación de manera robusta y eficiente, y luego un proxy inverso
    # como Nginx para manejar las solicitudes web, SSL, y balanceo de carga.

    # Pasos conceptuales para producción:
    # 1. Instalar Gunicorn:
    #    pip install gunicorn
    # 2. Ejecutar Gunicorn (NO dentro de este script, sino desde la terminal de tu VPS):
    #    gunicorn --workers 4 --bind 0.0.0.0:5000 app:app
    #    - `--workers 4`: Número de procesos de Gunicorn (ajusta según los núcleos de tu CPU).
    #    - `--bind 0.0.0.0:5000`: Escucha en todas las interfaces en el puerto 5000.
    #    - `app:app`: Indica a Gunicorn que encuentre la instancia de Flask llamada 'app'
    #                 dentro del módulo 'app.py' (este archivo).
    #    Para mantener Gunicorn corriendo en segundo plano, se recomienda usar un sistema
    #    de inicio como `systemd`.

    # 3. Configurar Nginx como Proxy Inverso:
    #    Nginx escuchará las solicitudes HTTP/HTTPS de tus usuarios y las reenviará a Gunicorn.
    #    Esto permite servir tu frontend estático y tu backend Flask bajo el mismo dominio
    #    (o subdominios) y manejar SSL.
    #    Ejemplo de configuración de Nginx (en /etc/nginx/sites-available/tudominio.conf):
    #    server {
    #        listen 80;
    #        server_name tudominio.com www.tudominio.com; # Tu dominio real

    #        location /api/exchange-rates {
    #            proxy_pass http://127.0.0.1:5000; # Reenvía a Gunicorn
    #            proxy_set_header Host $host;
    #            proxy_set_header X-Real-IP $remote_addr;
    #            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #            proxy_set_header X-Forwarded-Proto $scheme;
    #        }

    #        location /api/record-sale {
    #            proxy_pass http://127.0.0.1:5000; # Reenvía a Gunicorn
    #            proxy_set_header Host $host;
    #            proxy_set_header X-Real-IP $remote_addr;
    #            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #            proxy_set_header X-Forwarded-Proto $scheme;
    #        }

    #        # Sirve tu frontend estático
    #        location / {
    #            root /var/www/html/dharck-store; # Ruta a tus archivos HTML, CSS, JS, Imagenes
    #            try_files $uri $uri/ =404;
    #        }
    #    }
    #    Luego de configurar Nginx:
    #    sudo nginx -t           # Probar la configuración
    #    sudo systemctl restart nginx # Reiniciar Nginx

    # 4. Configurar `systemd` para Gunicorn (opcional, pero MUY RECOMENDADO):
    #    Crea un archivo de servicio systemd (ej. `/etc/systemd/system/dharckstore.service`)
    #    [Unit]
    #    Description=Gunicorn instance for Dharck Store Flask app
    #    After=network.target

    #    [Service]
    #    User=tu_usuario_linux # El usuario bajo el que correrá Gunicorn
    #    Group=www-data      # O un grupo adecuado
    #    WorkingDirectory=/path/to/your/flask/app # El directorio donde está app.py
    #    ExecStart=/usr/local/bin/gunicorn --workers 4 --bind 0.0.0.0:5000 app:app
    #    Restart=always
    #    [Install]
    #    WantedBy=multi-user.target
    #    Luego:
    #    sudo systemctl daemon-reload
    #    sudo systemctl start dharckstore
    #    sudo systemctl enable dharckstore # Para que inicie con el sistema
    #    sudo systemctl status dharckstore # Para verificar el estado

    # En resumen, la línea `app.run` no debe ser usada en producción porque carece de
    # características como la gestión de procesos, reinicio automático, rendimiento
    # y seguridad que Gunicorn y Nginx proporcionan.
    app.run(host='0.0.0.0', port=5000, debug=True)
