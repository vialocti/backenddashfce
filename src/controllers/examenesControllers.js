import coneccionDB from "../database.js";

//turnos exmanes

// Endpoint para obtener los turnos de mesa según el año académico
export const getTurnosMesaAni = async (req, res) => {
    const { anio } = req.params;
    
    try {
      const sqlstr = `
        SELECT DISTINCT 
          vme.turno_examen, 
          vme.turno_examen_periodo, 
          vme.turno_examen_nombre 
        FROM negocio.vw_mesas_examen vme 
        WHERE anio_academico = $1
      `;
      const resu = await coneccionDB.query(sqlstr, [anio]);
      res.send(resu.rows);
    } catch (error) {
      console.error("Error en getTurnosMesaAni:", error);
      res.status(500).send("Error al obtener turnos de mesa");
    }
  };
  
  // Endpoint para obtener las mesas de examen según año, período y ubicación
 /*
  export const getMesasExamen = async (req, res) => {
    const { anio, periodo, ubicacion } = req.params;
  
    try {
      // Establecer el esquema a "negocio"
      await coneccionDB.query('SET search_path = negocio');
      
      const sqlstr = `
        SELECT DISTINCT 
          vme.turno_examen_nombre,
          vme.llamado_mesa,
          vme.mesa_examen,
          vme.mesa_examen_elemento_nombre,
          vme.mesa_examen_ubicacion,
          vme.mesa_examen_nombre
        FROM negocio.vw_mesas_examen vme
        WHERE anio_academico = $1 
          AND vme.turno_examen_periodo in ($2) 
          AND vme.mesa_examen_ubicacion = $3 
          AND vme.llamado_mesa_estado = 'A'
          AND NOT vme.mesa_examen_nombre like 'V%'
          ORDER BY  vme.mesa_examen_elemento_nombre
      `;
      const resu = await coneccionDB.query(sqlstr, [anio, periodo, ubicacion]);
      
      
      res.send(resu.rows);

    } catch (error) {
      console.error("Error en getMesasExamen:", error);
      res.status(500).send("Error al obtener mesas de examen");
    }
  };
  */
  ///new getmesas
  export const getMesasExamen = async (req, res) => {
    const { anio, periodo, ubicacion } = req.params;
  
    try {
      // Establecer el esquema a "negocio"
      await coneccionDB.query('SET search_path = negocio');
  
      // Asegurar que `periodo` es un array si se reciben múltiples turnos
      const periodosArray = periodo.split(','); // Convertir la cadena a array si es necesario
      const placeholders = periodosArray.map((_, index) => `$${index + 2}`).join(','); // Crear placeholders dinámicos
    

      const sqlstr = `
        SELECT DISTINCT 
          vme.turno_examen_nombre,
          vme.llamado_mesa,
          vme.mesa_examen,
          vme.mesa_examen_elemento_nombre,
          vme.mesa_examen_ubicacion,
          vme.mesa_examen_nombre
        FROM negocio.vw_mesas_examen vme
        WHERE anio_academico = $1 
          AND vme.turno_examen_periodo IN (${placeholders}) 
          AND vme.mesa_examen_ubicacion = $${periodosArray.length + 2} 
          AND vme.llamado_mesa_estado = 'A'
          AND NOT vme.mesa_examen_nombre LIKE 'V%'
        ORDER BY vme.mesa_examen_elemento_nombre
      `;
  
      //console.log(sqlstr);  
      const queryParams = [anio, ...periodosArray, ubicacion]; // Parametros en orden
      const resu = await coneccionDB.query(sqlstr, queryParams);
  
      res.send(resu.rows);
  
    } catch (error) {
      console.error("Error en getMesasExamen:", error);
      res.status(500).send("Error al obtener mesas de examen");
    }
  };
  


  // Endpoint para obtener totales por llamado de mesa
  export const getResultadoMesaExamen = async (req, res) => {
    const { llamado_mesa } = req.params;
    
    try {
      // Establecer el esquema a "negocio"
      await coneccionDB.query('SET search_path = negocio');
      
      const sqlstr = `
        SELECT 
          resultado, 
          COUNT(resultado) AS total 
        FROM negocio.vw_actas 
        WHERE llamado_mesa = $1
        GROUP BY resultado
      `;
      const resu = await coneccionDB.query(sqlstr, [llamado_mesa]);
      res.send(resu.rows);
    } catch (error) {
      console.error("Error en getResultadoMesaExamen:", error);
      res.status(500).send("Error al obtener resultados de mesa de examen");
    }
  };
  

  //////
  // Endpoint para obtener totales por llamado de mesa
  export const getResultadoTurnoExamen = async (req, res) => {
    const { llamados } = req.params;
    
    try {
      // Establecer el esquema a "negocio"
      await coneccionDB.query('SET search_path = negocio');
      
      const sqlstr = `
        SELECT 
          resultado, 
          COUNT(resultado) AS total 
        FROM negocio.vw_actas 
        WHERE llamado_mesa in (${llamados})
        GROUP BY resultado
      `;
      const resu = await coneccionDB.query(sqlstr);
      res.send(resu.rows);
    } catch (error) {
      console.error("Error en getResultadoMesaExamen:", error);
      res.status(500).send("Error al obtener resultados de mesa de examen");
    }
  };
  
