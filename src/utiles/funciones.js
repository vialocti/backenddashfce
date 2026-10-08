// Función para calcular promedios anuales antes de llamar a la IA
export const calcularPromediosAnuales = (data) => {
    const agrupar = data.reduce((acc, curr) => {
        const anio = curr.anio_academicoint4 || curr.anio_academico;
        if (!acc[anio]) {
            acc[anio] = { anio, reg: [], prom: [], cursada: [], e1: [], e2: [] };
        }
        acc[anio].reg.push(Number(curr.relacion_regular) || 0);
        acc[anio].prom.push(Number(curr.relacion_promocion) || 0);
        acc[anio].cursada.push(Number(curr.indice_cursada) || 0);
        acc[anio].e1.push(Number(curr.indice_e1) || 0);
        acc[anio].e2.push(Number(curr.indice_e2) || 0);
        return acc;
    }, {});

    return Object.values(agrupar).map(d => ({
        anio: d.anio,
        regularidad: (d.reg.reduce((a, b) => a + b, 0) / d.reg.length).toFixed(2),
        promocion: (d.prom.reduce((a, b) => a + b, 0) / d.prom.length).toFixed(2),
        cursada: (d.cursada.reduce((a, b) => a + b, 0) / d.cursada.length).toFixed(2),
        e1: (d.e1.reduce((a, b) => a + b, 0) / d.e1.length).toFixed(2),
        e2: (d.e2.reduce((a, b) => a + b, 0) / d.e2.length).toFixed(2),
    })).sort((a, b) => a.anio - b.anio);
};

