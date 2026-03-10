// utils/whatsapp-helper.js - GORDISNAILSBYSANDRA

console.log('📱 whatsapp-helper.js - GORDISNAILSBYSANDRA');

// ============================================
// CONFIGURACIÓN CENTRALIZADA
// ============================================
const CONFIG = {
    NTFY_TOPIC_DEFAULT: 'gordis-nails-notifications',
    TELEFONO_DUENNA: '55002272',
    NOMBRE_NEGOCIO: 'GordisNailsbySandra'
};

// ============================================
// FUNCIÓN PARA OBTENER TOPIC NTFY
// ============================================
window.getNtfyTopicConfig = async function() {
    try {
        if (window.getNtfyTopic) {
            const topic = await window.getNtfyTopic();
            if (topic) {
                console.log('📡 Usando ntfy topic de configuración:', topic);
                return topic;
            }
        }
        console.log('📡 Usando ntfy topic por defecto:', CONFIG.NTFY_TOPIC_DEFAULT);
        return CONFIG.NTFY_TOPIC_DEFAULT;
    } catch (error) {
        console.error('Error obteniendo ntfy topic:', error);
        return CONFIG.NTFY_TOPIC_DEFAULT;
    }
};

// ============================================
// DETECTOR DE iOS
// ============================================
window.esIOS = function() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /iPad|iPhone|iPod/.test(userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// ============================================
// FUNCIÓN UNIVERSAL WHATSAPP
// ============================================
window.enviarWhatsApp = function(telefono, mensaje) {
    try {
        console.log('📤 enviarWhatsApp llamado a:', telefono);
        
        const telefonoLimpio = telefono.toString().replace(/\D/g, '');
        let numeroCompleto = telefonoLimpio;
        if (!numeroCompleto.startsWith('53')) {
            numeroCompleto = `53${telefonoLimpio}`;
        }
        
        const mensajeCodificado = encodeURIComponent(mensaje);
        const url = `https://wa.me/${numeroCompleto}?text=${mensajeCodificado}`;
        
        console.log('🔗 Abriendo WhatsApp:', url);
        
        if (window.esIOS()) {
            window.location.href = url;
        } else {
            const nuevaVentana = window.open(url, '_blank');
            if (!nuevaVentana || nuevaVentana.closed || typeof nuevaVentana.closed === 'undefined') {
                console.log('⚠️ Pop-up bloqueado, usando location.href');
                window.location.href = url;
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Error en enviarWhatsApp:', error);
        try {
            const numeroSimple = telefono.toString().replace(/\D/g, '');
            window.location.href = `https://wa.me/53${numeroSimple}?text=${encodeURIComponent(mensaje)}`;
        } catch (e) {}
        return false;
    }
};

// ============================================
// FUNCIÓN UNIVERSAL NTFY
// ============================================
window.enviarNotificacionPush = async function(titulo, mensaje, etiquetas = 'bell', prioridad = 'default') {
    try {
        const topic = await window.getNtfyTopicConfig();
        
        console.log(`📢 Enviando push a ntfy.sh/${topic}:`, titulo);
        
        const response = await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': titulo,
                'Priority': prioridad,
                'Tags': etiquetas
            }
        });
        
        if (response.ok) {
            console.log('✅ Push enviado correctamente');
            return true;
        } else {
            console.error('❌ Error en push:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error enviando push:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÓN DE NUEVA RESERVA
// ============================================
window.notificarNuevaReserva = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de NUEVA RESERVA');

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        // WhatsApp a la dueña
        const mensajeWhatsApp = 
`🎉 *NUEVA RESERVA - ${CONFIG.NOMBRE_NEGOCIO}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio} (${booking.duracion} min)
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

✅ Reserva confirmada automáticamente.`;

        window.enviarWhatsApp(CONFIG.TELEFONO_DUENNA, mensajeWhatsApp);
        
        // Push notification
        const mensajePush = 
`🎉 NUEVA RESERVA - ${CONFIG.NOMBRE_NEGOCIO}
👤 Cliente: ${booking.cliente_nombre}
📱 WhatsApp: ${booking.cliente_whatsapp}
💅 Servicio: ${booking.servicio} (${booking.duracion} min)
📅 Fecha: ${fechaConDia}
⏰ Hora: ${horaFormateada}
👩‍🎨 Profesional: ${profesional}`;

        await window.enviarNotificacionPush(
            `🎉 ${CONFIG.NOMBRE_NEGOCIO} - Nueva reserva`,
            mensajePush,
            'tada',
            'default'
        );
        
        console.log('✅ Notificaciones de nueva reserva enviadas');
        return true;
    } catch (error) {
        console.error('Error en notificarNuevaReserva:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÓN DE CANCELACIÓN
// ============================================
window.notificarCancelacion = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de CANCELACIÓN');

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const canceladoPor = booking.cancelado_por || 'admin';
        
        // WhatsApp al DUEÑO (siempre)
        const mensajeDuenno = 
`❌ *CANCELACIÓN - ${CONFIG.NOMBRE_NEGOCIO}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio}
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

${canceladoPor === 'cliente' ? 'El cliente canceló su turno.' : 'El administrador canceló la reserva.'}`;

        window.enviarWhatsApp(CONFIG.TELEFONO_DUENNA, mensajeDuenno);

        // WhatsApp al CLIENTE (solo si canceló el admin)
        if (canceladoPor === 'admin') {
            const mensajeCliente = 
`❌ *CANCELACIÓN DE TURNO - ${CONFIG.NOMBRE_NEGOCIO}*

Hola *${booking.cliente_nombre}*, lamentamos informarte que tu turno ha sido cancelado.

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💈 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}

🔔 *Motivo:* Cancelación por administración

📱 *¿Querés reprogramar?* Podés hacerlo desde la app`;

            const telefonoCliente = booking.cliente_whatsapp.replace(/\D/g, '');
            window.enviarWhatsApp(telefonoCliente, mensajeCliente);
        }

        // Push notification
        const mensajePush = 
`❌ CANCELACION - ${CONFIG.NOMBRE_NEGOCIO}
👤 Cliente: ${booking.cliente_nombre}
📱 WhatsApp: ${booking.cliente_whatsapp}
💅 Servicio: ${booking.servicio}
📅 Fecha: ${fechaConDia}
${canceladoPor === 'cliente' ? '🔔 Cancelado por cliente' : '🔔 Cancelado por admin'}`;

        await window.enviarNotificacionPush(
            `❌ ${CONFIG.NOMBRE_NEGOCIO} - Cancelación`,
            mensajePush,
            'x',
            'default'
        );
        
        console.log('✅ Notificaciones de cancelación enviadas');
        return true;
    } catch (error) {
        console.error('Error en notificarCancelacion:', error);
        return false;
    }
};

console.log('✅ whatsapp-helper.js - Versión GORDISNAILSBYSANDRA');