////

  ////
  //////
////////////////////////
  
//////////

export const getMesasExamenTUTI = async (req, res) => {
  const { anio, periodo, ubicacion } = req.params;
  
  // Validación básica de parámetros
  if (!anio || !periodo || !ubicacion) {
    return res.status(400).send("Parámetros insuficientes");
  }

  // Condición para la ubicación: si ubicacion es 5, usamos IN (1,2,3,4), de lo contrario, usamos igualdad
  const ubicacionCondition =
    Number(ubicacion) === 5
      ? "vme.mesa_examen_ubicacion IN (1,2,3,4)"
      : `vme.mesa_examen_ubicacion = ${ubicacion}`;

  try {

   const sqlstr = `
      WITH resultados AS (
  SELECT 
  
    va.llamado_mesa,
    CASE WHEN sa.propuesta = 1 THEN 'CPN'
         WHEN sa.propuesta = 2 THEN 'LA'                                  
          WHEN sa.propuesta = 3 THEN 'LE'
          WHEN sa.propuesta = 7 THEN 'LLO'
          WHEN sa.propuesta = 8 THEN 'CP'
    END AS propuesta,
    COUNT(CASE WHEN va.resultado = 'A' THEN 1 END) AS aprobados,
    COUNT(CASE WHEN va.resultado = 'R' THEN 1 END) AS reprobados,
    COUNT(CASE WHEN va.resultado = 'U' THEN 1 END) AS ausentes
  FROM negocio.vw_actas va
  INNER JOIN negocio.sga_alumnos sa ON va.alumno = sa.alumno
  GROUP BY va.llamado_mesa, sa.propuesta
)
SELECT DISTINCT 
  vme.turno_examen_nombre,
  vme.llamado_mesa,
  vme.mesa_examen,
  vme.mesa_examen_elemento_nombre,
  vme.mesa_examen_ubicacion,
  vme.mesa_examen_nombre,
  r.propuesta,
  COALESCE(r.aprobados, 0) AS aprobados,
  COALESCE(r.reprobados, 0) AS reprobados,
  COALESCE(r.ausentes, 0) AS ausentes,
  COALESCE(r.aprobados, 0) + COALESCE(r.reprobados, 0) + COALESCE(r.ausentes, 0) AS total
FROM negocio.vw_mesas_examen vme
LEFT JOIN resultados r ON vme.llamado_mesa = r.llamado_mesa
WHERE vme.anio_academico = ${anio}
  AND vme.turno_examen_periodo IN (${periodo}) 
  AND ${ubicacionCondition}
  AND vme.llamado_mesa_estado = 'A'
  AND NOT vme.mesa_examen_nombre LIKE 'V%'
  AND r.propuesta IS NOT NULL
  AND (COALESCE(r.aprobados, 0) + COALESCE(r.reprobados, 0) + COALESCE(r.ausentes, 0)) > 0
ORDER BY vme.mesa_examen_elemento_nombre, r.propuesta;`

   

    try {
      await coneccionDB.query('BEGIN');
      await coneccionDB.query('SET search_path = negocio');
      const resu = await coneccionDB.query(sqlstr);
      await coneccionDB.query('COMMIT');
      const result = resu.rows.filter(element => element.total > 0);
      res.status(200).send(result);
    } catch (queryError) {
      await coneccionDB.query('ROLLBACK');
      console.error("Error en la consulta:", queryError);
      res.status(500).send("Error al obtener mesas de examen");
    }
  } catch (connectionError) {
    console.error("Error en la conexión a la base de datos:", connectionError);
    res.status(500).send("Error de conexión a la base de datos");
  }
};



  //////////

