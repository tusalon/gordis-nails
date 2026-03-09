// utils/config-negocio.js - DuniaNails
console.log('🏢 config-negocio.js cargado');

// ============================================
// 🔥 CONFIGURACIÓN DE DUNIANAILS
// ============================================
const NEGOCIO_ID_POR_DEFECTO = '0a418537-30d4-4939-863a-bf61c414185a'; // ID DE DUNIANAILS

window.NEGOCIO_ID_POR_DEFECTO = NEGOCIO_ID_POR_DEFECTO;

window.getNegocioId = function() {
    return NEGOCIO_ID_POR_DEFECTO;
};

window.getNegocioIdFromConfig = function() {
    return NEGOCIO_ID_POR_DEFECTO;
};

let configCache = null;
let ultimaActualizacion = 0;
const CACHE_DURATION = 2 * 60 * 1000;

function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId) {
        console.log('📌 Usando negocioId de localStorage:', localId);
        return localId;
    }
    console.log('📌 Usando negocioId por defecto:', NEGOCIO_ID_POR_DEFECTO);
    return NEGOCIO_ID_POR_DEFECTO;
}

window.cargarConfiguracionNegocio = async function(forceRefresh = false) {
    const negocioId = getNegocioId();
    if (!negocioId) {
        console.error('❌ No hay negocioId disponible');
        return null;
    }

    if (!forceRefresh && configCache && (Date.now() - ultimaActualizacion) < CACHE_DURATION) {
        console.log('📦 Usando cache de configuración');
        return configCache;
    }

    try {
        console.log('🌐 Cargando configuración del negocio desde Supabase...');
        console.log('📡 ID del negocio:', negocioId);
        
        const url = `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}&select=*`;
        
        const response = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            return null;
        }

        const data = await response.json();
        
        configCache = data[0] || null;
        ultimaActualizacion = Date.now();
        
        if (configCache) {
            console.log('✅ Configuración cargada:');
            console.log('   - Nombre:', configCache.nombre);
            console.log('   - Teléfono:', configCache.telefono);
            console.log('   - Email:', configCache.email);
            console.log('   - Instagram:', configCache.instagram);
            console.log('   - Logo:', configCache.logo_url);
            
            const localId = localStorage.getItem('negocioId');
            if (!localId) {
                console.log('💾 Guardando ID en localStorage');
                localStorage.setItem('negocioId', negocioId);
            }
        } else {
            console.log('⚠️ No se encontró configuración para el negocio');
        }
        
        return configCache;
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        return null;
    }
};

window.getNombreNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.nombre || 'DuniaNails';
};

window.getTelefonoDuenno = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.telefono || '59315976';
};

window.getEmailNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.email || '';
};

window.getInstagram = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.instagram || 'dunia_nails';
};

window.getFacebook = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.facebook || 'dunia.nails';
};

window.getHorarioAtencion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.horario_atencion || 'Lun-Vie 10:00-20:00, Sáb 10:00-18:00';
};

window.getMensajeBienvenida = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_bienvenida || '👋 Bienvenida a DuniaNails - Especialistas en uñas';
};

window.getMensajeConfirmacion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_confirmacion || '✅ Tu turno en DuniaNails ha sido reservado';
};

window.getNtfyTopic = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.ntfy_topic || 'dunia-nails-notifications';
};

window.negocioConfigurado = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.configurado || false;
};

setTimeout(async () => {
    console.log('🔄 Precargando configuración automática...');
    await window.cargarConfiguracionNegocio();
}, 500);

console.log('✅ config-negocio.js listo para DuniaNails');
console.log('🏷️  ID configurado:', NEGOCIO_ID_POR_DEFECTO);