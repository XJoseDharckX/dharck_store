var Service = require('node-windows').Service;

// Crear un nuevo objeto de servicio
var svc = new Service({
  name: 'WhatsApp Bot Service',
  description: 'Bot de WhatsApp para notificaciones de pedidos',
  script: 'C:\\ruta\\a\\tu\\whatsapp-sheet-bot\\index.js'
});

// Escuchar el evento "install"
svc.on('install', function(){
  svc.start();
});

// Instalar el servicio
svc.install();