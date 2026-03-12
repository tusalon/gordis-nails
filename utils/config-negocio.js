// utils/config-negocio.js - GordisNailsbySandra
// + NUEVOS CAMPOS PARA ANTICIPO
console.log('🏢 config-negocio.js cargado');

// ============================================
// 🔥 CONFIGURACIÓN DE GORDISNAILSBYSANDRA
// ============================================
const NEGOCIO_ID_POR_DEFECTO = '935cc37b-ee0e-4187-9507-4409880a15c2'; // ID DE GORDISNAILSBYSANDRA

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
        
        // 🔥 INCLUIR TODOS LOS NUEVOS CAMPOS DE ANTICIPO
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
            console.log('   - Requiere anticipo:', configCache.requiere_anticipo);
            console.log('   - Tipo anticipo:', configCache.tipo_anticipo);
            console.log('   - Valor anticipo:', configCache.valor_anticipo);
            
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

// ============================================
// 🆕 NUEVOS GETTERS PARA CONFIGURACIÓN DE ANTICIPO
// ============================================

window.getRequiereAnticipo = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.requiere_anticipo || false;
};

window.getTipoAnticipo = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.tipo_anticipo || 'fijo'; // 'fijo' o 'porcentaje'
};

window.getValorAnticipo = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.valor_anticipo || 0;
};

window.getMensajePago = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_pago || 'Para confirmar tu turno, realizá el pago del anticipo de ${monto_anticipo} a la siguiente cuenta:';
};

window.getDatosBancarios = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return {
        cbu: config?.cbu || '',
        alias: config?.alias || '',
        titular: config?.titular || '',
        banco: config?.banco || ''
    };
};

window.getTiempoVencimiento = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.tiempo_vencimiento || 2; // Horas por defecto
};

window.getNombreNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.nombre || 'GordisNailsbySandra';
};

window.getTelefonoDuenno = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.telefono || '55002272';
};

window.getEmailNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.email || '';
};

window.getInstagram = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.instagram || 'gordis_nails';
};

window.getFacebook = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.facebook || 'gordis.nails';
};

window.getHorarioAtencion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.horario_atencion || 'Mar-Sáb 9:00-21:00, Dom cerrado';
};

window.getMensajeBienvenida = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_bienvenida || '👋 Bienvenida a GordisNailsbySandra - Tu espacio de belleza';
};

window.getMensajeConfirmacion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_confirmacion || '✅ Reserva confirmada en GordisNailsbySandra';
};

window.getNtfyTopic = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.ntfy_topic || 'gordis-nails-notifications';
};

window.negocioConfigurado = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.configurado || false;
};

setTimeout(async () => {
    console.log('🔄 Precargando configuración automática...');
    await window.cargarConfiguracionNegocio();
}, 500);

console.log('✅ config-negocio.js listo para GordisNailsbySandra');
console.log('🏷️  ID configurado:', NEGOCIO_ID_POR_DEFECTO);