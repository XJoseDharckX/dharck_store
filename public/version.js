// Versión de la aplicación
const APP_VERSION = '3.2.4';
const LAST_UPDATED = new Date().toISOString();

// Verificar si hay nueva versión
function checkForUpdates() {
    const currentVersion = localStorage.getItem('app_version');
    
    if (currentVersion !== APP_VERSION) {
        localStorage.setItem('app_version', APP_VERSION);
        localStorage.removeItem('gameArticlesConfig'); // Limpiar caché local
        
        if (currentVersion) {
            console.log(`Actualizado de v${currentVersion} a v${APP_VERSION}`);
            // Forzar recarga de configuración
            if (typeof loadArticlesConfig === 'function') {
                loadArticlesConfig();
            }
        }
    }
}

// Ejecutar verificación al cargar
checkForUpdates();