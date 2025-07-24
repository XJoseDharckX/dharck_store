// Versión de la aplicación
const APP_VERSION = '3.3.9';
const LAST_UPDATED = new Date().toISOString();

// Función para comparar versiones (e.g., '3.3.8' > '3.3.7')
function isNewerVersion(current, server) {
    const currentParts = current.split('.').map(Number);
    const serverParts = server.split('.').map(Number);
    for (let i = 0; i < Math.max(currentParts.length, serverParts.length); i++) {
        const c = currentParts[i] || 0;
        const s = serverParts[i] || 0;
        if (s > c) return true;
        if (s < c) return false;
    }
    return false;
}

// Verificar si hay nueva versión
async function checkForUpdates() {
    try {
        // Fetch versión del servidor sin caché
        const response = await fetch('/version.js?nocache=' + new Date().getTime(), {
            cache: 'no-store'
        });
        const serverContent = await response.text();
        
        // Extraer versión del contenido
        const versionMatch = serverContent.match(/const APP_VERSION = '([\\d.]+)';/);
        const serverVersion = versionMatch ? versionMatch[1] : null;
        
        const currentVersion = localStorage.getItem('app_version') || APP_VERSION;
        
        if (serverVersion && isNewerVersion(currentVersion, serverVersion)) {
            localStorage.setItem('app_version', serverVersion);
            localStorage.removeItem('gameArticlesConfig'); // Limpiar caché local
            
            // Forzar reload automático para actualizar
            window.location.reload(true);
        }
    } catch (error) {
        console.error('Error verificando versión:', error);
    }
}

// Ejecutar verificación al cargar
checkForUpdates();