//mesas examenes con total R, A y U
export const getActasExamenTotalResu = async (req, res) => {

    const {anio} = req.params
    

    let sqlstr = `select sa.id_acta,sp.periodo, sp.nombre as nper,sme.mesa_examen ,sme.nombre, sme.elemento,se.nombre , sme.ubicacion, sad.resultado, count(sad.resultado)  from negocio.sga_mesas_examen sme 
    inner join  negocio.sga_llamados_mesa slm on slm.mesa_examen=sme.mesa_examen 
    inner join negocio.sga_llamados_turno slt on slt.llamado = slm.llamado
    inner join negocio.sga_actas sa on sa.llamado_mesa = slm.llamado_mesa 
    inner join negocio.sga_actas_detalle sad on sad.id_acta =sa.id_acta 
    inner join negocio.sga_turnos_examen ste on ste.turno_examen =slt.turno_examen
    inner join negocio.sga_periodos sp on sp.periodo=ste.periodo
    inner join negocio.sga_elementos se on se.elemento =sme.elemento 
    where sp.anio_academico =${anio} and sa.origen ='E' and sa.estado ='C'
    group by sa.id_acta,sp.periodo, sp.nombre ,sme.mesa_examen ,sme.nombre, sme.elemento,se.nombre , sme.ubicacion, sad.resultado 
    order by se.nombre
`

    try {
        
        
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}

//resultados por actas
export const getResultadosPorActa = async (req, res) => {

    const {idacta} = req.params
    

    let sqlstr = `select resultado, count(resultado) from negocio.sga_actas_detalle sad 
    where id_acta =${idacta}
    group by resultado
`

    try {
                
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}



export const getAprobadoActaAlumno = async (req, res) => {
    const { idacta, alumno } = req.params;

    // Preparar la consulta con parámetros para evitar inyección SQL
    const sqlstr = `
        SELECT COUNT(*) 
        FROM negocio.sga_actas_detalle 
        WHERE id_acta = $1 AND alumno = $2
        GROUP BY resultado
    `;

    try {
        // Ejecutar la consulta con parámetros
        const resu = await coneccionDB.query(sqlstr, [idacta, alumno]);

        // Verificar si hay resultados y enviar la respuesta
        if (resu.rows.length === 0) {
            res.status(404).send({ message: 'No se encontraron registros para el alumno y acta especificados.' });
        } else {
            res.send(resu.rows);
        }
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
    }
};



//cantidad de materias aprobadas por alumno en un año
//se anula
const alumnost =async(anio,sede,propuesta)=>{
    
    const sqlstr = `
             SELECT count(sa.alumno) as canti
          FROM negocio.sga_propuestas_aspira spa
          INNER JOIN negocio.sga_alumnos sa ON sa.persona = spa.persona AND sa.propuesta = spa.propuesta
          WHERE anio_academico = $1
            AND sa.ubicacion = $2
            AND spa.propuesta = $3
            AND spa.tipo_ingreso <> 6
            AND situacion_asp IN (1, 2)
            AND sa.legajo IS NOT NULL
   `;

    try {
        const resu = await coneccionDB.query(sqlstr, [anio, sede, propuesta]);
        //console.log(resu)
        return resu.rows[0].canti

    } catch (error) {
        console.error('Error en la consulta:', error);
        return ({ message: 'Ocurrió un error en el servidor.' });
    }
}


//
//funciones auxiliares para historicos aprobadas por alumno anio
//funcion check si existe el registro
const checkHistoricoExists = async (anio, sede, propuesta) => {
    const sqlSelect = `
        SELECT anio
        FROM fce_per.dash_aprobadas_anio
        WHERE anio = $1 AND sede = $2 AND propuesta = $3
    `;
    
    // Usamos un array de parámetros para que la base de datos los maneje de forma segura
    const params = [anio, sede, propuesta]; 
    
    try {
        // Asumiendo que coneccionDB.query devuelve un objeto con una propiedad 'rows'
        const resu = await coneccionDB.query(sqlSelect, params);
        // Si hay filas, el registro existe (devuelve true), de lo contrario, false
        return resu.rows && resu.rows.length > 0; 
    } catch (error) {
        console.error("Error al verificar la existencia del registro:", error);
        throw error;
    }
};

//funcion insert
const insertHistoricosAprobadasAnio = async (vh) => {
    const sqlInsert = `
        INSERT INTO fce_per.dash_aprobadas_anio (
            anio, sede, propuesta, ap_cero, ap_una, ap_dos, ap_tres,
            ap_cuatro, ap_cinco, ap_seis, ap_siete, ap_ocho, ap_nueve
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
    `;
    
    // Array de valores para los placeholders ($1, $2, ...)
    const params = [
        vh.anio, vh.sede, vh.propuesta, vh.apcero, vh.apuna, vh.apdos,
        vh.aptres, vh.apcuatro, vh.apcinco, vh.apseis, vh.apsiete, 
        vh.apocho, vh.apnueve
    ];
    
    //console.log("Realizando INSERT:", vh.anio, vh.sede, vh.propuesta);
    return coneccionDB.query(sqlInsert, params);
};

//funcion update 
const updateHistoricosAprobadasAnio = async (vh) => {
    const sqlUpdate = `
        UPDATE fce_per.dash_aprobadas_anio
        SET
            ap_cero = $4,
            ap_una = $5,
            ap_dos = $6,
            ap_tres = $7,
            ap_cuatro = $8,
            ap_cinco = $9,
            ap_seis = $10,
            ap_siete = $11,
            ap_ocho = $12,
            ap_nueve = $13
        WHERE anio = $1 AND sede = $2 AND propuesta = $3
    `;

    const params = [
        vh.anio, vh.sede, vh.propuesta, vh.apcero, vh.apuna, vh.apdos,
        vh.aptres, vh.apcuatro, vh.apcinco, vh.apseis, vh.apsiete, 
        vh.apocho, vh.apnueve
    ];
    
    //console.log("Realizando UPDATE:", vh.anio, vh.sede, vh.propuesta);
    return coneccionDB.query(sqlUpdate, params);
};
//nueva optimizada

const tratarHistoricosAprobadasAlumnosAnio = async (anio, sede, propuesta, tablavalores) => {
    // 1. Mapeo de valores (igual que en tu función original, pero más conciso)
    const data = tablavalores[0];
    const vh = {
        anio: anio,
        sede: sede,
        propuesta: propuesta,
        apcero: data.cero,
        apuna: data.una,
        apdos: data.dos,
        aptres: data.tres,
        apcuatro: data.cuatro,
        apcinco: data.cinco,
        apseis: data.seis,
        apsiete: data.siete,
        apocho: data.ocho,
        apnueve: data.nueve,
    };

    try {
        // 2. 🚨 Verificar si el registro existe
        const exists = await checkHistoricoExists(anio, sede, propuesta);

        let resu;
        if (exists) {
            // 3. Si existe, realizar UPDATE
            //console.log(`Registro encontrado para ${anio}-${propuesta}. Se realizará UPDATE.`);
            resu = await updateHistoricosAprobadasAnio(vh);
        } else {
            // 4. Si no existe, realizar INSERT
            //console.log(`Registro NO encontrado para ${anio}-${propuesta}. Se realizará INSERT.`);
            resu = await insertHistoricosAprobadasAnio(vh);
        }
        if (resu) {
            return {"message":"OK"};

        }  //return resu;

    } catch (error) {
        console.error("Error en la función tratarHistoricosAprobadasAlumnosAnio:", error);
        throw error; // Re-lanzar el error para que el llamador lo maneje
    }
};


///////
//////////--------------------------/////////


const tratarQryOptimizado = (alumnos) => {
    // Inicialización del objeto de resultados con todos los contadores a cero.
    let datos = {
        cero: 0,
        una: 0,
        dos: 0,
        tres: 0,
        cuatro: 0,
        cinco: 0,
        seis: 0,
        siete: 0,
        ocho: 0,
        nueve: 0,
    };

    // Nombres de las claves para mapear la cantidad al campo.
    const claves = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'];

    // 💡 Procesa el array en una única pasada
    alumnos.forEach(alumno => {
        const totalAprobadas = parseInt(alumno.total_aprobadas, 10);

        if (totalAprobadas >= 0 && totalAprobadas <= 8) {
            // Usa el array 'claves' para acceder dinámicamente al campo (más limpio).
            // Por ejemplo, si totalAprobadas es 3, se accede a datos['tres']
            datos[claves[totalAprobadas]]++;
        } else if (totalAprobadas > 8) {
            datos.nueve++;
        }
        // Se ignora el caso si totalAprobadas es < 0, aunque por la consulta SQL no debería ocurrir.
    });

    // Envuelve el objeto 'datos' en un array, como lo hacía la función original.
    return [datos];
};

///
//primero solo los ingresantes de una carrera y sede ingresantes puros 
////
/*
export const traerAprobadasPorAlumnoSedePropuestaAnio = async(req,res)=>{
    const {anio,sede,propuesta,tipoO}=req.params

    const sqlstr = `
    SELECT alumno, COUNT(alumno) AS total_aprobadas
    FROM negocio.vw_hist_academica vha
    WHERE origen IN ('E', 'P')
      AND resultado = 'A'
      AND alumno IN (
          SELECT sa.alumno
          FROM negocio.sga_propuestas_aspira spa
          INNER JOIN negocio.sga_alumnos sa ON sa.persona = spa.persona AND sa.propuesta = spa.propuesta
          WHERE anio_academico = $1
            AND sa.ubicacion = $2
            AND spa.propuesta = $3
            AND spa.tipo_ingreso <> 6
            AND situacion_asp IN (1, 2)
            AND sa.legajo IS NOT NULL
      )
      AND anio_academico = $1
    GROUP BY alumno;
`;

try {
    // Ejecutar la consulta con parámetros
    const resu = await coneccionDB.query(sqlstr, [anio, sede, propuesta]);

        // Verificar si hay resultados y enviar la respuesta
        if (resu.rows.length === 0) {
            res.status(404).send({ message: 'No se encontraron registros.' });
        } else {
            let alumnostmatap= resu.rows.length
            let alumnostI = parseInt( await alumnost(anio,sede,propuesta))
            let alucero=alumnostI-alumnostmatap
            //console.log(alucero)
            const tablavalores = tratarQryOptimizado(resu.rows)
            tablavalores[0].cero=alucero
            if (tipoO ==='H'){
               let resp = await tratarHistoricosAprobadasAlumnosAnio(anio,sede,propuesta,tablavalores)
               console.log(resp)
               res.send(resp)
            }else if(tipoO==='Q'){
                res.send(tablavalores);
            }else if (tipoO==='R'){//tipo reporte 
                tablavalores[0].anio=anio
                tablavalores[0].sede=sede
                tablavalores[0].propuesta=propuesta
              //  console.log(tablavalores)
                res.send(tablavalores)

            }
        }
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
    }


}
    */

export const traerAprobadasPorAlumnoSedePropuestaAnio = async (req, res) => {
  const { anio, sede, propuesta, tipoO } = req.params;

  const sqlstr = `
    WITH alumnos_validos AS (
      SELECT sa.alumno
      FROM negocio.sga_propuestas_aspira spa
      INNER JOIN negocio.sga_alumnos sa
        ON sa.persona = spa.persona
       AND sa.propuesta = spa.propuesta
      WHERE spa.anio_academico = $1
        AND sa.ubicacion       = $2
        AND spa.propuesta      = $3
        AND spa.tipo_ingreso  <> 6
        AND spa.situacion_asp IN (1, 2)
        AND sa.legajo IS NOT NULL
    ),
    aprobadas_por_alumno AS (
      SELECT av.alumno,
             COUNT(vha.alumno) AS total_aprobadas
      FROM alumnos_validos av
      LEFT JOIN negocio.vw_hist_academica vha
        ON vha.alumno         = av.alumno
       AND vha.anio_academico = $1
       AND vha.origen IN ('E', 'P')
       AND vha.resultado = 'A'
      GROUP BY av.alumno
    )
    SELECT
      COUNT(*) FILTER (WHERE total_aprobadas = 0)::int AS cero,
      COUNT(*) FILTER (WHERE total_aprobadas = 1)::int AS una,
      COUNT(*) FILTER (WHERE total_aprobadas = 2)::int AS dos,
      COUNT(*) FILTER (WHERE total_aprobadas = 3)::int AS tres,
      COUNT(*) FILTER (WHERE total_aprobadas = 4)::int AS cuatro,
      COUNT(*) FILTER (WHERE total_aprobadas = 5)::int AS cinco,
      COUNT(*) FILTER (WHERE total_aprobadas = 6)::int AS seis,
      COUNT(*) FILTER (WHERE total_aprobadas = 7)::int AS siete,
      COUNT(*) FILTER (WHERE total_aprobadas = 8)::int AS ocho,
      COUNT(*) FILTER (WHERE total_aprobadas = 9)::int AS nueve,
      COUNT(*) FILTER (WHERE total_aprobadas >= 10)::int AS diez
    FROM aprobadas_por_alumno;
  `;

  try {
    const { rows } = await coneccionDB.query(sqlstr, [anio, sede, propuesta]);
    const datos = rows[0]; // siempre hay 1 fila (con ceros si no hubo alumnos)

    // Si no hubo ningún alumno válido, todos los buckets son 0
    const totalAlumnos =
      datos.cero + datos.una + datos.dos + datos.tres + datos.cuatro +
      datos.cinco + datos.seis + datos.siete + datos.ocho + datos.nueve + datos.diez;

    if (totalAlumnos === 0) {
      return res.status(404).send({ message: 'No se encontraron registros.' });
    }

    const tablavalores = [datos];

    switch (tipoO) {
      case 'Q':
        return res.send(tablavalores);

      case 'R':
        tablavalores[0].anio = anio;
        tablavalores[0].sede = sede;
        tablavalores[0].propuesta = propuesta;
        return res.send(tablavalores);

      case 'H': {
        const resp = await tratarHistoricosAprobadasAlumnosAnio(
          anio, sede, propuesta, tablavalores
        );
        return res.send(resp);
      }

      default:
        return res.status(400).send({ message: 'tipoO inválido' });
    }
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
  }
};


/////datos de examenes por actividad 

////

const tratarDatosActividadesExPro=(datosqry)=>{

     //console.log(datosqry)
    let datosReturn =[]
    
    let filad={
        actividad:'',
        promocionados:0,
        aprobadosE:0,
        reprobadosE:0,
        ausentesE:0
    }

    datosqry.forEach(element => {
        
        if (datosReturn.length ===0){

            filad={
                actividad:element.actividad_nombre,
                promocionados:element.origen==='P' ? element.cantidad:0,
                aprobadosE:element.origen==='E' && element.resultado==='A' ? element.cantidad:0,
                reprobadosE:element.origen==='E' && element.resultado==='R' ? element.cantidad:0,
                ausentesE:element.origen==='E' && element.resultado==='U' ? element.cantidad:0
            }
            datosReturn.push(filad)
        }else{
            let esta =  datosReturn.find(elementr=>elementr.actividad===element.actividad_nombre)
            if (!esta){
                filad={
                    actividad:element.actividad_nombre,
                    promocionados:element.origen==='P' ? element.cantidad:0,
                    aprobadosE:element.origen==='E' && element.resultado==='A' ? element.cantidad:0,
                    reprobadosE:element.origen==='E' && element.resultado==='R' ? element.cantidad:0,
                    ausentesE:element.origen==='E' && element.resultado==='U' ? element.cantidad:0
                }
                datosReturn.push(filad)
            } 
        }

        datosReturn.forEach(element => {

            let actividad = datosqry.filter(ele=>ele.actividad_nombre===element.actividad)
            //console.log(actividad)
            actividad.forEach(elem=>{
                if(elem.origen==='P'){
                    element.promocionados=elem.cantidad
                }else if(elem.origen==='E' && elem.resultado==='A'){
                    element.aprobadosE=elem.cantidad
                }else if(elem.origen==='E' && elem.resultado==='R'){
                    element.reprobadosE=elem.cantidad
                }else if(elem.origen==='E' && elem.resultado==='U'){
                    element.ausentesE=elem.cantidad
                }
            })
            //console.log('---------------------------')
        })

    });

    return datosReturn
}
///////


    export const traerAprobadasAnioPropuesta = async (req, res) => {
  const { anio, sede, propuesta } = req.params;

  const sqlstr = `
    WITH alumnos_validos AS (
      SELECT sa.alumno
      FROM negocio.sga_propuestas_aspira spa
      INNER JOIN negocio.sga_alumnos sa
        ON sa.persona = spa.persona
       AND sa.propuesta = spa.propuesta
      WHERE spa.anio_academico = $1
        AND sa.ubicacion       = $2
        AND spa.propuesta      = $3
        AND spa.tipo_ingreso  <> 6
        AND spa.situacion_asp IN (1, 2)
        AND sa.legajo IS NOT NULL
    ),
    anio_cursada_materia AS (
      SELECT DISTINCT ON (se.codigo)
        se.codigo AS actividad_codigo,
        pl.anio_de_cursada
      FROM negocio.sga_elementos se
      INNER JOIN negocio.sga_elementos_revision ser
        ON ser.elemento = se.elemento
      INNER JOIN negocio.sga_elementos_plan sep
        ON sep.elemento_revision = ser.elemento_revision
      INNER JOIN negocio.sga_elementos_plan pl
        ON pl.elemento_revision = sep.elemento_revision
      WHERE pl.anio_de_cursada IS NOT NULL
       
      ORDER BY se.codigo, pl.anio_de_cursada
      
        )
    SELECT
      vha.actividad_codigo,
      vha.actividad_nombre AS actividad,
      acm.anio_de_cursada,
      COUNT(*) FILTER (WHERE vha.origen = 'P')::int AS promocionados,
      COUNT(*) FILTER (WHERE vha.origen = 'E' AND vha.resultado = 'A')::int AS "aprobadosE",
      COUNT(*) FILTER (WHERE vha.origen = 'E' AND vha.resultado = 'R')::int AS "reprobadosE",
      COUNT(*) FILTER (WHERE vha.origen = 'E' AND vha.resultado = 'U')::int AS "ausentesE"
    FROM negocio.vw_hist_academica vha
    INNER JOIN alumnos_validos av ON av.alumno = vha.alumno
    LEFT JOIN anio_cursada_materia acm
      ON acm.actividad_codigo = vha.actividad_codigo
    WHERE vha.anio_academico = $1
    GROUP BY vha.actividad_codigo, vha.actividad_nombre, acm.anio_de_cursada
    ORDER BY acm.anio_de_cursada NULLS LAST, vha.actividad_nombre;
  `;

  const client = await coneccionDB.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL search_path TO negocio, public");
    const { rows } = await client.query(sqlstr, [anio, sede, propuesta]);
    await client.query('COMMIT');
    //console.log(rows);
    res.send(rows);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error en la consulta:', error);
    res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
  } finally {
    client.release();
  }
};
//////
    
export const traerEstadisticasAnioPropuesta = async (req, res) => {
    const { anio, sede, propuesta } = req.params;

    // Declaración segura de la consulta SQL con parámetros
    const sqlstr = `
        SELECT actividad_nombre, origen, resultado, COUNT(actividad_nombre) AS cantidad
        FROM negocio.vw_hist_academica vha
        WHERE alumno IN (
            SELECT sa.alumno
            FROM negocio.sga_propuestas_aspira spa
            INNER JOIN negocio.sga_alumnos sa ON sa.persona = spa.persona AND sa.propuesta = spa.propuesta
            WHERE anio_academico = $1
              AND sa.ubicacion = $2
              AND spa.propuesta = $3
              AND spa.tipo_ingreso <> 6
              AND situacion_asp IN (1, 2)
              AND sa.legajo IS NOT NULL
        ) 
        AND anio_academico = $1
        GROUP BY actividad_nombre, origen, resultado
    `;

    try {   
        // Ejecutar la consulta con los parámetros
        let resu = await coneccionDB.query('SET search_path=negocio');
        resu = await coneccionDB.query(sqlstr, [anio, sede, propuesta]);

        // Retornar el resultado completo al cliente
        let datosEP=tratarDatosActividadesExPro(resu.rows)
        res.send(datosEP);

    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
    }
};


export const traerdatosHistoricoAprobadasporAlumno =async(req,res)=>{

    const {sede,propuesta,anioi,aniof} = req.params
    
    
    if (propuesta==='10'){
    
    }

    let sqlstr = `select * from fce_per.dash_aprobadas_anio 
    where sede=${sede} and anio>=${anioi} and anio<=${aniof} 
    and `

    if (propuesta==='10'){
        sqlstr += `propuesta in (2,3,7,8) order by anio,propuesta` 
    }else{
        sqlstr += `propuesta=${propuesta} order by anio,propuesta`
    }

    try {
                
        const resu = await coneccionDB.query(sqlstr)
        res.send(resu.rows)
    } catch (error) {
        console.log(error)
    }

}








/*
    let sqlstr = `select sa.id_acta,sp.periodo, sp.nombre as nper,sme.mesa_examen ,sme.nombre, sme.elemento,se.nombre , sme.ubicacion  from negocio.sga_mesas_examen sme 
    inner join  negocio.sga_llamados_mesa slm on slm.mesa_examen=sme.mesa_examen 
    inner join negocio.sga_llamados_turno slt on slt.llamado = slm.llamado
    inner join negocio.sga_actas sa on sa.llamado_mesa = slm.llamado_mesa 
    inner join negocio.sga_turnos_examen ste on ste.turno_examen =slt.turno_examen
    inner join negocio.sga_periodos sp on sp.periodo=ste.periodo
    inner join negocio.sga_elementos se on se.elemento =sme.elemento 
    where sp.anio_academico =$1 and sa.origen ='E' and sa.estado ='C'  and sp.periodo =$2
    order by ubicacion, se.nombre`
*/



///

export const traerPeriodosTurnos=async (req,res)=>{

const {anio}= req.params

const sqlstr = `SELECT * FROM fce_per.dash_turnos_examenes WHERE aniolectivo=$1`

try {

  // Ejecutar la consulta con los parámetros
  
  const resu = await coneccionDB.query(sqlstr, [anio]);

  // Retornar el resultado completo al cliente
  
  res.send(resu.rows);

} catch (error) {
  console.error('Error en la consulta:', error);
  res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
}


}







/*

 const sqlstrold = `
      WITH resultados AS (
        SELECT 
          llamado_mesa,
          COUNT(CASE WHEN resultado = 'A' THEN 1 END) AS aprobados,
          COUNT(CASE WHEN resultado = 'R' THEN 1 END) AS reprobados,
          COUNT(CASE WHEN resultado = 'U' THEN 1 END) AS ausentes
        FROM negocio.vw_actas
        GROUP BY llamado_mesa
      )
      SELECT DISTINCT 
        vme.turno_examen_nombre,
        vme.llamado_mesa,
        vme.mesa_examen,
        vme.mesa_examen_elemento_nombre,
        vme.mesa_examen_ubicacion,
        vme.mesa_examen_nombre,
        COALESCE(r.aprobados, 0) AS aprobados,
        COALESCE(r.reprobados, 0) AS reprobados,
        COALESCE(r.ausentes, 0) AS ausentes,
        COALESCE(r.aprobados, 0) + COALESCE(r.reprobados, 0) + COALESCE(r.ausentes, 0) AS total
      FROM negocio.vw_mesas_examen vme
      LEFT JOIN resultados r ON vme.llamado_mesa = r.llamado_mesa
      WHERE vme.anio_academico = ${anio}
        AND vme.turno_examen_periodo in (${periodo}) 
        AND ${ubicacionCondition}
        AND vme.llamado_mesa_estado = 'A'
        AND NOT vme.mesa_examen_nombre LIKE 'V%'
      ORDER BY vme.mesa_examen_elemento_nombre;
    `;*/