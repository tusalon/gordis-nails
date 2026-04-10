// admin-app.js - Panel de administración (VERSIÓN CON CALENDARIO Y LISTA)

console.log('🚀 ADMIN-APP.JS - Panel con Calendario + Lista');

window.addEventListener('error', function(e) {
    console.error('❌ Error detectado:', e.message);
    if (e.message.includes('Failed to load') || e.message.includes('Unexpected token')) {
        if (window.swRegistration) {
            window.swRegistration.unregister().then(() => window.location.reload());
        } else {
            window.location.reload();
        }
    }
});

// ============================================
// FUNCIÓN PARA OBTENER NEGOCIO_ID
// ============================================
function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId) return localId;
    if (window.NEGOCIO_ID_POR_DEFECTO) return window.NEGOCIO_ID_POR_DEFECTO;
    if (typeof window.getNegocioId === 'function') return window.getNegocioId();
    return null;
}

// ============================================
// FUNCIONES DE SUPABASE
// ============================================
async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) return [];
        const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&select=*&order=fecha.desc,hora_inicio.asc`;
        const res = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

async function cancelBooking(id) {
    try {
        const negocioId = getNegocioId();
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'Cancelado' })
            }
        );
        return res.ok;
    } catch (error) {
        console.error('Error cancel booking:', error);
        return false;
    }
}

async function createBooking(bookingData) {
    try {
        const negocioId = getNegocioId();
        const dataWithNegocio = { ...bookingData, negocio_id: negocioId };
        const res = await fetch(`${window.SUPABASE_URL}/rest/v1/reservas`, {
            method: 'POST',
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(dataWithNegocio)
        });
        if (!res.ok) return { success: false, error: await res.text() };
        const data = await res.json();
        return { success: true, data: Array.isArray(data) ? data[0] : data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNCIÓN PARA MARCAR TURNOS COMO COMPLETADOS
// ============================================
async function marcarTurnosCompletados() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) return;
        const ahora = new Date();
        const hoy = `${ahora.getFullYear()}-${(ahora.getMonth()+1).toString().padStart(2,'0')}-${ahora.getDate().toString().padStart(2,'0')}`;
        const horaActual = ahora.getHours();
        const minutosActuales = ahora.getMinutes();
        const totalMinutosActual = horaActual * 60 + minutosActuales;

        const responsePasados = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Reservado&fecha=lt.${hoy}`,
            { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } }
        );
        const turnosPasados = await responsePasados.json();

        const responseHoy = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Reservado&fecha=eq.${hoy}`,
            { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } }
        );
        const turnosHoy = responseHoy.ok ? await responseHoy.json() : [];
        const turnosHoyTerminados = turnosHoy.filter(turno => {
            const [horas, minutos] = turno.hora_fin.split(':').map(Number);
            return (horas * 60 + minutos) <= totalMinutosActual;
        });
        const turnosACompletar = [...turnosPasados, ...turnosHoyTerminados];
        
        for (const turno of turnosACompletar) {
            await fetch(`${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${turno.id}`, {
                method: 'PATCH',
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'Completado' })
            });
        }
    } catch (error) {
        console.error('Error marcando turnos completados:', error);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const timeToMinutes = (time) => { const [h,m] = time.split(':').map(Number); return h*60+m; };
const formatTo12Hour = (time) => { const [h,m] = time.split(':'); const hour = parseInt(h); const ampm = hour>=12?'PM':'AM'; const h12 = hour%12||12; return `${h12}:${m} ${ampm}`; };
const calculateEndTime = (startTime, duration) => { const [h,m] = startTime.split(':').map(Number); const total = h*60+m+duration; return `${Math.floor(total/60).toString().padStart(2,'0')}:${(total%60).toString().padStart(2,'0')}`; };
const getCurrentLocalDate = () => { const ahora = new Date(); return `${ahora.getFullYear()}-${(ahora.getMonth()+1).toString().padStart(2,'0')}-${ahora.getDate().toString().padStart(2,'0')}`; };
const indiceToHoraLegible = (indice) => { const horas = Math.floor(indice/2); const minutos = indice%2===0?'00':'30'; return `${horas.toString().padStart(2,'0')}:${minutos}`; };

// ============================================
// COMPONENTE AdminCalendar (Vista Calendario)
// ============================================
function AdminCalendar({ bookings, loading, onEventClick, onDateSelect }) {
    const calendarRef = React.useRef(null);
    const [calendarInitialized, setCalendarInitialized] = React.useState(false);

    React.useEffect(() => {
        if (!calendarRef.current || calendarInitialized) return;
        
        const calendarApi = new FullCalendar.Calendar(calendarRef.current, {
            locale: 'es',
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            editable: false,
            droppable: false,
            eventClick: (info) => onEventClick(info.event),
            dateClick: (info) => onDateSelect(info.dateStr),
            height: 'auto',
            slotMinTime: '08:00:00',
            slotMaxTime: '21:00:00',
            allDaySlot: false,
            nowIndicator: true,
            businessHours: { daysOfWeek: [1,2,3,4,5,6], startTime: '09:00', endTime: '20:00' }
        });
        calendarApi.render();
        setCalendarInitialized(true);
    }, []);

    React.useEffect(() => {
        if (!calendarInitialized) return;
        
        const events = bookings.filter(b => b.estado !== 'Cancelado').map(booking => {
            let backgroundColor = '#10B981';
            if (booking.estado === 'Pendiente') backgroundColor = '#F59E0B';
            if (booking.estado === 'Completado') backgroundColor = '#6B7280';
            
            const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignado';
            const start = `${booking.fecha}T${booking.hora_inicio}`;
            const end = `${booking.fecha}T${booking.hora_fin}`;
            
            return {
                id: booking.id,
                title: `${formatTo12Hour(booking.hora_inicio)} - ${booking.servicio} - ${booking.cliente_nombre} (${profesional})`,
                start: start,
                end: end,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                extendedProps: {
                    cliente_nombre: booking.cliente_nombre,
                    cliente_whatsapp: booking.cliente_whatsapp,
                    servicio: booking.servicio,
                    profesional_nombre: profesional,
                    estado: booking.estado,
                    duracion: booking.duracion,
                    hora_inicio: booking.hora_inicio,
                    hora_fin: booking.hora_fin,
                    fecha: booking.fecha,
                    id: booking.id
                }
            };
        });
        
        const calendarApi = calendarRef.current._calendarApi;
        if (calendarApi) {
            calendarApi.removeAllEvents();
            calendarApi.addEventSource(events);
        }
    }, [bookings, calendarInitialized]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando calendario...</p>
            </div>
        );
    }

    return <div className="bg-white rounded-xl shadow-sm p-4 animate-fade-in" ref={calendarRef}></div>;
}

// ============================================
// COMPONENTE ListaDeReservas (Vista Lista)
// ============================================
function ListaDeReservas({ bookings, loading, filterDate, setFilterDate, statusFilter, setStatusFilter, handleCancel, confirmarPago, borrarCanceladas, formatTo12Hour, activasCount, pendientesCount, completadasCount, canceladasCount }) {
    const getFilteredBookings = () => {
        let filtradas = filterDate ? bookings.filter(b => b.fecha === filterDate) : [...bookings];
        if (statusFilter === 'activas') return filtradas.filter(b => b.estado === 'Reservado');
        if (statusFilter === 'pendientes') return filtradas.filter(b => b.estado === 'Pendiente');
        if (statusFilter === 'completadas') return filtradas.filter(b => b.estado === 'Completado');
        if (statusFilter === 'canceladas') return filtradas.filter(b => b.estado === 'Cancelado');
        return filtradas;
    };
    
    const filteredBookings = getFilteredBookings();

    return (
        <div className="space-y-3 animate-fade-in">
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                    {filterDate && <button onClick={() => setFilterDate('')} className="text-purple-500 text-sm">Limpiar filtro</button>}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setStatusFilter('activas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'activas' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Activas ({activasCount})</button>
                    <button onClick={() => setStatusFilter('pendientes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'pendientes' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Pendientes ({pendientesCount})</button>
                    <button onClick={() => setStatusFilter('completadas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'completadas' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Completadas ({completadasCount})</button>
                    <button onClick={() => setStatusFilter('canceladas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'canceladas' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Canceladas ({canceladasCount})</button>
                    <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'todas' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>Todas ({bookings.length})</button>
                    {statusFilter === 'canceladas' && <button onClick={borrarCanceladas} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm">🗑️ Borrar todas</button>}
                </div>
            </div>
            
            {loading ? (
                <div className="text-center py-12 bg-white rounded-xl"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div><p className="text-purple-500 mt-4">Cargando reservas...</p></div>
            ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl"><p className="text-gray-500">No hay reservas para mostrar</p></div>
            ) : (
                filteredBookings.map(b => (
                    <div key={b.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${b.estado === 'Reservado' ? 'border-l-purple-500' : b.estado === 'Pendiente' ? 'border-l-yellow-500' : b.estado === 'Completado' ? 'border-l-gray-500' : 'border-l-red-500'}`}>
                        <div className="flex justify-between mb-2"><span className="font-semibold">{window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha}</span><span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{formatTo12Hour(b.hora_inicio)}</span></div>
                        <div className="text-sm space-y-1"><p><span className="font-medium">👤 Cliente:</span> {b.cliente_nombre}</p><p><span className="font-medium">📱 WhatsApp:</span> {b.cliente_whatsapp}</p><p><span className="font-medium">💅 Servicio:</span> {b.servicio}</p><p><span className="font-medium">👩‍🎨 Profesional:</span> {b.profesional_nombre || b.trabajador_nombre}</p></div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.estado === 'Reservado' ? 'bg-purple-100 text-purple-700' : b.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : b.estado === 'Completado' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>{b.estado}</span>
                        <div className="flex gap-2">{b.estado === 'Pendiente' && <button onClick={() => confirmarPago(b.id, b)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">✅ Confirmar pago</button>}{b.estado === 'Reservado' && <button onClick={() => handleCancel(b.id, b)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">❌ Cancelar</button>}</div></div>
                    </div>
                ))
            )}
        </div>
    );
}

