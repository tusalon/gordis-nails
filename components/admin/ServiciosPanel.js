// components/admin/ServiciosPanel.js - CON CONTROLES NUMÉRICOS MEJORADOS
// MEJORA: Añade botones + y - además del campo de texto

function ServiciosPanel() {
    const [servicios, setServicios] = React.useState([]);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);

    React.useEffect(() => {
        cargarServicios();
        
        const handleActualizacion = () => cargarServicios();
        window.addEventListener('serviciosActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('serviciosActualizados', handleActualizacion);
        };
    }, []);

    const cargarServicios = async () => {
        setCargando(true);
        try {
            console.log('📋 Cargando servicios...');
            if (window.salonServicios) {
                const lista = await window.salonServicios.getAll(false);
                console.log('✅ Servicios obtenidos:', lista);
                setServicios(lista || []);
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async (servicio) => {
        try {
            console.log('💾 Guardando servicio:', servicio);
            if (editando) {
                await window.salonServicios.actualizar(editando.id, servicio);
            } else {
                await window.salonServicios.crear(servicio);
            }
            await cargarServicios();
            setMostrarForm(false);
            setEditando(null);
        } catch (error) {
            console.error('Error guardando servicio:', error);
            alert('Error al guardar el servicio');
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar este servicio?')) return;
        try {
            console.log('🗑️ Eliminando servicio:', id);
            await window.salonServicios.eliminar(id);
            await cargarServicios();
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            alert('Error al eliminar el servicio');
        }
    };

    const toggleActivo = async (id) => {
        const servicio = servicios.find(s => s.id === id);
        try {
            await window.salonServicios.actualizar(id, { activo: !servicio.activo });
            await cargarServicios();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando servicios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">💈 Servicios</h2>
                <button
                    onClick={() => {
                        setEditando(null);
                        setMostrarForm(true);
                    }}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                >
                    + Nuevo Servicio
                </button>
            </div>

            {mostrarForm && (
                <ServicioForm
                    servicio={editando}
                    onGuardar={handleGuardar}
                    onCancelar={() => {
                        setMostrarForm(false);
                        setEditando(null);
                    }}
                />
            )}

            <div className="space-y-2">
                {servicios.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">No hay servicios cargados</p>
                        <p className="text-sm">Hacé clic en "+ Nuevo Servicio" para comenzar</p>
                    </div>
                ) : (
                    servicios.map(s => (
                        <div key={s.id} className={`border rounded-lg p-4 ${s.activo ? '' : 'opacity-50 bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-lg">{s.nombre}</h3>
                                        <button
                                            onClick={() => toggleActivo(s.id)}
                                            className={`text-xs px-2 py-1 rounded-full ${
                                                s.activo 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {s.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {s.duracion} min | ${s.precio}
                                    </p>
                                    {s.descripcion && (
                                        <p className="text-xs text-gray-500 mt-1">{s.descripcion}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditando(s);
                                            setMostrarForm(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 px-2"
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(s.id)}
                                        className="text-red-600 hover:text-red-800 px-2"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// COMPONENTE MEJORADO: Ahora tiene botones + y - para los números
function ServicioForm({ servicio, onGuardar, onCancelar }) {
    const [form, setForm] = React.useState(servicio || {
        nombre: '',
        duracion: 45,
        precio: 0,
        descripcion: ''
    });

    // Función para incrementar duración en múltiplos de 15
    const incrementarDuracion = () => {
        setForm(prev => ({
            ...prev,
            duracion: Math.min(480, prev.duracion + 15)
        }));
    };

    // Función para decrementar duración en múltiplos de 15
    const decrementarDuracion = () => {
        setForm(prev => ({
            ...prev,
            duracion: Math.max(15, prev.duracion - 15)
        }));
    };

    // Función para incrementar precio
    const incrementarPrecio = () => {
        setForm(prev => ({
            ...prev,
            precio: prev.precio + 500
        }));
    };

    // Función para decrementar precio
    const decrementarPrecio = () => {
        setForm(prev => ({
            ...prev,
            precio: Math.max(0, prev.precio - 500)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!form.nombre.trim()) {
            alert('El nombre del servicio es obligatorio');
            return;
        }
        if (!form.duracion || form.duracion < 15) {
            alert('La duración debe ser al menos 15 minutos');
            return;
        }
        if (!form.precio || form.precio < 0) {
            alert('El precio debe ser un valor válido');
            return;
        }
        
        onGuardar(form);
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold mb-4 text-amber-800">
                {servicio ? '✏️ Editar Servicio' : '➕ Nuevo Servicio'}
            </h3>
            
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del servicio *
                    </label>
                    <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm({...form, nombre: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Ej: Corte de Cabello"
                        required
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    {/* CAMPO DE DURACIÓN MEJORADO */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duración (min) *
                        </label>
                        <div className="flex">
                            <button
                                type="button"
                                onClick={decrementarDuracion}
                                className="px-3 py-2 bg-gray-200 border border-r-0 rounded-l-lg hover:bg-gray-300 font-bold text-lg"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={form.duracion}
                                onChange={(e) => {
                                    const valor = parseInt(e.target.value);
                                    setForm({
                                        ...form, 
                                        duracion: isNaN(valor) ? 45 : Math.min(480, Math.max(15, valor))
                                    });
                                }}
                                className="w-full border border-gray-300 px-3 py-2 text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500 [appearance:auto]"
                                required
                                min="15"
                                max="480"
                                step="15"
                            />
                            <button
                                type="button"
                                onClick={incrementarDuracion}
                                className="px-3 py-2 bg-gray-200 border border-l-0 rounded-r-lg hover:bg-gray-300 font-bold text-lg"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Múltiplos de 15 min (podés escribir o usar los botones)</p>
                    </div>
                    
                    {/* CAMPO DE PRECIO MEJORADO */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio ($) *
                        </label>
                        <div className="flex">
                            <button
                                type="button"
                                onClick={decrementarPrecio}
                                className="px-3 py-2 bg-gray-200 border border-r-0 rounded-l-lg hover:bg-gray-300 font-bold text-lg"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={form.precio}
                                onChange={(e) => {
                                    const valor = parseFloat(e.target.value);
                                    setForm({
                                        ...form, 
                                        precio: isNaN(valor) ? 0 : Math.max(0, valor)
                                    });
                                }}
                                className="w-full border border-gray-300 px-3 py-2 text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500 [appearance:auto]"
                                required
                                min="0"
                                step="0.5"
                            />
                            <button
                                type="button"
                                onClick={incrementarPrecio}
                                className="px-3 py-2 bg-gray-200 border border-l-0 rounded-r-lg hover:bg-gray-300 font-bold text-lg"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Podés escribir o usar los botones (+$500)</p>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                    </label>
                    <textarea
                        value={form.descripcion}
                        onChange={(e) => setForm({...form, descripcion: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        rows="2"
                        placeholder="Descripción opcional del servicio"
                    />
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                    {servicio ? 'Actualizar' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}