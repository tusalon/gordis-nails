// utils/whatsapp-helper.js - VERSIÓN DINÁMICA (CORREGIDA)
// + NUEVA FUNCIÓN enviarMensajePago PARA ANTICIPOS PERSONALIZADOS

console.log('📱 whatsapp-helper.js - VERSIÓN DINÁMICA');

// ============================================
// FUNCIÓN PARA OBTENER CONFIGURACIÓN DEL NEGOCIO
// ============================================
async function getConfigNegocio() {
    try {
        const config = await window.cargarConfiguracionNegocio();
        return {
            nombre: config?.nombre || 'Mi Negocio',
            telefono: config?.telefono || '54646800',
            ntfyTopic: config?.ntfy_topic || 'notificaciones'
        };
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        return {
            nombre: 'Mi Negocio',
            telefono: '54646800',
            ntfyTopic: 'notificaciones'
        };
    }
}

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
                window.location.href = url;
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Error en enviarWhatsApp:', error);
        return false;
    }
};

// ============================================
// FUNCIÓN PARA ENVIAR NOTIFICACIÓN PUSH
// ============================================
window.enviarNotificacionPush = async function(titulo, mensaje, etiquetas = 'bell', prioridad = 'default') {
    try {
        const config = await getConfigNegocio();
        const topic = config.ntfyTopic;
        
        console.log(`📢 Enviando push a ntfy.sh/${topic}:`, titulo);
        
        const tituloLimpio = titulo.replace(/[^\x00-\x7F]/g, '');
        
        const response = await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': tituloLimpio,
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
// 🆕 NUEVA FUNCIÓN: ENVIAR MENSAJE DE PAGO PERSONALIZADO
// ============================================
window.enviarMensajePago = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('💰 Enviando mensaje de pago personalizado...');

        // Si no se pasó la config, la cargamos
        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        // Si no requiere anticipo, no hacemos nada
        if (!configNegocio?.requiere_anticipo) {
            console.log('ℹ️ El negocio no requiere anticipo, no se envía mensaje de pago');
            return false;
        }

        // Calcular monto del anticipo
        let montoAnticipo = 0;
        if (configNegocio.tipo_anticipo === 'fijo') {
            montoAnticipo = configNegocio.valor_anticipo || 0;
        } else {
            // Porcentaje: necesitamos el precio del servicio
            // Buscar el servicio en la lista global
            let precioServicio = 0;
            if (window.salonServicios) {
                const servicios = await window.salonServicios.getAll(true);
                const servicio = servicios.find(s => s.nombre === booking.servicio);
                if (servicio) {
                    precioServicio = servicio.precio;
                }
            }
            const porcentaje = (configNegocio.valor_anticipo || 0) / 100;
            montoAnticipo = Math.round(precioServicio * porcentaje);
        }

        // Formatear fecha y hora
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;

        // Obtener profesional
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';

        // Preparar variables para reemplazar en el mensaje
        const variables = {
            '{monto_anticipo}': `$${montoAnticipo}`,
            '{servicio}': booking.servicio,
            '{fecha}': fechaConDia,
            '{hora}': horaFormateada,
            '{profesional}': profesional,
            '{cbu}': configNegocio.cbu || '[CBU no configurado]',
            '{alias}': configNegocio.alias || '[Alias no configurado]',
            '{titular}': configNegocio.titular || '[Titular no configurado]',
            '{banco}': configNegocio.banco || '[Banco no configurado]',
            '{tiempo_vencimiento}': configNegocio.tiempo_vencimiento || 2
        };

        // Usar mensaje personalizado o uno por defecto
        let mensajeBase = configNegocio.mensaje_pago || 
`💅 *${configNegocio.nombre || 'Mi Salón'}*

✅ *SOLICITUD DE TURNO REGISTRADA*

📅 *Fecha:* {fecha}
⏰ *Hora:* {hora}
💈 *Servicio:* {servicio}
👩‍🎨 *Profesional:* {profesional}

💰 *Para confirmar tu turno*, realizá el pago del anticipo de *{monto_anticipo}* a:

🏦 *Banco:* {banco}
🔢 *CBU:* {cbu}
🏷️ *Alias:* {alias}
👤 *Titular:* {titular}

⏳ *Importante:* 
Tenés {tiempo_vencimiento} horas para realizar el pago.
Si no se confirma en ese tiempo, el turno se cancelará automáticamente.

¡Gracias por elegirnos! 💖`;

        // Reemplazar todas las variables
        let mensajeFinal = mensajeBase;
        for (const [key, value] of Object.entries(variables)) {
            mensajeFinal = mensajeFinal.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }

        // Enviar WhatsApp al cliente
        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeFinal);
        
        console.log('✅ Mensaje de pago enviado al cliente');
        return true;

    } catch (error) {
        console.error('Error en enviarMensajePago:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÓN DE NUEVA RESERVA (CONFIRMADA)
// ============================================
window.notificarNuevaReserva = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de NUEVA RESERVA (CONFIRMADA)');

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const mensajeWhatsApp = 
`🎉 *NUEVA RESERVA - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio} (${booking.duracion} min)
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

✅ Reserva confirmada automáticamente.`;

        window.enviarWhatsApp(config.telefono, mensajeWhatsApp);
        
        console.log('✅ Notificaciones de nueva reserva enviadas');
        return true;
    } catch (error) {
        console.error('Error en notificarNuevaReserva:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÓN DE RESERVA PENDIENTE (CON PUSH)
// ============================================
window.notificarReservaPendiente = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de RESERVA PENDIENTE (CON PUSH)');

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const mensajeWhatsApp = 
`🆕 *RESERVA PENDIENTE DE PAGO - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio} (${booking.duracion} min)
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}
💰 *Estado:* Pendiente de pago

✅ Ingresá al panel para confirmar el pago:
https://tusalon.github.io/gordis-nails/admin-login.html`;

        window.enviarWhatsApp(config.telefono, mensajeWhatsApp);
        
        const mensajePush = 
`🆕 RESERVA PENDIENTE - ${config.nombre}
👤 Cliente: ${booking.cliente_nombre}
💰 Estado: Pendiente de pago`;

        await window.enviarNotificacionPush(
            `💰 ${config.nombre} - Pago pendiente`,
            mensajePush,
            'moneybag',
            'high'
        );
        
        console.log('✅ Notificación de reserva pendiente enviada (con push)');
        return true;
    } catch (error) {
        console.error('Error en notificarReservaPendiente:', error);
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

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        const canceladoPor = booking.cancelado_por || 'admin';
        
        const mensajeDuenno = 
`❌ *CANCELACIÓN - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio}
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

${canceladoPor === 'cliente' ? 'El cliente canceló su turno.' : 'El administrador canceló la reserva.'}`;

        window.enviarWhatsApp(config.telefono, mensajeDuenno);

        if (canceladoPor === 'admin') {
            const mensajeCliente = 
`❌ *CANCELACIÓN DE TURNO - ${config.nombre}*

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

        const mensajePush = 
`❌ CANCELACION - ${config.nombre}
👤 Cliente: ${booking.cliente_nombre}
📱 WhatsApp: ${booking.cliente_whatsapp}
💅 Servicio: ${booking.servicio}
📅 Fecha: ${fechaConDia}
${canceladoPor === 'cliente' ? '🔔 Cancelado por cliente' : '🔔 Cancelado por admin'}`;

        await window.enviarNotificacionPush(
            `❌ ${config.nombre} - Cancelación`,
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

console.log('✅ whatsapp-helper.js - VERSIÓN DINÁMICA CARGADA');