// ============================================
// COMPONENTE PRINCIPAL AdminApp
// ============================================
function AdminApp() {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filterDate, setFilterDate] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('activas');
    const [userRole, setUserRole] = React.useState('admin');
    const [userNivel, setUserNivel] = React.useState(3);
    const [profesional, setProfesional] = React.useState(null);
    const [nombreNegocio, setNombreNegocio] = React.useState('Mi Negocio');
    const [logoNegocio, setLogoNegocio] = React.useState(null);
    const [config, setConfig] = React.useState(null);
    const [tabActivo, setTabActivo] = React.useState('reservas');
    const [vistaReservas, setVistaReservas] = React.useState('calendario');
    
    const [showClientesRegistrados, setShowClientesRegistrados] = React.useState(false);
    const [clientesRegistrados, setClientesRegistrados] = React.useState([]);
    const [cargandoClientes, setCargandoClientes] = React.useState(false);
    const [showNuevaReservaModal, setShowNuevaReservaModal] = React.useState(false);
    const [nuevaReservaData, setNuevaReservaData] = React.useState({ cliente_nombre: '', cliente_whatsapp: '', servicio: '', profesional_id: '', fecha: '', hora_inicio: '', requiereAnticipo: false });
    
    const [serviciosList, setServiciosList] = React.useState([]);
    const [profesionalesList, setProfesionalesList] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});
    const [diasCerradosFechas, setDiasCerradosFechas] = React.useState([]);

    // Cargar datos iniciales
    React.useEffect(() => {
        window.getNombreNegocio().then(n => setNombreNegocio(n));
        cargarConfiguracion();
        
        const profesionalAuth = window.getProfesionalAutenticado?.();
        if (profesionalAuth) {
            setUserRole('profesional');
            setProfesional(profesionalAuth);
            setUserNivel(profesionalAuth.nivel || 1);
            setNuevaReservaData(prev => ({ ...prev, profesional_id: profesionalAuth.id }));
        }
        
        const cargarDatosModal = async () => {
            if (window.salonServicios) setServiciosList(await window.salonServicios.getAll(true) || []);
            if (window.salonProfesionales) setProfesionalesList(await window.salonProfesionales.getAll(true) || []);
        };
        cargarDatosModal();
        cargarDiasCerradosDirecto();
        
        const intervalo = setInterval(() => { marcarTurnosCompletados().then(() => fetchBookings()); }, 60000);
        return () => clearInterval(intervalo);
    }, []);

    const cargarConfiguracion = async () => {
        try {
            const configData = await window.cargarConfiguracionNegocio(true);
            setConfig(configData);
            if (configData?.nombre) setNombreNegocio(configData.nombre);
            if (configData?.logo_url) setLogoNegocio(configData.logo_url);
        } catch (error) { console.error('Error cargando config:', error); }
    };

    const cargarDiasCerradosDirecto = async () => {
        try {
            const negocioId = getNegocioId();
            if (!negocioId) return [];
            const response = await fetch(`${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&select=fecha`, {
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` }
            });
            if (response.ok) setDiasCerradosFechas((await response.json()).map(d => d.fecha));
        } catch (error) { console.error('Error cargando días cerrados:', error); }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            let data = userRole === 'profesional' && profesional ? await window.getReservasPorProfesional?.(profesional.id, false) || [] : await getAllBookings();
            if (Array.isArray(data)) { data.sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio)); await marcarTurnosCompletados(); setBookings(data); }
            else setBookings([]);
        } catch (error) { console.error('Error fetching bookings:', error); }
        finally { setLoading(false); }
    };

    React.useEffect(() => { fetchBookings(); if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) loadClientesRegistrados(); }, [userRole, userNivel, profesional]);

    const loadClientesRegistrados = async () => {
        setCargandoClientes(true);
        try { setClientesRegistrados(await window.getClientesRegistrados() || []); }
        catch (error) { console.error('Error cargando clientes:', error); setClientesRegistrados([]); }
        finally { setCargandoClientes(false); }
    };

    const confirmarPago = async (id, bookingData) => {
        if (!confirm(`¿Confirmar que se recibió el pago de ${bookingData.cliente_nombre}?`)) return;
        try {
            const response = await fetch(`${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${id}`, {
                method: 'PATCH',
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'Reservado' })
            });
            if (!response.ok) throw new Error('Error al confirmar pago');
            const configNegocio = await window.cargarConfiguracionNegocio();
            const mensajeCliente = `💅 *${configNegocio?.nombre || 'Mi Salón'} - Turno Confirmado* 🎉\n\nHola *${bookingData.cliente_nombre}*, ¡tu turno ha sido CONFIRMADO!\n\n📅 *Fecha:* ${window.formatFechaCompleta ? window.formatFechaCompleta(bookingData.fecha) : bookingData.fecha}\n⏰ *Hora:* ${formatTo12Hour(bookingData.hora_inicio)}\n💅 *Servicio:* ${bookingData.servicio}\n👩‍🎨 *Profesional:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}\n\n✅ *Pago recibido correctamente*\n\nTe esperamos 💖`;
            window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);
            alert('✅ Pago confirmado. Turno reservado y cliente notificado.');
            fetchBookings();
        } catch (error) { console.error('Error confirmando pago:', error); alert('❌ Error al confirmar el pago'); }
    };

    const handleCancel = async (id, bookingData) => {
        if (!confirm(`¿Cancelar reserva de ${bookingData.cliente_nombre}?`)) return;
        const ok = await cancelBooking(id);
        if (ok) { bookingData.cancelado_por = 'admin'; if (window.notificarCancelacion) await window.notificarCancelacion(bookingData); alert('✅ Reserva cancelada'); fetchBookings(); }
        else alert('❌ Error al cancelar');
    };

    const borrarCanceladas = async () => {
        if (!confirm('¿Estás segura de querer borrar TODAS las reservas canceladas?')) return;
        try {
            const response = await fetch(`${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&estado=eq.Cancelado`, {
                method: 'DELETE',
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` }
            });
            if (!response.ok) throw new Error('Error al borrar');
            alert(`✅ Se borraron todas las reservas canceladas correctamente`);
            fetchBookings();
        } catch (error) { console.error('Error:', error); alert('❌ Error al conectar con el servidor'); }
    };

    const handleCalendarEventClick = (event) => {
        const data = event.extendedProps;
        const action = confirm(`📅 *Reserva de ${data.cliente_nombre}*\n\n💅 Servicio: ${data.servicio}\n👤 Profesional: ${data.profesional_nombre}\n📅 Fecha: ${window.formatFechaCompleta ? window.formatFechaCompleta(data.fecha) : data.fecha}\n⏰ Hora: ${formatTo12Hour(data.hora_inicio)}\n💰 Estado: ${data.estado}\n\n¿Qué deseas hacer?\n✅ OK = Confirmar pago (si está pendiente)\n❌ Cancelar = Cancelar turno`);
        if (action) {
            if (data.estado === 'Pendiente') confirmarPago(event.id, data);
            else handleCancel(event.id, data);
        }
    };

    const handleCalendarDateSelect = (dateStr) => {
        setNuevaReservaData({ ...nuevaReservaData, fecha: dateStr.split('T')[0] });
        setShowNuevaReservaModal(true);
    };

    const handleCrearReservaManual = async () => {
        if (!nuevaReservaData.cliente_nombre || !nuevaReservaData.cliente_whatsapp || !nuevaReservaData.servicio || !nuevaReservaData.profesional_id || !nuevaReservaData.fecha || !nuevaReservaData.hora_inicio) {
            alert('Completá todos los campos'); return;
        }
        try {
            const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
            const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
            if (!servicio || !profesional) { alert('Servicio o profesional no encontrado'); return; }
            const endTime = calculateEndTime(nuevaReservaData.hora_inicio, servicio.duracion);
            const result = await createBooking({
                cliente_nombre: nuevaReservaData.cliente_nombre,
                cliente_whatsapp: `53${nuevaReservaData.cliente_whatsapp.replace(/\D/g, '')}`,
                servicio: nuevaReservaData.servicio,
                duracion: servicio.duracion,
                profesional_id: nuevaReservaData.profesional_id,
                profesional_nombre: profesional.nombre,
                fecha: nuevaReservaData.fecha,
                hora_inicio: nuevaReservaData.hora_inicio,
                hora_fin: endTime,
                estado: nuevaReservaData.requiereAnticipo ? "Pendiente" : "Reservado"
            });
            if (result.success) {
                alert(`✅ Reserva creada exitosamente como "${result.data.estado}"`);
                if (nuevaReservaData.requiereAnticipo && window.enviarMensajePago) await window.enviarMensajePago(result.data, config);
                else if (!nuevaReservaData.requiereAnticipo && window.enviarConfirmacionReserva) await window.enviarConfirmacionReserva(result.data, config);
                setShowNuevaReservaModal(false);
                setNuevaReservaData({ cliente_nombre: '', cliente_whatsapp: '', servicio: '', profesional_id: userRole === 'profesional' ? profesional?.id : '', fecha: '', hora_inicio: '', requiereAnticipo: false });
                fetchBookings();
            } else alert('❌ Error al crear la reserva: ' + (result.error || 'Error desconocido'));
        } catch (error) { console.error('Error creando reserva:', error); alert('❌ Error al crear la reserva: ' + error.message); }
    };

    const handleLogout = () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('adminAuth'); localStorage.removeItem('adminUser'); localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('profesionalAuth'); localStorage.removeItem('userRole'); localStorage.removeItem('clienteAuth'); localStorage.removeItem('negocioId');
            window.location.href = 'index.html';
        }
    };

    const activasCount = bookings.filter(b => b.estado === 'Reservado').length;
    const pendientesCount = bookings.filter(b => b.estado === 'Pendiente').length;
    const completadasCount = bookings.filter(b => b.estado === 'Completado').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;

    const tabsDisponibles = () => {
        const tabs = [{ id: 'reservas', icono: '📅', label: userRole === 'profesional' ? 'Mis Reservas' : 'Reservas' }];
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) tabs.push({ id: 'configuracion', icono: '⚙️', label: 'Configuración' }, { id: 'clientes', icono: '👤', label: 'Clientes' });
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 3)) tabs.push({ id: 'servicios', icono: '💈', label: 'Servicios' }, { id: 'profesionales', icono: '👥', label: 'Profesionales' });
        return tabs;
    };

    return (
        <div className="min-h-screen bg-purple-50 p-3 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                {/* HEADER */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-purple-500">
                    <div className="flex items-center gap-3">
                        {logoNegocio ? <img src={logoNegocio} alt={nombreNegocio} className="w-12 h-12 object-contain rounded-xl shadow-lg ring-2 ring-purple-300 bg-white p-1" onError={(e) => { e.target.onerror=null; e.target.style.display='none'; }} />
                        : <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center"><span className="text-2xl text-white">💖</span></div>}
                        <div><h1 className="text-xl font-bold text-purple-800">{nombreNegocio}</h1><p className="text-xs text-purple-500">Panel de Administración</p></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => { setNuevaReservaData({ cliente_nombre: '', cliente_whatsapp: '', servicio: '', profesional_id: userRole === 'profesional' ? profesional?.id : '', fecha: '', hora_inicio: '', requiereAnticipo: false }); setCurrentDate(new Date()); setShowNuevaReservaModal(true); }} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-green-400 flex-1 sm:flex-none justify-center"><span className="text-lg">📅</span><span className="font-medium">Nueva Reserva</span></button>
                        <button onClick={() => window.location.href = 'editar-negocio.html'} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-purple-400 flex-1 sm:flex-none justify-center"><span className="text-lg">💖</span><span className="font-medium">Editar Negocio</span></button>
                        <button onClick={() => { cargarConfiguracion(); }} className="p-2 bg-purple-50 rounded-full hover:bg-purple-100 transition-all hover:scale-105 border border-purple-200"><i className="icon-refresh-cw text-purple-600"></i></button>
                        <button onClick={fetchBookings} className="p-2 bg-purple-50 rounded-full hover:bg-purple-100 transition-all hover:scale-105 border border-purple-200"><i className="icon-refresh-cw text-purple-600"></i></button>
                        <button onClick={handleLogout} className="p-2 bg-purple-50 rounded-full hover:bg-purple-100 transition-all hover:scale-105 border border-purple-200"><i className="icon-log-out text-purple-600"></i></button>
                    </div>
                </div>

                {/* MODAL NUEVA RESERVA */}
                {showNuevaReservaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">📅 Nueva Reserva Manual</h3><button onClick={() => setShowNuevaReservaModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button></div>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente *</label><input type="text" value={nuevaReservaData.cliente_nombre} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_nombre: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Ej: María Pérez" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del Cliente *</label><div className="flex"><span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50">+53</span><input type="tel" value={nuevaReservaData.cliente_whatsapp} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2 rounded-r-lg border border-gray-300" placeholder="55002272" /></div></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Servicio *</label><select value={nuevaReservaData.servicio} onChange={(e) => setNuevaReservaData({...nuevaReservaData, servicio: e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar servicio</option>{serviciosList.map(s => (<option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion} min - ${s.precio})</option>))}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Profesional *</label><select value={nuevaReservaData.profesional_id} onChange={(e) => setNuevaReservaData({...nuevaReservaData, profesional_id: e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar profesional</option>{profesionalesList.map(p => (<option key={p.id} value={p.id}>{p.nombre} - {p.especialidad}</option>))}</select></div>
                                {userRole === 'admin' && (<div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg"><input type="checkbox" id="requiereAnticipo" checked={nuevaReservaData.requiereAnticipo} onChange={(e) => setNuevaReservaData({...nuevaReservaData, requiereAnticipo: e.target.checked})} /><label htmlFor="requiereAnticipo" className="text-sm font-medium text-yellow-800">💰 Requerir anticipo al cliente</label></div>)}
                                <div className="flex gap-3 pt-4"><button onClick={() => setShowNuevaReservaModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button><button onClick={handleCrearReservaManual} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Crear Reserva</button></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑAS */}
                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                    {tabsDisponibles().map(tab => (<button key={tab.id} onClick={() => setTabActivo(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tabActivo === tab.id ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><span>{tab.icono}</span><span>{tab.label}</span></button>))}
                </div>

                {/* CONTENIDO */}
                {tabActivo === 'configuracion' && <ConfigPanel profesionalId={userRole === 'profesional' ? profesional?.id : null} modoRestringido={userRole === 'profesional' && userNivel === 2} />}
                {tabActivo === 'servicios' && (userRole === 'admin' || userNivel >= 3) && <ServiciosPanel />}
                {tabActivo === 'profesionales' && (userRole === 'admin' || userNivel >= 3) && <ProfesionalesPanel />}
                {tabActivo === 'clientes' && (userRole === 'admin' || userNivel >= 2) && (
                    <div className="bg-white rounded-xl shadow-sm p-6"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">👥 Clientes Registrados ({clientesRegistrados.length})</h2><button onClick={() => { setShowClientesRegistrados(!showClientesRegistrados); if (!showClientesRegistrados) loadClientesRegistrados(); }} className="text-purple-600 text-sm">{showClientesRegistrados ? '▲ Ocultar' : '▼ Mostrar'}</button></div>
                    {showClientesRegistrados && (<div className="space-y-2 max-h-96 overflow-y-auto">{clientesRegistrados.length === 0 ? <p className="text-center text-gray-500">No hay clientes registrados</p> : clientesRegistrados.map((cliente, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><div><p className="font-medium">{cliente.nombre}</p><p className="text-sm text-gray-500">+{cliente.whatsapp}</p></div>{(userRole === 'admin' || userNivel >= 3) && <button onClick={() => window.eliminarCliente(cliente.whatsapp).then(() => loadClientesRegistrados())} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Quitar</button>}</div>))}</div>)}</div>
                )}

                {/* RESERVAS - con toggle entre Calendario y Lista */}
                {tabActivo === 'reservas' && (
                    <>
                        {userRole === 'profesional' && profesional && (<div className="bg-purple-50 border border-purple-200 rounded-lg p-4"><p className="text-purple-800 font-medium">Hola {profesional.nombre} 👋 - Panel de reservas</p></div>)}
                        
                        {/* Toggle de vistas */}
                        <div className="bg-white p-2 rounded-xl shadow-sm flex gap-2 w-fit">
                            <button onClick={() => setVistaReservas('calendario')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${vistaReservas === 'calendario' ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><span>📅</span>Vista Calendario</button>
                            <button onClick={() => setVistaReservas('lista')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${vistaReservas === 'lista' ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><span>📋</span>Vista Lista</button>
                        </div>
                        
                        {vistaReservas === 'calendario' ? (
                            <AdminCalendar bookings={bookings} loading={loading} onEventClick={handleCalendarEventClick} onDateSelect={handleCalendarDateSelect} />
                        ) : (
                            <ListaDeReservas bookings={bookings} loading={loading} filterDate={filterDate} setFilterDate={setFilterDate} statusFilter={statusFilter} setStatusFilter={setStatusFilter} handleCancel={handleCancel} confirmarPago={confirmarPago} borrarCanceladas={borrarCanceladas} formatTo12Hour={formatTo12Hour} activasCount={activasCount} pendientesCount={pendientesCount} completadasCount={completadasCount} canceladasCount={canceladasCount} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);