// admin-app.js - Panel de administración (VERSIÓN DEFINITIVA - CLOSURES Y BLOQUEOS CORREGIDOS)
// Optimizaciones: Bloqueo Estricto FullCalendar, Normalización de días, Fix de Stale Closures.

console.log('🚀 ADMIN-APP.JS - Versión de Ingeniería Senior v3.0');

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
// FUNCIONES DE UTILIDAD (ZONA GLOBAL)
// ============================================
function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId) return localId;
    if (window.NEGOCIO_ID_POR_DEFECTO) return window.NEGOCIO_ID_POR_DEFECTO;
    if (typeof window.getNegocioId === 'function') return window.getNegocioId();
    return null;
}

// Utilidad global implacable para evitar errores por tildes o mayúsculas al comparar días
const normalizarTexto = (texto) => {
    if (!texto) return "";
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Función para escapar HTML (seguridad)
const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
};

// ============================================
// FUNCIONES DE SUPABASE
// ============================================
async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) return [];
        
        const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&select=*&order=fecha.asc,hora_inicio.asc`;
        const res = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) return [];
        const data = await res.json();
        console.log('✅ Reservas obtenidas:', data.length);
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

const timeToMinutes = (time) => { const [h,m] = time.split(':').map(Number); return h*60+m; };
const formatTo12Hour = (time) => { const [h,m] = time.split(':'); const hour = parseInt(h); const ampm = hour>=12?'PM':'AM'; const h12 = hour%12||12; return `${h12}:${m} ${ampm}`; };
const calculateEndTime = (startTime, duration) => { const [h,m] = startTime.split(':').map(Number); const total = h*60+m+duration; return `${Math.floor(total/60).toString().padStart(2,'0')}:${(total%60).toString().padStart(2,'0')}`; };
const getCurrentLocalDate = () => { const ahora = new Date(); return `${ahora.getFullYear()}-${(ahora.getMonth()+1).toString().padStart(2,'0')}-${ahora.getDate().toString().padStart(2,'0')}`; };
const indiceToHoraLegible = (indice) => { const horas = Math.floor(indice/2); const minutos = indice%2===0?'00':'30'; return `${horas.toString().padStart(2,'0')}:${minutos}`; };

// ============================================
// COMPONENTE AdminCalendar (EL CALENDARIO GRANDE)
// ============================================
function AdminCalendar({ bookings, loading, onEventClick, onDateSelect, diasCerradosFechas = [], filtroProfesional = 'todos', filtroServicio = 'todos', profesionalesList = [], fechasConHorarios = {} }) {
    const calendarRef = React.useRef(null);
    const calendarApiRef = React.useRef(null);
    const [eventosCargados, setEventosCargados] = React.useState(false);
    const [diasNoLaborables, setDiasNoLaborables] = React.useState([]);

    // REF MÁGICO: Rompe el closure de React. Siempre tiene la data fresca sin reiniciar el calendario.
    const datosReales = React.useRef({ filtroProfesional, diasNoLaborables, fechasConHorarios, diasCerradosFechas, profesionalesList });

    React.useEffect(() => {
        const cargarHorariosProfesional = async () => {
            if (filtroProfesional === 'todos' || !profesionalesList.length) {
                setDiasNoLaborables([]);
                return;
            }
            
            const profesional = profesionalesList.find(p => p.id == filtroProfesional);
            if (!profesional) return;
            
            try {
                const horarios = await window.salonConfig.getHorariosProfesional(profesional.id);
                const horariosPorDiaObj = horarios.horariosPorDia || {};
                
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                
                const noTrabaja = diasSemana.filter(dia => {
                    const diaNorm = normalizarTexto(dia);
                    const slots = horariosPorDiaObj[dia] || horariosPorDiaObj[diaNorm];
                    return !slots || slots.length === 0;
                });
                
                setDiasNoLaborables(noTrabaja);
            } catch (error) {
                console.error('Error cargando horarios:', error);
            }
        };
        cargarHorariosProfesional();
    }, [filtroProfesional, profesionalesList]);

    // MANTENEMOS EL REF ACTUALIZADO Y FORZAMOS EL REPINTADO DE CELDAS
    React.useEffect(() => {
        datosReales.current = { filtroProfesional, diasNoLaborables, fechasConHorarios, diasCerradosFechas, profesionalesList };
        
        if (calendarApiRef.current) {
            calendarApiRef.current.setOption('dayCellClassNames', getDayCellClassNames);
        }
    }, [filtroProfesional, diasNoLaborables, fechasConHorarios, diasCerradosFechas, profesionalesList]);

    // Función para verificar si hay algún profesional que trabaje este día
    const hayProfesionalDisponibleEnDia = (fechaObj) => {
        const datos = datosReales.current;
        if (datos.filtroProfesional !== 'todos') return true;
        
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[fechaObj.getDay()];
        const diaNorm = normalizarTexto(diaSemana);
        
        for (const prof of datos.profesionalesList) {
            if (!prof.activo) continue;
            // Simplificado: si hay profesionales, asumimos que podrían tener disponibilidad
            // La validación real se hace con fechasConHorarios
            return true;
        }
        return datos.profesionalesList.length > 0;
    };

    // Función de cálculo de clases visuales (Usa el Ref Mágico)
    const getDayCellClassNames = (arg) => {
        const datos = datosReales.current;
        const year = arg.date.getFullYear();
        const month = String(arg.date.getMonth() + 1).padStart(2, '0');
        const day = String(arg.date.getDate()).padStart(2, '0');
        const fechaStr = `${year}-${month}-${day}`;
        
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[arg.date.getDay()];
        const diaNorm = normalizarTexto(diaSemana);
        const hoy = getCurrentLocalDate();
        
        const clases = [];
        
        if (fechaStr < hoy) {
            clases.push('bg-gray-50', 'opacity-50', 'pointer-events-none');
        } else if (datos.diasCerradosFechas.includes(fechaStr)) {
            clases.push('bg-red-50', 'opacity-50', 'pointer-events-none', 'dia-cerrado');
        } else if (datos.filtroProfesional !== 'todos') {
            const noLabNorm = datos.diasNoLaborables.map(normalizarTexto);
            
            if (noLabNorm.includes(diaNorm)) {
                clases.push('bg-gray-200', 'opacity-60', 'pointer-events-none', 'cursor-not-allowed');
            } else if (datos.fechasConHorarios[fechaStr] === true) {
                clases.push('bg-green-50', 'hover:bg-green-100', 'cursor-pointer');
            } else if (datos.fechasConHorarios[fechaStr] === false) {
                clases.push('bg-red-50', 'opacity-80', 'pointer-events-none');
            }
        } else {
            clases.push('hover:bg-pink-50', 'cursor-pointer');
        }
        
        return clases;
    };

    // Función silenciosa para validar el click (Usa el Ref Mágico)
    const esFechaValidaParaCita = (fechaStr, dateObj) => {
        const datos = datosReales.current;
        const hoy = getCurrentLocalDate();
        
        if (fechaStr < hoy) return false;
        if (datos.diasCerradosFechas.includes(fechaStr)) return false;
        
        if (datos.filtroProfesional !== 'todos') {
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const diaSemana = diasSemana[dateObj.getDay()];
            const diaNorm = normalizarTexto(diaSemana);
            const noLabNorm = datos.diasNoLaborables.map(normalizarTexto);
            
            if (noLabNorm.includes(diaNorm)) return false;
            if (datos.fechasConHorarios[fechaStr] === false) return false;
        }
        return true;
    };

    // Inicializar calendario UNA SOLA VEZ
    React.useEffect(() => {
        if (!calendarRef.current || calendarApiRef.current) return;
        
        const cal = new FullCalendar.Calendar(calendarRef.current, {
            locale: 'es',
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            editable: false,
            eventClick: (info) => {
                onEventClick(info.event);
            },
            dateClick: (info) => {
                const year = info.date.getFullYear();
                const month = String(info.date.getMonth() + 1).padStart(2, '0');
                const day = String(info.date.getDate()).padStart(2, '0');
                const fechaStr = `${year}-${month}-${day}`;
                
                if (esFechaValidaParaCita(fechaStr, info.date)) {
                    onDateSelect(info.dateStr);
                }
            },
            height: 500,
            slotMinTime: '08:00:00',
            slotMaxTime: '16:00:00',
            allDaySlot: false,
            nowIndicator: true,
            slotDuration: '00:30:00',
            slotLabelInterval: '01:00',
            lazyFetching: true,
            dayMaxEvents: 3,
            dayCellClassNames: getDayCellClassNames
        });
        
        cal.render();
        calendarApiRef.current = cal;
        
        return () => {
            if (calendarApiRef.current) {
                calendarApiRef.current.destroy();
                calendarApiRef.current = null;
            }
        };
    }, []);

    // Actualizar eventos cuando cambian las reservas
    React.useEffect(() => {
        if (!calendarApiRef.current) return;
        
        let reservasActivas = bookings.filter(b => b.estado === 'Reservado' || b.estado === 'Pendiente');
        
        if (filtroProfesional !== 'todos') {
            reservasActivas = reservasActivas.filter(b => 
                b.profesional_id == filtroProfesional || 
                b.profesional_nombre === filtroProfesional ||
                (b.trabajador_nombre && b.trabajador_nombre === filtroProfesional)
            );
        }
        
        if (filtroServicio !== 'todos') {
            reservasActivas = reservasActivas.filter(b => b.servicio === filtroServicio);
        }
        
        const events = reservasActivas.map(booking => {
            let backgroundColor = '#10B981';
            if (booking.estado === 'Pendiente') backgroundColor = '#F59E0B';
            const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignado';
            
            return {
                id: String(booking.id),
                title: `${booking.servicio} - ${booking.cliente_nombre}`,
                start: `${booking.fecha}T${booking.hora_inicio}`,
                end: `${booking.fecha}T${booking.hora_fin}`,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                extendedProps: { ...booking, profesional_nombre: profesional }
            };
        });
        
        calendarApiRef.current.removeAllEvents();
        if (events.length > 0) {
            calendarApiRef.current.addEventSource(events);
        }
        setEventosCargados(true);
    }, [bookings, filtroProfesional, filtroServicio]);

    return (
        <div className="bg-white rounded-xl shadow-sm p-2 animate-fade-in relative">
            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-xl transition-all">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto shadow-sm"></div>
                    <p className="text-pink-700 font-medium mt-3 text-sm bg-white/80 px-3 py-1 rounded-full shadow-sm">Actualizando reservas...</p>
                </div>
            )}

            <div className="text-xs text-gray-400 text-center mb-2 flex justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Confirmado</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Pendiente</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-400"></div><span>Día Cerrado / Lleno</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-300"></div><span>No laborable</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-200"></div><span>Disponible</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-100"></div><span>🚫 Día Cerrado</span></div>
            </div>
            
            <div ref={calendarRef} style={{ minHeight: '450px' }}></div>
            
            {!eventosCargados && bookings.length > 0 && !loading && (
                <div className="text-center py-2 text-yellow-600 text-sm">Cargando eventos...</div>
            )}
        </div>
    );
}

// ============================================
// COMPONENTE ListaDeReservas (Vista Lista Original)
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
                    {filterDate && <button onClick={() => setFilterDate('')} className="text-pink-500 text-sm">Limpiar filtro</button>}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => setStatusFilter('activas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'activas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Activas ({activasCount})</button>
                    <button onClick={() => setStatusFilter('pendientes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'pendientes' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Pendientes ({pendientesCount})</button>
                    <button onClick={() => setStatusFilter('completadas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'completadas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Completadas ({completadasCount})</button>
                    <button onClick={() => setStatusFilter('canceladas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'canceladas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Canceladas ({canceladasCount})</button>
                    <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'todas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Todas ({bookings.length})</button>
                    {statusFilter === 'canceladas' && <button onClick={borrarCanceladas} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm">🗑️ Borrar todas</button>}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div><p className="text-pink-500 mt-4">Cargando reservas...</p></div>
            ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl"><p className="text-gray-500">No hay reservas para mostrar</p></div>
            ) : (
                filteredBookings.map(b => (
                    <div key={b.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                        b.estado === 'Reservado' ? 'border-l-pink-500' :
                        b.estado === 'Pendiente' ? 'border-l-yellow-500' :
                        b.estado === 'Completado' ? 'border-l-green-500' :
                        'border-l-red-500'
                    }`}>
                        <div className="flex justify-between mb-2">
                            <span className="font-semibold">{window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha}</span>
                            <span className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded-full">{formatTo12Hour(b.hora_inicio)}</span>
                        </div>
                        <div className="text-sm space-y-1">
                            <p><span className="font-medium">👤 Cliente:</span> {b.cliente_nombre}</p>
                            <p><span className="font-medium">📱 WhatsApp:</span> {b.cliente_whatsapp}</p>
                            <p><span className="font-medium">💅 Servicio:</span> {b.servicio}</p>
                            <p><span className="font-medium">👩‍🎨 Profesional:</span> {b.profesional_nombre || b.trabajador_nombre}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.estado === 'Reservado' ? 'bg-pink-100 text-pink-700' : b.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : b.estado === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {b.estado}
                            </span>
                            <div className="flex gap-2">
                                {b.estado === 'Pendiente' && (
                                    <button onClick={() => confirmarPago(b.id, b)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">✅ Confirmar pago</button>
                                )}
                                {b.estado === 'Reservado' && (
                                    <button onClick={() => handleCancel(b.id, b)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">❌ Cancelar</button>
                                )}
                            </div>
                        </div>
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
    const [configVersion, setConfigVersion] = React.useState(0);
    
    const [tabActivo, setTabActivo] = React.useState('reservas');
    
    const [vistaReservas, setVistaReservas] = React.useState(() => {
        const guardada = localStorage.getItem('vistaReservas');
        return guardada === 'lista' ? 'lista' : 'calendario';
    });
    
    const [filtroProfesional, setFiltroProfesional] = React.useState('todos');
    const [filtroServicio, setFiltroServicio] = React.useState('todos');
    
    const [showClientesRegistrados, setShowClientesRegistrados] = React.useState(false);
    const [clientesRegistrados, setClientesRegistrados] = React.useState([]);
    const [errorClientes, setErrorClientes] = React.useState('');
    const [cargandoClientes, setCargandoClientes] = React.useState(false);

    const [showNuevaReservaModal, setShowNuevaReservaModal] = React.useState(false);
    const [nuevaReservaData, setNuevaReservaData] = React.useState({
        cliente_nombre: '',
        cliente_whatsapp: '',
        servicio: '',
        profesional_id: '',
        fecha: '',
        hora_inicio: '',
        requiereAnticipo: false
    });
    
    const [showDisponibilidadModal, setShowDisponibilidadModal] = React.useState(false);
    const [disponibilidadFecha, setDisponibilidadFecha] = React.useState(new Date());
    const [disponibilidadHoras, setDisponibilidadHoras] = React.useState([]);
    const [disponibilidadCargando, setDisponibilidadCargando] = React.useState(false);
    const [disponibilidadDias, setDisponibilidadDias] = React.useState({});
    const [diasCerradosFechas, setDiasCerradosFechas] = React.useState([]);
    const [profesionalSeleccionadoDispo, setProfesionalSeleccionadoDispo] = React.useState(null);

    const [serviciosList, setServiciosList] = React.useState([]);
    const [profesionalesList, setProfesionalesList] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});

    React.useEffect(() => {
        localStorage.setItem('vistaReservas', vistaReservas);
    }, [vistaReservas]);

    const cargarDiasCerradosDirecto = async () => {
        try {
            const negocioId = getNegocioId();
            if (!negocioId) return [];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&select=fecha`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) return [];
            
            const data = await response.json();
            const fechas = data.map(d => d.fecha);
            setDiasCerradosFechas(fechas);
            return fechas;
        } catch (error) {
            console.error('Error cargando días cerrados:', error);
            return [];
        }
    };

    React.useEffect(() => {
        window.getNombreNegocio().then(nombre => {
            setNombreNegocio(nombre);
        });
        
        cargarConfiguracion();
    }, [configVersion]);

    const cargarConfiguracion = async () => {
        try {
            const configData = await window.cargarConfiguracionNegocio(true);
            setConfig(configData);
            if (configData?.nombre) {
                setNombreNegocio(configData.nombre);
            }
            if (configData?.logo_url) {
                setLogoNegocio(configData.logo_url);
            }
            console.log('✅ Configuración recargada:', configData);
        } catch (error) {
            console.error('Error cargando config:', error);
        }
    };

    React.useEffect(() => {
        const profesionalAuth = window.getProfesionalAutenticado?.();
        if (profesionalAuth) {
            console.log('👤 Usuario detectado como profesional:', profesionalAuth);
            setUserRole('profesional');
            setProfesional(profesionalAuth);
            setUserNivel(profesionalAuth.nivel || 1);
            setProfesionalSeleccionadoDispo(profesionalAuth.id);
            
            setNuevaReservaData(prev => ({
                ...prev,
                profesional_id: profesionalAuth.id
            }));
        } else {
            console.log('👑 Usuario detectado como admin');
            setUserRole('admin');
            setUserNivel(3);
        }
    }, []);

    React.useEffect(() => {
        const cargarDatosModal = async () => {
            if (window.salonServicios) {
                const servicios = await window.salonServicios.getAll(true);
                setServiciosList(servicios || []);
            }
            if (window.salonProfesionales) {
                const profesionales = await window.salonProfesionales.getAll(true);
                setProfesionalesList(profesionales || []);
            }
        };
        cargarDatosModal();
    }, []);

    React.useEffect(() => {
        cargarDiasCerradosDirecto();
    }, []);

    React.useEffect(() => {
        const cargarDiasLaborales = async () => {
            if (nuevaReservaData.profesional_id) {
                try {
                    const horarios = await window.salonConfig.getHorariosProfesional(nuevaReservaData.profesional_id);
                    setDiasLaborales(horarios.dias || []);
                    await cargarDisponibilidadMes(currentDate, nuevaReservaData.profesional_id);
                } catch (error) {
                    console.error('Error cargando días laborales:', error);
                    setDiasLaborales([]);
                }
            }
        };
        cargarDiasLaborales();
    }, [nuevaReservaData.profesional_id]);

    React.useEffect(() => {
        if (showNuevaReservaModal) {
            cargarDiasCerradosDirecto();
        }
    }, [showNuevaReservaModal]);

    React.useEffect(() => {
        const cargarHorarios = async () => {
            if (!nuevaReservaData.profesional_id || !nuevaReservaData.fecha || !nuevaReservaData.servicio) {
                setHorariosDisponibles([]);
                return;
            }

            try {
                const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
                if (!servicio) return;

                const horarios = await window.salonConfig.getHorariosProfesional(nuevaReservaData.profesional_id);
                const horariosPorDia = horarios.horariosPorDia || {};
                
                const partes = nuevaReservaData.fecha.split('-');
                const año = parseInt(partes[0]);
                const mes = parseInt(partes[1]) - 1;
                const día = parseInt(partes[2]);
                const fechaSeleccionada = new Date(año, mes, día);
                
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                let diaSemana = diasSemana[fechaSeleccionada.getDay()];
                
                diaSemana = normalizarTexto(diaSemana);
                
                const horariosNormalizados = {};
                for (const [key, value] of Object.entries(horariosPorDia)) {
                    horariosNormalizados[normalizarTexto(key)] = value;
                }
                
                const indicesDelDia = horariosNormalizados[diaSemana] || [];
                
                if (indicesDelDia.length === 0) {
                    setHorariosDisponibles([]);
                    return;
                }
                
                const slotsTrabajo = indicesDelDia.map(indice => indiceToHoraLegible(indice));
                
                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?fecha=eq.${nuevaReservaData.fecha}&profesional_id=eq.${nuevaReservaData.profesional_id}&estado=neq.Cancelado&select=hora_inicio,hora_fin`,
                    {
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                        }
                    }
                );
                
                const reservas = await response.json();

                const ahora = new Date();
                const horaActual = ahora.getHours();
                const minutosActuales = ahora.getMinutes();
                const totalMinutosActual = horaActual * 60 + minutosActuales;
                const minAllowedMinutes = totalMinutosActual + 120;

                const hoy = getCurrentLocalDate();
                const esHoy = nuevaReservaData.fecha === hoy;

                const disponibles = slotsTrabajo.filter(slot => {
                    const [horas, minutos] = slot.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + servicio.duracion;

                    if (esHoy && slotStart < minAllowedMinutes) {
                        return false;
                    }

                    const tieneConflicto = reservas.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });

                    return !tieneConflicto;
                });

                disponibles.sort((a, b) => {
                    const [hA, mA] = a.split(':').map(Number);
                    const [hB, mB] = b.split(':').map(Number);
                    return (hA * 60 + mA) - (hB * 60 + mB);
                });

                setHorariosDisponibles(disponibles);

            } catch (error) {
                console.error('Error cargando horarios:', error);
                setHorariosDisponibles([]);
            }
        };

        cargarHorarios();
    }, [nuevaReservaData.profesional_id, nuevaReservaData.fecha, nuevaReservaData.servicio, serviciosList]);

    // ACTUALIZAR MAPA DE DISPONIBILIDAD GLOBAL
    const actualizarMapaDisponibilidad = async (fechaBase, profId) => {
        try {
            const horarios = await window.salonConfig.getHorariosProfesional(profId);
            const horariosPorDiaBruto = horarios.horariosPorDia || {};
            
            const horariosPorDia = {};
            for (const [key, value] of Object.entries(horariosPorDiaBruto)) {
                horariosPorDia[normalizarTexto(key)] = value;
            }

            const year = fechaBase.getFullYear();
            const month = fechaBase.getMonth();
            const ultimoDia = new Date(year, month + 1, 0).getDate();
            
            const mapa = {};
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

            for (let d = 1; d <= ultimoDia; d++) {
                const actual = new Date(year, month, d);
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                
                const diaSemana = nombresDias[actual.getDay()];
                const diaNorm = normalizarTexto(diaSemana);
                
                const slots = horariosPorDia[diaNorm] || [];
                
                if (slots.length === 0) {
                    mapa[fechaStr] = false;
                    continue;
                }

                const reservasDia = bookings.filter(b => b.fecha === fechaStr && b.profesional_id == profId && b.estado !== 'Cancelado');
                mapa[fechaStr] = reservasDia.length < slots.length;
            }
            setFechasConHorarios(mapa);
        } catch (e) { console.error(e); }
    };

    // Refrescar mapa cuando cambian las reservas
    React.useEffect(() => {
        if (filtroProfesional !== 'todos') {
            actualizarMapaDisponibilidad(new Date(), filtroProfesional);
        }
    }, [bookings, filtroProfesional]);

    // FUNCIONES DE DISPONIBILIDAD (MODAL MÁS INFO)
    const cargarDisponibilidadMes = async (fecha, profesionalId) => {
        if (!profesionalId) return;
        
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            
            const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
            const diasTrabajo = horarios.dias || [];
            const horariosPorDia = horarios.horariosPorDia || {};
            
            const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            const reservas = await response.json();
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const diasEnMes = ultimoDia.getDate();
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                
                if (fechasLibresPersonales.includes(fechaStr)) {
                    disponibilidad[fechaStr] = false;
                    continue;
                }
                
                const fechaActual = new Date(year, month, d);
                const diaSemana = nombresDias[fechaActual.getDay()];
                const diaNormalizado = normalizarTexto(diaSemana);
                
                const horariosNormalizados = {};
                for (const [key, value] of Object.entries(horariosPorDia)) {
                    horariosNormalizados[normalizarTexto(key)] = value;
                }
                
                const horariosDelDia = horariosNormalizados[diaNormalizado] || [];
                
                if (horariosDelDia.length === 0) {
                    disponibilidad[fechaStr] = false;
                    continue;
                }
                
                let trabajaEsteDia = true;
                const diasTrabajoNorm = diasTrabajo.map(normalizarTexto);
                if (diasTrabajoNorm.length > 0 && !diasTrabajoNorm.includes(diaNormalizado)) {
                    trabajaEsteDia = false;
                }
                
                if (!trabajaEsteDia) {
                    disponibilidad[fechaStr] = false;
                    continue;
                }
                
                let horariosOcupados = 0;
                const reservasDia = reservasPorFecha[fechaStr] || [];
                
                for (const horaIndice of horariosDelDia) {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const [horas, minutos] = slotStr.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + 60; 
                    
                    const tieneConflicto = reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                    
                    if (tieneConflicto) {
                        horariosOcupados++;
                    }
                }
                
                const tieneDisponibilidad = horariosOcupados < horariosDelDia.length;
                disponibilidad[fechaStr] = tieneDisponibilidad;
            }
            
            setFechasConHorarios(disponibilidad);
        } catch (error) {
            console.error('Error cargando disponibilidad:', error);
        }
    };

    const cargarDisponibilidadDelMes = async (fecha, profesionalId = null) => {
        if (!profesionalId && profesionalesList.length > 0) {
            profesionalId = profesionalesList[0]?.id;
        }
        if (!profesionalId) return;
        
        setDisponibilidadCargando(true);
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            
            const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
            const diasTrabajo = horarios.dias || [];
            const horariosPorDia = horarios.horariosPorDia || {};
            
            const profesionalObj = profesionalesList.find(p => p.id === profesionalId);
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            const reservas = await response.json();
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const diasEnMes = ultimoDia.getDate();
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                
                if (fechasLibresPersonales.includes(fechaStr)) {
                    disponibilidad[fechaStr] = false;
                    continue;
                }
                
                const fechaActual = new Date(year, month, d);
                const diaSemana = nombresDias[fechaActual.getDay()];
                const diaNormalizado = normalizarTexto(diaSemana);
                
                const horariosNormalizados = {};
                for (const [key, value] of Object.entries(horariosPorDia)) {
                    horariosNormalizados[normalizarTexto(key)] = value;
                }
                
                const horariosDelDia = horariosNormalizados[diaNormalizado] || [];
                
                if (horariosDelDia.length === 0) {
                    disponibilidad[fechaStr] = false;
                    continue;
                }
                
                let trabajaEsteDia = true;
                const diasTrabajoNorm = diasTrabajo.map(normalizarTexto);
                if (diasTrabajoNorm.length > 0 && !diasTrabajoNorm.includes(diaNormalizado)) {
                    trabajaEsteDia = false;
                }
                
                if (!trabajaEsteDia) {
                    disponibilidad[fechaStr] = false;
                    continue;
                }
                
                let horariosOcupados = 0;
                const reservasDia = reservasPorFecha[fechaStr] || [];
                
                for (const horaIndice of horariosDelDia) {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const [horas, minutos] = slotStr.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + 60;
                    
                    const tieneConflicto = reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                    
                    if (tieneConflicto) {
                        horariosOcupados++;
                    }
                }
                
                const tieneDisponibilidad = horariosOcupados < horariosDelDia.length;
                disponibilidad[fechaStr] = tieneDisponibilidad;
            }
            
            setDisponibilidadDias(disponibilidad);
        } catch (error) {
            console.error('Error cargando disponibilidad del mes:', error);
        } finally {
            setDisponibilidadCargando(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };
    
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    
    const isDateAvailable = (date) => {
        if (!date || !nuevaReservaData.profesional_id) return false;
        
        const fechaStr = formatDate(date);
        const hoy = getCurrentLocalDate();

        if (fechaStr < hoy) return false;
        if (diasCerradosFechas.includes(fechaStr)) return false;
        
        const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
        if (!profesional) return false;

        if (profesional.fechas_libres && profesional.fechas_libres.includes(fechaStr)) return false;
        
        const fechaLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = nombresDias[fechaLocal.getDay()];

        const diasLaboralesNorm = diasLaborales.map(normalizarTexto);

        if (diasLaboralesNorm.length > 0 && !diasLaboralesNorm.includes(normalizarTexto(diaSemana))) {
            return false;
        }

        return fechasConHorarios[fechaStr] === true;
    };
    
    const handleDateSelect = (date) => {
        if (isDateAvailable(date)) {
            const fechaStr = formatDate(date);
            setNuevaReservaData({...nuevaReservaData, fecha: fechaStr, hora_inicio: ''});
        }
    };
    
    const cambiarMes = (direccion) => {
        const nuevaFecha = new Date(currentDate);
        nuevaFecha.setMonth(currentDate.getMonth() + direccion);
        setCurrentDate(nuevaFecha);
        
        if (nuevaReservaData.profesional_id) {
            cargarDisponibilidadMes(nuevaFecha, nuevaReservaData.profesional_id);
        }
    };
    
    const cambiarMesDisponibilidad = (direccion) => {
        const nuevaFecha = new Date(disponibilidadFecha);
        nuevaFecha.setMonth(disponibilidadFecha.getMonth() + direccion);
        setDisponibilidadFecha(nuevaFecha);
        cargarDisponibilidadDelMes(nuevaFecha, profesionalSeleccionadoDispo);
    };

    // ============================================
    // NUEVA FUNCIÓN: PANEL DE INFO DEL TURNO
    // ============================================
    const mostrarPanelInfoTurno = (data, eventId) => {
        const modalContainer = document.createElement('div');
        modalContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in';
        modalContainer.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-t-4 border-pink-500">
                <div class="text-center mb-4">
                    <div class="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span class="text-3xl">📅</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">Detalles del Turno</h3>
                </div>
                
                <div class="space-y-3 bg-pink-50 p-4 rounded-xl mb-6">
                    <div class="flex justify-between">
                        <span class="text-gray-600">👤 Cliente:</span>
                        <span class="font-semibold text-gray-800">${escapeHtml(data.cliente_nombre)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">📱 WhatsApp:</span>
                        <span class="font-semibold text-gray-800">${data.cliente_whatsapp}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">💅 Servicio:</span>
                        <span class="font-semibold text-gray-800">${data.servicio}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">👩‍🎨 Profesional:</span>
                        <span class="font-semibold text-gray-800">${data.profesional_nombre || data.trabajador_nombre || 'No asignado'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">📅 Fecha:</span>
                        <span class="font-semibold text-gray-800">${window.formatFechaCompleta ? window.formatFechaCompleta(data.fecha) : data.fecha}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">⏰ Hora:</span>
                        <span class="font-semibold text-gray-800">${formatTo12Hour(data.hora_inicio)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-600">💰 Estado:</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${data.estado === 'Reservado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                            ${data.estado}
                        </span>
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button id="btnCancelar" class="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2">
                        <span>❌</span> Cancelar Turno
                    </button>
                    <button id="btnCerrar" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2">
                        <span>✅</span> OK
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalContainer);
        
        const btnCancelar = modalContainer.querySelector('#btnCancelar');
        const btnCerrar = modalContainer.querySelector('#btnCerrar');
        
        btnCancelar.addEventListener('click', async () => {
            modalContainer.remove();
            if (data.estado === 'Pendiente') {
                confirmarPago(eventId, data);
            } else {
                handleCancel(eventId, data);
            }
        });
        
        btnCerrar.addEventListener('click', () => {
            modalContainer.remove();
        });
        
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
    };

    // ============================================
    // NUEVA FUNCIÓN: SELECCIÓN AUTOMÁTICA DE PROFESIONAL
    // ============================================
    const seleccionarProfesionalConDisponibilidad = async (fechaSeleccionada) => {
        const profesionalesConDisponibilidad = [];
        
        for (const prof of profesionalesList) {
            if (!prof.activo) continue;
            
            const horarios = await window.salonConfig.getHorariosProfesional(prof.id);
            const horariosPorDia = horarios.horariosPorDia || {};
            
            const fecha = new Date(fechaSeleccionada);
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const diaSemana = diasSemana[fecha.getDay()];
            const diaNorm = normalizarTexto(diaSemana);
            
            const horariosNormalizados = {};
            for (const [key, value] of Object.entries(horariosPorDia)) {
                horariosNormalizados[normalizarTexto(key)] = value;
            }
            
            const slotsDelDia = horariosNormalizados[diaNorm] || [];
            if (slotsDelDia.length === 0) continue;
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?fecha=eq.${fechaSeleccionada}&profesional_id=eq.${prof.id}&estado=neq.Cancelado&select=hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            const reservas = await response.json();
            
            let tieneHorarioLibre = false;
            for (const slot of slotsDelDia) {
                const slotStr = indiceToHoraLegible(slot);
                const slotStart = timeToMinutes(slotStr);
                const slotEnd = slotStart + 60;
                
                const ocupado = reservas.some(reserva => {
                    const rStart = timeToMinutes(reserva.hora_inicio);
                    const rEnd = timeToMinutes(reserva.hora_fin);
                    return (slotStart < rEnd && slotEnd > rStart);
                });
                
                if (!ocupado) {
                    tieneHorarioLibre = true;
                    break;
                }
            }
            
            if (tieneHorarioLibre) {
                profesionalesConDisponibilidad.push(prof);
            }
        }
        
        return profesionalesConDisponibilidad;
    };

    // ============================================
    // FUNCIÓN MEJORADA PARA CLICK EN FECHA (CON SELECCIÓN AUTOMÁTICA)
    // ============================================
    const handleCalendarDateSelect = async (dateStr) => {
        const fechaSeleccionada = dateStr.split('T')[0];
        const hoy = getCurrentLocalDate();
        
        if (fechaSeleccionada < hoy) {
            alert('❌ No se pueden crear reservas en fechas pasadas');
            return;
        }
        
        if (diasCerradosFechas.includes(fechaSeleccionada)) {
            alert('❌ El local está cerrado este día. No se pueden crear reservas.');
            return;
        }
        
        const profesionalesDisponibles = await seleccionarProfesionalConDisponibilidad(fechaSeleccionada);
        
        if (profesionalesDisponibles.length === 0) {
            alert('❌ No hay profesionales con disponibilidad para este día.');
            return;
        }
        
        if (profesionalesDisponibles.length === 1) {
            setNuevaReservaData({
                ...nuevaReservaData,
                fecha: fechaSeleccionada,
                profesional_id: profesionalesDisponibles[0].id
            });
            setShowNuevaReservaModal(true);
            return;
        }
        
        const profesionalOptions = profesionalesDisponibles.map(p => 
            `<option value="${p.id}">${escapeHtml(p.nombre)} - ${escapeHtml(p.especialidad)}</option>`
        ).join('');
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in';
        modalContainer.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div class="text-center mb-4">
                    <div class="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span class="text-3xl">👩‍🎨</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">Seleccionar Profesional</h3>
                    <p class="text-gray-500 text-sm mt-1">Varios profesionales tienen disponibilidad para el ${fechaSeleccionada}</p>
                </div>
                
                <select id="profesionalSelect" class="w-full border rounded-lg px-4 py-3 mb-6">
                    ${profesionalOptions}
                </select>
                
                <div class="flex gap-3">
                    <button id="btnConfirmar" class="flex-1 bg-pink-500 text-white py-3 rounded-xl font-semibold hover:bg-pink-600 transition">
                        ✅ Confirmar
                    </button>
                    <button id="btnCancelar" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalContainer);
        
        const btnConfirmar = modalContainer.querySelector('#btnConfirmar');
        const btnCancelar = modalContainer.querySelector('#btnCancelar');
        const selectProf = modalContainer.querySelector('#profesionalSelect');
        
        btnConfirmar.addEventListener('click', () => {
            const profId = selectProf.value;
            setNuevaReservaData({
                ...nuevaReservaData,
                fecha: fechaSeleccionada,
                profesional_id: profId
            });
            setShowNuevaReservaModal(true);
            modalContainer.remove();
        });
        
        btnCancelar.addEventListener('click', () => {
            modalContainer.remove();
        });
        
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
    };

    // ============================================
    // FUNCIÓN MEJORADA PARA CLICK EN EVENTO (PANEL DE INFO)
    // ============================================
    const handleCalendarEventClick = (event) => {
        const data = event.extendedProps;
        mostrarPanelInfoTurno(data, event.id);
    };

    const handleCrearReservaManual = async () => {
        if (!nuevaReservaData.cliente_nombre || !nuevaReservaData.cliente_whatsapp || 
            !nuevaReservaData.servicio || !nuevaReservaData.profesional_id || 
            !nuevaReservaData.fecha || !nuevaReservaData.hora_inicio) {
            alert('Completá todos los campos');
            return;
        }

        try {
            const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
            if (!servicio) {
                alert('Servicio no encontrado');
                return;
            }
            
            const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
            if (!profesional) {
                alert('Profesional no encontrado');
                return;
            }
            
            const endTime = calculateEndTime(nuevaReservaData.hora_inicio, servicio.duracion);
            const configNegocio = await window.cargarConfiguracionNegocio();
            const requiereAnticipo = nuevaReservaData.requiereAnticipo;
            
            const bookingData = {
                cliente_nombre: nuevaReservaData.cliente_nombre,
                cliente_whatsapp: `53${nuevaReservaData.cliente_whatsapp.replace(/\D/g, '')}`,
                servicio: nuevaReservaData.servicio,
                duracion: servicio.duracion,
                profesional_id: nuevaReservaData.profesional_id,
                profesional_nombre: profesional.nombre,
                fecha: nuevaReservaData.fecha,
                hora_inicio: nuevaReservaData.hora_inicio,
                hora_fin: endTime,
                estado: requiereAnticipo ? "Pendiente" : "Reservado"
            };

            const result = await createBooking(bookingData);
            
            if (result.success && result.data) {
                alert(`✅ Reserva creada exitosamente como "${result.data.estado}"`);
                
                try {
                    if (requiereAnticipo) {
                        if (window.enviarMensajePago) {
                            await window.enviarMensajePago(result.data, configNegocio);
                        }
                    } else {
                        if (window.enviarConfirmacionReserva) {
                            await window.enviarConfirmacionReserva(result.data, configNegocio);
                        }
                    }
                } catch (whatsappError) {
                    console.error('❌ Error enviando WhatsApp:', whatsappError);
                    alert('⚠️ Reserva creada, pero hubo un error al enviar el mensaje al cliente.');
                }
                
                setShowNuevaReservaModal(false);
                setNuevaReservaData({
                    cliente_nombre: '',
                    cliente_whatsapp: '',
                    servicio: '',
                    profesional_id: userRole === 'profesional' ? profesional?.id : '',
                    fecha: '',
                    hora_inicio: '',
                    requiereAnticipo: false
                });
                
                fetchBookings();
            } else {
                alert('❌ Error al crear la reserva: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error creando reserva:', error);
            alert('❌ Error al crear la reserva: ' + error.message);
        }
    };

    const loadClientesRegistrados = async () => {
        setCargandoClientes(true);
        try {
            if (typeof window.getClientesRegistrados !== 'function') {
                setClientesRegistrados([]);
                return;
            }
            const registrados = await window.getClientesRegistrados();
            if (Array.isArray(registrados)) {
                setClientesRegistrados(registrados);
            } else {
                setClientesRegistrados([]);
            }
        } catch (error) {
            setClientesRegistrados([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    const handleEliminarCliente = async (whatsapp) => {
        if (!confirm('¿Seguro que querés eliminar este cliente? Perderá el acceso a la app.')) return;
        try {
            if (typeof window.eliminarCliente !== 'function') {
                alert('Error: Función no disponible');
                return;
            }
            const resultado = await window.eliminarCliente(whatsapp);
            if (resultado) {
                await loadClientesRegistrados();
                alert(`✅ Cliente eliminado`);
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            alert('Error al eliminar cliente');
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            let data;
            if (userRole === 'profesional' && profesional) {
                data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
            } else {
                data = await getAllBookings();
            }
            
            if (Array.isArray(data)) {
                data.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
                await marcarTurnosCompletados();
                
                if (userRole === 'profesional' && profesional) {
                    data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
                } else {
                    data = await getAllBookings();
                }
                setBookings(Array.isArray(data) ? data : []);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert('Error al cargar las reservas');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const intervalo = setInterval(() => {
            marcarTurnosCompletados().then(() => {
                fetchBookings();
            });
        }, 60000);
        return () => clearInterval(intervalo);
    }, []);

    React.useEffect(() => {
        fetchBookings();
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            loadClientesRegistrados();
        }
    }, [userRole, userNivel, profesional]);

    const confirmarPago = async (id, bookingData) => {
        if (!confirm(`¿Confirmar que se recibió el pago de ${bookingData.cliente_nombre}? El turno pasará a "Reservado".`)) return;
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: 'Reservado' })
                }
            );
            if (!response.ok) throw new Error('Error al confirmar pago');
            
            const configNegocio = await window.cargarConfiguracionNegocio();
            const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(bookingData.fecha) : bookingData.fecha;
            const horaFormateada = window.formatTo12Hour ? window.formatTo12Hour(bookingData.hora_inicio) : bookingData.hora_inicio;
            const nombreNegocio = configNegocio?.nombre || await window.getNombreNegocio ? await window.getNombreNegocio() : 'Mi Negocio';
            
            const mensajeCliente = `💅 *${nombreNegocio} - Turno Confirmado* 🎉\n\nHola *${bookingData.cliente_nombre}*, ¡tu turno ha sido CONFIRMADO!\n\n📅 *Fecha:* ${fechaConDia}\n⏰ *Hora:* ${horaFormateada}\n💅 *Servicio:* ${bookingData.servicio}\n👩‍🎨 *Profesional:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}\n\n✅ *Pago recibido correctamente*\n\nTe esperamos 💖\nCualquier cambio, podés cancelarlo desde la app con hasta 1 hora de anticipación.`;
            window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);
            alert('✅ Pago confirmado. Turno reservado y cliente notificado.');
            fetchBookings();
        } catch (error) {
            console.error('Error confirmando pago:', error);
            alert('❌ Error al confirmar el pago');
        }
    };

    const borrarCanceladas = async () => {
        if (!confirm('¿Estás segura de querer borrar TODAS las reservas canceladas? Esta acción no se puede deshacer.')) return;
        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Cancelado`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (!response.ok) {
                alert('❌ Error al borrar las reservas canceladas');
                return;
            }
            alert(`✅ Se borraron todas las reservas canceladas correctamente`);
            fetchBookings();
        } catch (error) {
            alert('❌ Error al conectar con el servidor');
        }
    };

    const handleCancel = async (id, bookingData) => {
        if (!confirm(`¿Cancelar reserva de ${bookingData.cliente_nombre}?`)) return;
        const ok = await cancelBooking(id);
        if (ok) {
            bookingData.cancelado_por = 'admin';
            if (window.notificarCancelacion) {
                await window.notificarCancelacion(bookingData);
            }
            alert('✅ Reserva cancelada');
            fetchBookings();
        } else {
            alert('❌ Error al cancelar');
        }
    };

    const handleLogout = () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('profesionalAuth');
            localStorage.removeItem('userRole');
            localStorage.removeItem('clienteAuth');
            localStorage.removeItem('negocioId');
            window.location.href = 'index.html';
        }
    };

    const getFilteredBookings = () => {
        let filtradas = filterDate ? bookings.filter(b => b.fecha === filterDate) : [...bookings];
        if (statusFilter === 'activas') return filtradas.filter(b => b.estado === 'Reservado');
        if (statusFilter === 'pendientes') return filtradas.filter(b => b.estado === 'Pendiente');
        if (statusFilter === 'completadas') return filtradas.filter(b => b.estado === 'Completado');
        if (statusFilter === 'canceladas') return filtradas.filter(b => b.estado === 'Cancelado');
        return filtradas;
    };

    const activasCount = bookings.filter(b => b.estado === 'Reservado').length;
    const pendientesCount = bookings.filter(b => b.estado === 'Pendiente').length;
    const completadasCount = bookings.filter(b => b.estado === 'Completado').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;
    const filteredBookings = getFilteredBookings();

    const getTabsDisponibles = () => {
        const tabs = [];
        tabs.push({ id: 'reservas', icono: '📅', label: userRole === 'profesional' ? 'Mis Reservas' : 'Reservas' });
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            tabs.push({ id: 'configuracion', icono: '⚙️', label: 'Configuración' });
            tabs.push({ id: 'clientes', icono: '👤', label: 'Clientes' });
        }
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 3)) {
            tabs.push({ id: 'servicios', icono: '💈', label: 'Servicios' });
            tabs.push({ id: 'profesionales', icono: '👥', label: 'Profesionales' });
        }
        return tabs;
    };

    const abrirModalNuevaReserva = () => {
        setNuevaReservaData({
            cliente_nombre: '', cliente_whatsapp: '', servicio: '',
            profesional_id: userRole === 'profesional' ? profesional?.id : '',
            fecha: '', hora_inicio: '', requiereAnticipo: false
        });
        setCurrentDate(new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setShowNuevaReservaModal(true);
    };

    const abrirModalDisponibilidad = () => {
        setDisponibilidadFecha(new Date());
        setShowDisponibilidadModal(true);
        cargarDisponibilidadDelMes(new Date(), profesionalSeleccionadoDispo);
    };

    const tabsDisponibles = getTabsDisponibles();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const days = getDaysInMonth(currentDate);
    const disponibilidadDays = getDaysInMonth(disponibilidadFecha);

    return (
        <div className="min-h-screen bg-pink-50 p-3 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                
                {/* HEADER CON LOGO */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-pink-500">
                    <div className="flex items-center gap-3">
                        {logoNegocio ? (
                            <img src={logoNegocio} alt={nombreNegocio} className="w-12 h-12 object-contain rounded-xl shadow-lg ring-2 ring-pink-300 bg-white p-1"/>
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center">
                                <span className="text-2xl text-white">💖</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-pink-800">{nombreNegocio}</h1>
                            <p className="text-xs text-pink-500">Panel de Administración</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button onClick={abrirModalNuevaReserva} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg shadow-md border border-green-400">
                            <span className="text-lg">📅</span><span className="font-medium">Nueva Reserva</span>
                        </button>

                        <button onClick={abrirModalDisponibilidad} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-md border border-blue-400">
                            <span className="text-lg">📆</span><span className="font-medium">Ver Disponibilidad</span>
                        </button>

                        <button onClick={() => window.location.href = 'editar-negocio.html'} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg shadow-md border border-pink-400">
                            <span className="text-lg">💖</span><span className="font-medium">Editar Negocio</span>
                        </button>

                        <button onClick={() => {cargarConfiguracion(); setConfigVersion(prev => prev + 1);}} className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 border border-pink-200">
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button onClick={fetchBookings} className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 border border-pink-200">
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button onClick={handleLogout} className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 border border-pink-200">
                            <i className="icon-log-out text-pink-600"></i>
                        </button>
                    </div>
                </div>

                {/* MODAL NUEVA RESERVA */}
                {showNuevaReservaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">📅 Nueva Reserva Manual</h3>
                                <button onClick={() => setShowNuevaReservaModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente *</label>
                                    <input type="text" value={nuevaReservaData.cliente_nombre} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_nombre: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Ej: María Pérez" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del Cliente *</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50">+53</span>
                                        <input type="tel" value={nuevaReservaData.cliente_whatsapp} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2 rounded-r-lg border border-gray-300" placeholder="55002272" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Servicio *</label>
                                    <select value={nuevaReservaData.servicio} onChange={(e) => setNuevaReservaData({...nuevaReservaData, servicio: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Seleccionar servicio</option>
                                        {serviciosList.map(s => (<option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion} min - ${s.precio})</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profesional *</label>
                                    <select value={nuevaReservaData.profesional_id} onChange={(e) => setNuevaReservaData({...nuevaReservaData, profesional_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Seleccionar profesional</option>
                                        {profesionalesList.map(p => (<option key={p.id} value={p.id}>{p.nombre} - {p.especialidad}</option>))}
                                    </select>
                                </div>
                                {userRole === 'admin' && (
                                    <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg">
                                        <input type="checkbox" id="requiereAnticipo" checked={nuevaReservaData.requiereAnticipo} onChange={(e) => setNuevaReservaData({...nuevaReservaData, requiereAnticipo: e.target.checked})} />
                                        <label htmlFor="requiereAnticipo" className="text-sm font-medium text-yellow-800">💰 Requerir anticipo al cliente</label>
                                    </div>
                                )}
                                {nuevaReservaData.profesional_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                                        <div className="bg-white rounded-xl border">
                                            <div className="flex justify-between p-3 bg-gray-50 border-b">
                                                <button onClick={() => cambiarMes(-1)}>◀</button>
                                                <span className="font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                                                <button onClick={() => cambiarMes(1)}>▶</button>
                                            </div>
                                            <div className="p-3">
                                                <div className="grid grid-cols-7 mb-2 text-center text-xs text-gray-400">
                                                    {['D','L','M','M','J','V','S'].map(d => <div key={d}>{d}</div>)}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {days.map((date, idx) => {
                                                        if (!date) return <div key={idx} className="h-10" />;
                                                        const fechaStr = formatDate(date);
                                                        const available = isDateAvailable(date);
                                                        const selected = nuevaReservaData.fecha === fechaStr;
                                                        const esCerrado = diasCerradosFechas.includes(fechaStr);
                                                        const esPasado = fechaStr < getCurrentLocalDate();
                                                        
                                                        const estaBloqueado = !available || esPasado || esCerrado;

                                                        let className = "h-10 w-full rounded-lg text-sm font-medium transition-all ";
                                                        
                                                        if (selected) {
                                                            className += "bg-pink-500 text-white shadow-md z-10 scale-110";
                                                        } else if (estaBloqueado) {
                                                            className += "text-gray-300 cursor-not-allowed bg-gray-50/50 line-through opacity-50";
                                                        } else {
                                                            className += "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer shadow-sm";
                                                        }
                                                        
                                                        return (
                                                            <button 
                                                                key={idx} 
                                                                type="button"
                                                                onClick={() => !estaBloqueado && handleDateSelect(date)} 
                                                                disabled={estaBloqueado}
                                                                className={className} 
                                                                title={estaBloqueado ? "No disponible" : "Seleccionar fecha"}
                                                            >
                                                                {date.getDate()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {nuevaReservaData.fecha && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Hora de inicio *</label>
                                        {horariosDisponibles.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {horariosDisponibles.map(hora => (
                                                    <button key={hora} type="button" onClick={() => setNuevaReservaData({...nuevaReservaData, hora_inicio: hora})} className={`py-2 px-3 rounded-lg text-sm font-medium ${nuevaReservaData.hora_inicio === hora ? 'bg-pink-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                                        {formatTo12Hour(hora)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-gray-500">No hay horarios disponibles</p>}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowNuevaReservaModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
                                    <button onClick={handleCrearReservaManual} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Crear Reserva</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL CALENDARIO DE DISPONIBILIDAD */}
                {showDisponibilidadModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">📆 Disponibilidad Mensual</h3>
                                <button onClick={() => setShowDisponibilidadModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                            </div>
                            
                            {userRole === 'admin' && profesionalesList.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profesional:</label>
                                    <select
                                        value={profesionalSeleccionadoDispo || ''}
                                        onChange={(e) => {
                                            const id = e.target.value ? parseInt(e.target.value) : null;
                                            setProfesionalSeleccionadoDispo(id);
                                            cargarDisponibilidadDelMes(disponibilidadFecha, id);
                                        }}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="">Seleccionar profesional</option>
                                        {profesionalesList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => cambiarMesDisponibilidad(-1)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">◀</button>
                                <span className="text-lg font-bold">{monthNames[disponibilidadFecha.getMonth()]} {disponibilidadFecha.getFullYear()}</span>
                                <button onClick={() => cambiarMesDisponibilidad(1)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">▶</button>
                            </div>
                            
                            {disponibilidadCargando ? (
                                <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-pink-500 mx-auto"></div><p className="mt-2">Cargando disponibilidad...</p></div>
                            ) : (
                                <div>
                                    <div className="grid grid-cols-7 mb-2 text-center">
                                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <div key={d} className="text-xs font-medium text-gray-500">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {disponibilidadDays.map((date, idx) => {
                                            if (!date) return <div key={idx} className="h-12" />;
                                            const fechaStr = formatDate(date);
                                            const disponible = disponibilidadDias[fechaStr] === true;
                                            const esCerrado = diasCerradosFechas.includes(fechaStr);
                                            const esPasado = fechaStr < getCurrentLocalDate();
                                            
                                            let className = "h-12 w-full rounded-lg text-sm font-medium flex flex-col items-center justify-center";
                                            if (esCerrado) className += " bg-red-100 text-red-500 line-through";
                                            else if (esPasado) className += " bg-gray-100 text-gray-400";
                                            else if (disponible) className += " bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer";
                                            else className += " bg-gray-100 text-gray-400";
                                            
                                            return (
                                                <div key={idx} className={className} title={esCerrado ? "Día cerrado" : esPasado ? "Fecha pasada" : disponible ? "Con horarios disponibles" : "Sin horarios disponibles"}>
                                                    <span className="text-lg">{date.getDate()}</span>
                                                    {disponible && !esCerrado && !esPasado && <span className="text-xs text-green-600">✓</span>}
                                                    {esCerrado && <span className="text-xs">🚫</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div><span>Con horarios</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-100 rounded"></div><span>Sin horarios</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-500 rounded"></div><span>Día cerrado</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-100 line-through"></div><span>Fecha pasada</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑAS */}
                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                    {tabsDisponibles.map(tab => (
                        <button key={tab.id} onClick={() => setTabActivo(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tabActivo === tab.id ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            <span>{tab.icono}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENIDO */}
                {tabActivo === 'configuracion' && (
                    <ConfigPanel profesionalId={userRole === 'profesional' ? profesional?.id : null} modoRestringido={userRole === 'profesional' && userNivel === 2} />
                )}

                {tabActivo === 'servicios' && (userRole === 'admin' || userNivel >= 3) && (
                    <ServiciosPanel />
                )}

                {tabActivo === 'profesionales' && (userRole === 'admin' || userNivel >= 3) && (
                    <ProfesionalesPanel />
                )}

                {tabActivo === 'clientes' && (userRole === 'admin' || userNivel >= 2) && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">👥 Clientes Registrados ({clientesRegistrados.length})</h2>
                            <button onClick={() => { setShowClientesRegistrados(!showClientesRegistrados); if (!showClientesRegistrados) loadClientesRegistrados(); }} className="text-pink-600 text-sm">
                                {showClientesRegistrados ? '▲ Ocultar' : '▼ Mostrar'}
                            </button>
                        </div>
                        {showClientesRegistrados && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {clientesRegistrados.length === 0 ? <p className="text-center text-gray-500">No hay clientes registrados</p> :
                                    clientesRegistrados.map((cliente, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div><p className="font-medium">{cliente.nombre}</p><p className="text-sm text-gray-500">+{cliente.whatsapp}</p></div>
                                            {(userRole === 'admin' || userNivel >= 3) && <button onClick={() => handleEliminarCliente(cliente.whatsapp)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">Quitar</button>}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* RESERVAS */}
                {tabActivo === 'reservas' && (
                    <>
                        {userRole === 'profesional' && profesional && (
                            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                                <p className="text-pink-800 font-medium">Hola {profesional.nombre} 👋 - Mostrando tus reservas</p>
                            </div>
                        )}

                        <div className="bg-white p-2 rounded-xl shadow-sm flex gap-2 w-fit">
                            <button onClick={() => setVistaReservas('calendario')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${vistaReservas === 'calendario' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                <span>📅</span>Vista Calendario
                            </button>
                            <button onClick={() => setVistaReservas('lista')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${vistaReservas === 'lista' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                <span>📋</span>Vista Lista
                            </button>
                        </div>

                        <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-pink-600">👩‍🎨 Filtrar por profesional:</span>
                                    <select 
                                        value={filtroProfesional} 
                                        onChange={(e) => setFiltroProfesional(e.target.value)}
                                        className="border rounded-lg px-3 py-1.5 text-sm bg-white"
                                    >
                                        <option value="todos">Todos los profesionales</option>
                                        {profesionalesList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-pink-600">💅 Filtrar por servicio:</span>
                                    <select 
                                        value={filtroServicio} 
                                        onChange={(e) => setFiltroServicio(e.target.value)}
                                        className="border rounded-lg px-3 py-1.5 text-sm bg-white"
                                    >
                                        <option value="todos">Todos los servicios</option>
                                        {serviciosList.map(s => (
                                            <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {(filtroProfesional !== 'todos' || filtroServicio !== 'todos') && (
                                    <button 
                                        onClick={() => {
                                            setFiltroProfesional('todos');
                                            setFiltroServicio('todos');
                                        }}
                                        className="text-sm text-pink-500 hover:text-pink-700 underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </div>

                        {vistaReservas === 'calendario' ? (
                            <AdminCalendar 
                                key="calendario"
                                bookings={bookings} 
                                loading={loading} 
                                onEventClick={handleCalendarEventClick} 
                                onDateSelect={handleCalendarDateSelect}
                                diasCerradosFechas={diasCerradosFechas}
                                filtroProfesional={filtroProfesional}
                                filtroServicio={filtroServicio}
                                profesionalesList={profesionalesList}
                                fechasConHorarios={fechasConHorarios}
                            />
                        ) : (
                            <ListaDeReservas 
                                bookings={bookings} 
                                loading={loading} 
                                filterDate={filterDate} 
                                setFilterDate={setFilterDate} 
                                statusFilter={statusFilter} 
                                setStatusFilter={setStatusFilter} 
                                handleCancel={handleCancel} 
                                confirmarPago={confirmarPago} 
                                borrarCanceladas={borrarCanceladas} 
                                formatTo12Hour={formatTo12Hour} 
                                activasCount={activasCount} 
                                pendientesCount={pendientesCount} 
                                completadasCount={completadasCount} 
                                canceladasCount={canceladasCount} 
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);