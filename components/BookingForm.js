// components/BookingForm.js - VERSIÓN IPHONE (con estilos originales)
// MODIFICADO PARA GORDISNAILS - ENVÍO DE PAGO Y CONFIRMACIÓN POR WHATSAPP
// + USO DE CONFIGURACIÓN DE ANTICIPO

function BookingForm({ service, profesional, date, time, onSubmit, onCancel, cliente }) {
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);

    // ============================================
    // FUNCIÓN PARA PARTIR LÍNEAS LARGAS (RFC 5545)
    // ============================================
    function partirLinea(texto, limite = 70) {
        if (texto.length <= limite) return texto;
        
        let resultado = '';
        let posicion = 0;
        
        while (posicion < texto.length) {
            if (posicion === 0) {
                resultado += texto.substring(posicion, posicion + limite) + '\n';
                posicion += limite;
            } else {
                resultado += ' ' + texto.substring(posicion, posicion + limite - 1) + '\n';
                posicion += limite - 1;
            }
        }
        
        return resultado.trim();
    }

    // ============================================
    // GENERAR UUID
    // ============================================
    function generarUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ============================================
    // FORMATEAR FECHA UTC
    // ============================================
    function formatearFechaUTC(fechaStr, horaStr) {
        const [year, month, day] = fechaStr.split('-');
        const [hour, minute] = horaStr.split(':');
        
        const fecha = new Date(Date.UTC(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            0
        ));
        
        const yearStr = fecha.getUTCFullYear();
        const monthStr = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const dayStr = String(fecha.getUTCDate()).padStart(2, '0');
        const hourStr2 = String(fecha.getUTCHours()).padStart(2, '0');
        const minuteStr = String(fecha.getUTCMinutes()).padStart(2, '0');
        
        return `${yearStr}${monthStr}${dayStr}T${hourStr2}${minuteStr}00Z`;
    }

    // ============================================
    // GENERAR ARCHIVO .ICS
    // ============================================
    function generarArchivoCalendario(bookingData) {
        const uid = generarUUID();
        
        const dtstart = formatearFechaUTC(bookingData.fecha, bookingData.hora_inicio);
        const dtend = formatearFechaUTC(bookingData.fecha, bookingData.hora_fin);
        
        const ahora = new Date();
        const stampYear = ahora.getUTCFullYear();
        const stampMonth = String(ahora.getUTCMonth() + 1).padStart(2, '0');
        const stampDay = String(ahora.getUTCDate()).padStart(2, '0');
        const stampHour = String(ahora.getUTCHours()).padStart(2, '0');
        const stampMin = String(ahora.getUTCMinutes()).padStart(2, '0');
        const dtstamp = `${stampYear}${stampMonth}${stampDay}T${stampHour}${stampMin}00`;
        
        const fecha = new Date(bookingData.fecha + 'T' + bookingData.hora_inicio + ':00');
        const fechaFin = new Date(bookingData.fecha + 'T' + bookingData.hora_fin + ':00');
        
        const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const dia = fecha.getDate();
        const mes = meses[fecha.getMonth()];
        const año = fecha.getFullYear();
        let horas = fecha.getHours();
        const minutos = fecha.getMinutes().toString().padStart(2, '0');
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        const fechaInicioStr = `${dia} ${mes} ${año} ${horas}:${minutos} ${ampm}`;
        
        let horasFin = fechaFin.getHours();
        const minutosFin = fechaFin.getMinutes().toString().padStart(2, '0');
        const ampmFin = horasFin >= 12 ? 'PM' : 'AM';
        horasFin = horasFin % 12;
        horasFin = horasFin ? horasFin : 12;
        
        const linea1 = `Appointment Details`;
        const linea2 = `When: ${fechaInicioStr} - ${horasFin}:${minutosFin} ${ampmFin} (CST)`;
        const linea3 = `Service: ${bookingData.servicio}`;
        const linea4 = `Provider Name: ${bookingData.profesional_nombre}`;
        const linea5 = `Client: ${bookingData.cliente_nombre}`;
        const linea6 = `WhatsApp: +53 ${bookingData.cliente_whatsapp}`;
        const linea7 = ``;
        const linea8 = `GordisNailsbySandra`;
        
        const descripcion = `${partirLinea(linea1)}\n${partirLinea(linea2)}\n${partirLinea(linea3)}\n${partirLinea(linea4)}\n${partirLinea(linea5)}\n${partirLinea(linea6)}\n${linea7}\n${linea8}`;
        
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GordisNails//Setmore//EN
METHOD:REQUEST
BEGIN:VTIMEZONE
TZID:America/Havana
TZURL:http://tzurl.org/zoneinfo-outlook/America/Havana
X-LIC-LOCATION:America/Havana
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:CST
DTSTART:19701101T010000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:CDT
DTSTART:19700308T000000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
END:VTIMEZONE
X-WR-TIMEZONE:America/Havana
BEGIN:VEVENT
UID:${uid}
SEQUENCE:0
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${bookingData.servicio} with ${bookingData.profesional_nombre}
TRANSP:OPAQUE
LOCATION:GordisNailsbySandra
DESCRIPTION:${descripcion}
ORGANIZER;CN="GordisNailsbySandra":mailto:gordis@email.com
ATTENDEE;ROLE=CHAIR;CUTYPE=INDIVIDUAL;RSVP=FALSE;CN="GordisNailsbySandra":MAILTO:gordis@email.com
ATTENDEE;ROLE=REQ-PARTICIPANT;CUTYPE=INDIVIDUAL;RSVP=FALSE;CN="${bookingData.cliente_nombre}":MAILTO:cliente@email.com
STATUS:CONFIRMED
CLASS:PUBLIC
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder: Tomorrow
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: In 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR`;
    }

    // ============================================
    // DESCARGAR ARCHIVO
    // ============================================
    function descargarArchivoICS(contenido, nombreArchivo) {
        try {
            const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('✅ Archivo descargado');
            return true;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }

    // ============================================
    // 🆕 FUNCIÓN ACTUALIZADA: ENVÍA DATOS DE PAGO SEGÚN CONFIGURACIÓN
    // ============================================
    async function enviarDatosPagoWhatsApp(clienteWhatsapp, datosReserva) {
        try {
            // Cargar configuración del negocio
            const configNegocio = await window.cargarConfiguracionNegocio();
            
            // Si el negocio requiere anticipo y tiene configuración personalizada
            if (configNegocio?.requiere_anticipo && window.enviarMensajePago) {
                console.log('💰 Usando mensaje de pago personalizado');
                await window.enviarMensajePago(datosReserva, configNegocio);
                return true;
            }
            
            // 🔥 COMPORTAMIENTO ANTERIOR (solo para compatibilidad)
            console.log('📱 Usando mensaje de pago por defecto (sin configuración de anticipo)');
            const fechaConDia = window.formatFechaCompleta ? 
                window.formatFechaCompleta(datosReserva.fecha) : 
                datosReserva.fecha;
            
            const horaFormateada = window.formatTo12Hour ? 
                window.formatTo12Hour(datosReserva.hora_inicio) : 
                datosReserva.hora_inicio;
            
            const mensajePago = 
`💅 *GORDISNAILSBYSANDRA*

✅ *SOLICITUD DE TURNO REGISTRADA*

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💈 *Servicio:* ${datosReserva.servicio}
👩‍🎨 *Profesional:* ${datosReserva.profesional_nombre}

💰 *Para confirmar tu turno*, enviar el *anticipo de 500 cup por:

🏦 *Transferencia bancaria:* 
   Tarjeta a transferir: 9224 0699 9844 5056
   Número a confirmar: 55002272

📱 *WhatsApp para comprobantes:* 
   +53 55002272

⏳ *Importante:* 
El turno se cancelará automáticamente si no se confirma el pago dentro de las 2 horas.

¡Gracias por elegirnos! 💖`;

            window.enviarWhatsApp(clienteWhatsapp, mensajePago);
            return true;
        } catch (error) {
            console.error('Error enviando datos de pago:', error);
            return false;
        }
    }

    // ============================================
    // HANDLE SUBMIT (CON ESTILOS ORIGINALES)
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const bookings = await getBookingsByDateAndProfesional(date, profesional.id);
            const baseSlots = [time];
            const available = filterAvailableSlots(baseSlots, service.duracion, bookings);

            if (available.length === 0) {
                setError("Ese horario ya no está disponible.");
                setSubmitting(false);
                return;
            }

            const endTime = calculateEndTime(time, service.duracion);

            const bookingData = {
                cliente_nombre: cliente.nombre,
                cliente_whatsapp: cliente.whatsapp,
                servicio: service.nombre,
                duracion: service.duracion,
                profesional_id: profesional.id,
                profesional_nombre: profesional.nombre,
                fecha: date,
                hora_inicio: time,
                hora_fin: endTime,
                estado: "Pendiente"
            };

            const result = await createBooking(bookingData);
            
            if (result.success && result.data) {
                console.log('✅ Reserva creada en estado PENDIENTE');
                
                // 🔥 1. ENVIAR DATOS DE PAGO POR WHATSAPP AL CLIENTE
                await enviarDatosPagoWhatsApp(cliente.whatsapp, result.data);
                
                // Generar y descargar archivo ICS
                const icsContent = generarArchivoCalendario(result.data);
                
                const fechaSegura = result.data.fecha.replace(/-/g, '');
                const horaSegura = result.data.hora_inicio.replace(':', '');
                const nombreSeguro = result.data.cliente_nombre
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                
                const nombreArchivo = `turno-${fechaSegura}-${horaSegura}-${nombreSeguro}.ics`;
                
                descargarArchivoICS(icsContent, nombreArchivo);
                
                // 🔥 2. NOTIFICAR A LA DUEÑA (reserva pendiente)
                if (window.notificarReservaPendiente) {
                    await window.notificarReservaPendiente(result.data);
                }
                
                onSubmit(result.data);
            }
        } catch (err) {
            console.error('Error:', err);
            setError("Ocurrió un error al guardar la reserva.");
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // RENDER (CON ESTILOS ORIGINALES COMPLETOS)
    // ============================================
    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white/95 backdrop-blur-md w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-6 border-2 border-pink-300">
                <div className="flex justify-between items-center border-b border-pink-200 pb-4">
                    <h3 className="text-xl font-bold text-pink-800 flex items-center gap-2">
                        <span>💖</span>
                        Confirmar Reserva
                    </h3>
                    <button onClick={onCancel} className="text-pink-400 hover:text-pink-600">
                        <i className="icon-x text-2xl"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Resumen del turno */}
                    <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200 space-y-2">
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl">
                                {service.nombre.toLowerCase().includes('corte') ? '✂️' : 
                                 service.nombre.toLowerCase().includes('uña') ? '💅' :
                                 service.nombre.toLowerCase().includes('peinado') ? '💇‍♀️' :
                                 service.nombre.toLowerCase().includes('maquillaje') ? '💄' : '✨'}
                            </span>
                            <span className="font-medium">{service.nombre}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl">👩‍🎨</span>
                            <span>Con: <strong>{profesional.nombre}</strong></span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl">📅</span>
                            <span>{window.formatFechaCompleta ? window.formatFechaCompleta(date) : date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl">⏰</span>
                            <span>{window.formatTo12Hour ? window.formatTo12Hour(time) : time} ({service.duracion} min)</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                            <p className="text-sm text-pink-700">
                                <span className="font-semibold">Tus datos:</span> {cliente.nombre} - +{cliente.whatsapp}
                            </p>
                        </div>

                        {error && (
                            <div className="text-pink-600 text-sm bg-pink-100 p-3 rounded-lg flex items-start gap-2 border border-pink-300">
                                <span className="text-pink-500">⚠️</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-3.5 rounded-xl font-bold hover:from-pink-600 hover:to-pink-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <span>💖</span>
                                    Confirmar Reserva
                                    <span>✨</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}