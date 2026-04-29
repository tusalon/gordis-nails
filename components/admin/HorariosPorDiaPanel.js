// components/admin/HorariosPorDiaPanel.js - Panel para configurar horarios por día

function HorariosPorDiaPanel({ profesionalId, profesionalNombre, onGuardar, onCancelar }) {
    const [horariosPorDia, setHorariosPorDia] = React.useState({});
    const [horariosEspeciales, setHorariosEspeciales] = React.useState([]);
    const [modoEdicion, setModoEdicion] = React.useState('normal');
    const [especialSeleccionadoId, setEspecialSeleccionadoId] = React.useState('');
    const [cargando, setCargando] = React.useState(true);
    const [diaSeleccionado, setDiaSeleccionado] = React.useState('lunes');
    const [horasDisponibles, setHorasDisponibles] = React.useState([]);

    const dias = [
        { id: 'lunes', nombre: 'Lunes' },
        { id: 'martes', nombre: 'Martes' },
        { id: 'miercoles', nombre: 'Miércoles' },
        { id: 'jueves', nombre: 'Jueves' },
        { id: 'viernes', nombre: 'Viernes' },
        { id: 'sabado', nombre: 'Sábado' },
        { id: 'domingo', nombre: 'Domingo' }
    ];

    const crearHorariosVacios = () => {
        const vacios = {};
        dias.forEach(dia => {
            vacios[dia.id] = [];
        });
        return vacios;
    };

    const getEspecialSeleccionado = () => {
        return horariosEspeciales.find(periodo => periodo.id === especialSeleccionadoId) || null;
    };

    const getHorariosEditables = () => {
        if (modoEdicion === 'especial') {
            return getEspecialSeleccionado()?.horarios_por_dia || crearHorariosVacios();
        }
        return horariosPorDia;
    };

    const setHorariosEditables = (nuevosHorarios) => {
        if (modoEdicion === 'especial') {
            setHorariosEspeciales(prev => prev.map(periodo => (
                periodo.id === especialSeleccionadoId
                    ? { ...periodo, horarios_por_dia: nuevosHorarios }
                    : periodo
            )));
        } else {
            setHorariosPorDia(nuevosHorarios);
        }
    };

    // Generar todas las horas posibles cada 30 minutos (de 0 a 23:30)
    const todasLasHoras = React.useMemo(() => {
        const horas = [];
        for (let i = 0; i < 48; i++) {
            const hora = Math.floor(i / 2);
            const minutos = i % 2 === 0 ? '00' : '30';
            horas.push({
                indice: i,
                legible: `${hora.toString().padStart(2, '0')}:${minutos}`,
                label: `${hora.toString().padStart(2, '0')}:${minutos}`
            });
        }
        return horas;
    }, []);

    React.useEffect(() => {
        if (profesionalId) {
            cargarHorarios();
        }
    }, [profesionalId]);

    const cargarHorarios = async () => {
        setCargando(true);
        try {
            const horarios = await window.salonConfig.getHorariosPorDia(profesionalId);
            console.log('📋 Horarios cargados por día:', horarios);
            
            // Inicializar todos los días con array vacío si no existen
            const horariosInicializados = crearHorariosVacios();
            dias.forEach(dia => {
                horariosInicializados[dia.id] = horarios[dia.id] || [];
            });
            
            setHorariosPorDia(horariosInicializados);
            const especiales = Array.isArray(horarios.__especiales) ? horarios.__especiales : [];
            setHorariosEspeciales(especiales.map(periodo => ({
                ...periodo,
                id: periodo.id || `especial-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                horarios_por_dia: {
                    ...crearHorariosVacios(),
                    ...(periodo.horarios_por_dia || {})
                }
            })));
            
            // Actualizar horas disponibles para el día seleccionado
            setHorasDisponibles(horariosInicializados[diaSeleccionado] || []);
            
        } catch (error) {
            console.error('Error cargando horarios:', error);
            alert('Error al cargar horarios');
        } finally {
            setCargando(false);
        }
    };

    const handleDiaChange = (diaId) => {
        setDiaSeleccionado(diaId);
        setHorasDisponibles(getHorariosEditables()[diaId] || []);
    };

    React.useEffect(() => {
        setHorasDisponibles(getHorariosEditables()[diaSeleccionado] || []);
    }, [modoEdicion, especialSeleccionadoId, horariosEspeciales, horariosPorDia, diaSeleccionado]);

    const crearHorarioEspecial = () => {
        const nuevo = {
            id: `especial-${Date.now()}`,
            nombre: 'Horario especial',
            fecha_inicio: '',
            fecha_fin: '',
            horarios_por_dia: crearHorariosVacios()
        };

        setHorariosEspeciales(prev => [...prev, nuevo]);
        setEspecialSeleccionadoId(nuevo.id);
        setModoEdicion('especial');
    };

    const actualizarHorarioEspecial = (campo, valor) => {
        setHorariosEspeciales(prev => prev.map(periodo => (
            periodo.id === especialSeleccionadoId ? { ...periodo, [campo]: valor } : periodo
        )));
    };

    const eliminarHorarioEspecial = () => {
        if (!especialSeleccionadoId) return;
        if (!confirm('Eliminar este horario especial?')) return;

        setHorariosEspeciales(prev => prev.filter(periodo => periodo.id !== especialSeleccionadoId));
        setEspecialSeleccionadoId('');
        setModoEdicion('normal');
    };

    const toggleHora = (indice) => {
        if (modoEdicion === 'especial' && !especialSeleccionadoId) return;
        const horariosActuales = getHorariosEditables();
        const nuevasHoras = [...(horariosActuales[diaSeleccionado] || [])];
        
        if (nuevasHoras.includes(indice)) {
            // Quitar hora
            const index = nuevasHoras.indexOf(indice);
            nuevasHoras.splice(index, 1);
        } else {
            // Agregar hora
            nuevasHoras.push(indice);
            nuevasHoras.sort((a, b) => a - b);
        }
        
        const nuevosHorarios = {
            ...horariosActuales,
            [diaSeleccionado]: nuevasHoras
        };
        
        setHorariosEditables(nuevosHorarios);
        setHorasDisponibles(nuevasHoras);
    };

    const toggleTodasLasHoras = () => {
        if (modoEdicion === 'especial' && !especialSeleccionadoId) return;
        const horariosActuales = getHorariosEditables();
        const horasActuales = horariosActuales[diaSeleccionado] || [];
        
        if (horasActuales.length === todasLasHoras.length) {
            // Quitar todas
            const nuevosHorarios = {
                ...horariosActuales,
                [diaSeleccionado]: []
            };
            setHorariosEditables(nuevosHorarios);
            setHorasDisponibles([]);
        } else {
            // Agregar todas
            const todas = todasLasHoras.map(h => h.indice);
            const nuevosHorarios = {
                ...horariosActuales,
                [diaSeleccionado]: todas
            };
            setHorariosEditables(nuevosHorarios);
            setHorasDisponibles(todas);
        }
    };

    const copiarHorarios = (desdeDia) => {
        if (modoEdicion === 'especial' && !especialSeleccionadoId) return;
        const horariosActuales = getHorariosEditables();
        const horasACopiar = horariosActuales[desdeDia] || [];
        const nuevosHorarios = {
            ...horariosActuales,
            [diaSeleccionado]: [...horasACopiar]
        };
        setHorariosEditables(nuevosHorarios);
        setHorasDisponibles(horasACopiar);
    };

    const limpiarDia = () => {
        if (modoEdicion === 'especial' && !especialSeleccionadoId) return;
        const horariosActuales = getHorariosEditables();
        const nuevosHorarios = {
            ...horariosActuales,
            [diaSeleccionado]: []
        };
        setHorariosEditables(nuevosHorarios);
        setHorasDisponibles([]);
    };

    const handleGuardar = async () => {
        try {
            const especialesValidos = horariosEspeciales.filter(periodo => periodo.fecha_inicio && periodo.fecha_fin);
            const horariosConEspeciales = {
                ...horariosPorDia,
                __especiales: especialesValidos
            };
            await window.salonConfig.guardarHorariosPorDia(profesionalId, horariosConEspeciales);
            onGuardar(horariosConEspeciales);
        } catch (error) {
            console.error('Error guardando:', error);
        }
    };

    if (cargando) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Cargando horarios...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">
                📅 Horarios de {profesionalNombre} por día
            </h3>
            
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setModoEdicion('normal')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${modoEdicion === 'normal' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-300'}`}
                    >
                        Horario normal
                    </button>
                    <button
                        onClick={() => {
                            setModoEdicion('especial');
                            if (!especialSeleccionadoId && horariosEspeciales.length > 0) {
                                setEspecialSeleccionadoId(horariosEspeciales[0].id);
                            }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${modoEdicion === 'especial' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-300'}`}
                    >
                        Horarios especiales ({horariosEspeciales.length})
                    </button>
                    <button
                        onClick={crearHorarioEspecial}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
                    >
                        Crear especial
                    </button>
                </div>

                {modoEdicion === 'especial' && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Periodo</label>
                            <select value={especialSeleccionadoId} onChange={(e) => setEspecialSeleccionadoId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                                <option value="">Seleccionar</option>
                                {horariosEspeciales.map(periodo => (
                                    <option key={periodo.id} value={periodo.id}>{periodo.nombre || 'Horario especial'}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                            <input type="text" value={getEspecialSeleccionado()?.nombre || ''} onChange={(e) => actualizarHorarioEspecial('nombre', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mayo especial" disabled={!especialSeleccionadoId} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                            <input type="date" value={getEspecialSeleccionado()?.fecha_inicio || ''} onChange={(e) => actualizarHorarioEspecial('fecha_inicio', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={!especialSeleccionadoId} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                            <input type="date" value={getEspecialSeleccionado()?.fecha_fin || ''} onChange={(e) => actualizarHorarioEspecial('fecha_fin', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={!especialSeleccionadoId} />
                        </div>
                        <button onClick={eliminarHorarioEspecial} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={!especialSeleccionadoId}>
                            Eliminar
                        </button>
                    </div>
                )}

                {modoEdicion === 'especial' && !especialSeleccionadoId && (
                    <p className="text-sm text-amber-700">Crea o selecciona un periodo especial para editar sus horarios.</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Panel izquierdo: Selector de días */}
                <div className="md:col-span-1 space-y-2">
                    <h4 className="font-medium text-gray-700 mb-2">Días de la semana</h4>
                    {dias.map(dia => {
                        const cantidadHoras = getHorariosEditables()[dia.id]?.length || 0;
                        return (
                            <button
                                key={dia.id}
                                onClick={() => handleDiaChange(dia.id)}
                                className={`
                                    w-full text-left px-4 py-3 rounded-lg transition-all
                                    ${diaSeleccionado === dia.id 
                                        ? 'bg-amber-600 text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                                `}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{dia.nombre}</span>
                                    {cantidadHoras > 0 && (
                                        <span className={`
                                            text-xs px-2 py-1 rounded-full
                                            ${diaSeleccionado === dia.id 
                                                ? 'bg-amber-500 text-white' 
                                                : 'bg-gray-300 text-gray-700'}
                                        `}>
                                            {cantidadHoras} hs
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Panel derecho: Horas para el día seleccionado */}
                <div className="md:col-span-3">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-700">
                            Horas para {dias.find(d => d.id === diaSeleccionado)?.nombre}
                            {horasDisponibles.length > 0 && (
                                <span className="ml-2 text-sm text-amber-600">
                                    ({horasDisponibles.length} horarios)
                                </span>
                            )}
                        </h4>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={toggleTodasLasHoras}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                            >
                                {horasDisponibles.length === todasLasHoras.length ? 'Quitar todas' : 'Agregar todas'}
                            </button>
                            <button
                                onClick={limpiarDia}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                            >
                                Limpiar día
                            </button>
                        </div>
                    </div>
                    
                    {/* Selector para copiar horarios de otro día */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                        <span className="text-sm text-gray-600">Copiar horarios de:</span>
                        <select
                            onChange={(e) => copiarHorarios(e.target.value)}
                            className="border rounded-lg px-2 py-1 text-sm"
                            value=""
                        >
                            <option value="">Seleccionar día</option>
                            {dias
                                .filter(d => d.id !== diaSeleccionado)
                                .map(dia => (
                                    <option key={dia.id} value={dia.id}>
                                        {dia.nombre} ({getHorariosEditables()[dia.id]?.length || 0} hs)
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    
                    {/* Grilla de horas */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
                        {todasLasHoras.map(hora => {
                            const activa = horasDisponibles.includes(hora.indice);
                            return (
                                <button
                                    key={hora.indice}
                                    onClick={() => toggleHora(hora.indice)}
                                    className={`
                                        px-2 py-1 text-xs font-medium rounded transition-all
                                        ${activa 
                                            ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700' 
                                            : 'bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50'}
                                    `}
                                >
                                    {hora.legible}
                                </button>
                            );
                        })}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                        ⏰ Horarios cada 30 minutos. Seleccioná las horas en las que {profesionalNombre} trabaja este día.
                    </p>
                </div>
            </div>
            
            {/* Resumen semanal */}
            <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-3">Resumen semanal:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {dias.map(dia => {
                        const cantidad = getHorariosEditables()[dia.id]?.length || 0;
                        return (
                            <div key={dia.id} className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="text-xs text-gray-500">{dia.nombre.substring(0, 3)}</div>
                                <div className={`font-bold ${cantidad > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {cantidad} hs
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end gap-3 mt-6">
                <button
                    onClick={onCancelar}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleGuardar}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                    Guardar Horarios
                </button>
            </div>
        </div>
    );
}
