
import dotenv from 'dotenv'
import coneccionDB from "../database";
import openai from "../configopenai.js";
import { readFile } from "fs/promises";
import puppeteer from 'puppeteer';
import { plantillaBase } from '../utiles/pdfTemplates.js';
import { calcularPromediosAnuales } from '../utiles/funciones.js';

dotenv.config()


const loadDatabaseSchema = async () => {
  try {
    const data = await readFile(`${__dirname}/database_schema.json`, "utf8");
    //const data = await readFile("./database_schema.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading database schema:", error);
    return null;
  }
};


function limpiarConsultaSQL(cadena) {
  // Eliminamos comentarios SQL (todo después de -- o /* hasta el final de la línea)
  let cleanedQuery = cadena.replace(/--.*$/gm, ''); // Elimina comentarios de una sola línea
  cleanedQuery = cleanedQuery.replace(/\/\*[\s\S]*?\*\//g, ''); // Elimina comentarios multilínea

  // Eliminamos los backticks
  cleanedQuery = cleanedQuery.replace(/`/g, ''); // Elimina los backticks

  // Solo eliminamos los espacios extra, sin tocar las comillas
  cleanedQuery = cleanedQuery.trim().replace(/\s+/g, ' '); // Elimina espacios extra

  return cleanedQuery;
}

/*

export const consultasOpenai = async (req, res) => {
  const { question } = req.body;
  
  // Cargar la estructura de la base de datos
  const schema = await loadDatabaseSchema();
  console.log(question, schema);

  // Verificar que se haya cargado correctamente el esquema
  if (!schema) {
    return res.status(500).json({ error: "No se pudo cargar la estructura de la base de datos" });
  }

  try {
    // Crear una solicitud de completación a OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // El modelo de GPT que estamos usando
      messages: [
        {
          role: "system", 
          content: "Genera consultas SQL para PostgreSQL basadas en la estructura de la base de datos proporcionada, solo devuelve la sentencia SQL bien definida elimina cualquier caracter que produza error."
        },
        {
          role: "system", 
          content: "tener en cuenta si preguntan por carrera se refieren a propuesta, si dicen sede se refieren a ubicacion si dicen coeficiente refieren a coef_tcarrera cuando dice porciento de la carrera ver campo completado "
        },
        {
          role: "system", 
          content: "siempre convierte ubicacion 1 por MZA, 2 por SR 3 por GAV y 4 por ES, las propuesta 1 CPN, 2 LA, 3 LE, 6 LNRG, 7 LLO y 8 CP "
        },
        {
          role: "system", 
          content: "si te preguntan año de cursada se refiren a anio_cursada, si te preguntan por ingresantes se refieren a los de anio_ingreso_pro del año actual "
        },
        {
          role: "system", 
          content: "cuando en la consulta dicen 1er o primer , 2do o segundo, o tercer... año cursada, esta refiriendo a la columna aniocursada que toma valores 1 a 5 segun año de cursada "
        },
        {
          role: "system", 
          content: "en la consulta deben solo haber palabras como estudiantes, alumnos, coeficiente, año de cursada y todo lo referido a la tabla del schema"
        },  
        {
          role: "system", 
          content: "si hay palabras no coherentes con el esquema de la tabla como temperatura, animales u otro que no corresponda con alumnos crea por defecto la consulta 'SELECT COUNT(*) FROM fce_per.alumnos_info' "
        },
        {
          role: "user", 
          content: `Estructura de la base de datos: ${JSON.stringify(schema)}\nPregunta: ${question}`
        }
      ]
    });

    // Extraer solo la consulta SQL (sin la explicación)
    const sqlQuery = limpiarConsultaSQL(response.choices[0].message.content);
    //console.log("Consulta SQL generada:", sqlQuery);

    const sqldef =sqlQuery.substring(4,400)
    //console.log(sqldef)
    //Ejecutar la consulta en la base de datos (PostgreSQL)
    const result = await coneccionDB.query(sqldef);

    // Devolver la consulta SQL generada y los resultados de la base de datos
    res.send(result.rows );
    //res.send(sqldef)
  } catch (error) {
    console.error("Error generando o ejecutando la consulta:", error);
    res.status(500).json({ error: "Error procesando la solicitud" });
  }
};

*/
///////
//////////
function esConsultaSelect(sql) {
  const limpia = sql.trim().toUpperCase();

  // Validamos que empieza con SELECT y no contiene palabras peligrosas
  const empiezaConSelect = limpia.substring(4, 100).startsWith('SELECT');
  const contieneProhibidas = /(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE)/.test(limpia);

  return empiezaConSelect && !contieneProhibidas;
}

/////
export const consultasOpenaiNew = async (req, res) => {

  const { pregunta } = req.body;
  //console.log(`Pregunta recibida: ${pregunta}`);

  // console.log(process.env.OPENAI_ASSISTANT_ID_2)
  const assistantId = process.env.OPENAI_ASSISTANT_ID_1
  let currentThreadId = ''//req.session.threadId; // Obtener el threadId de la sesión


  try {


    // 1️⃣ Si no hay un threadId en sesión, se crea uno nuevo
    //if (!currentThreadId) {
    const thread = await openai.beta.threads.create();
    currentThreadId = thread.id;
    //req.session.threadId = currentThreadId; // Guardar en la sesión
    //console.log(`Nuevo threadId creado: ${currentThreadId}`);
    //} else {
    //  console.log(`Usando threadId existente: ${currentThreadId}`);
    //}

    // 2️⃣ Enviar la pregunta al Assistant
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: pregunta
    });

    // 3️⃣ Iniciar la ejecución con el Assistant configurado
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId
    });

    // 4️⃣ Esperar la respuesta
    let respuesta;
    while (!respuesta) {
      const runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      if (runStatus.status === "completed") {
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        respuesta = messages.data[0].content[0].text.value; // Obtener la respuesta SQL
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un segundo antes de verificar de nuevo
    }
    //console.log(respuesta)
    let sqlstr = limpiarConsultaSQL(respuesta);
    //console.log(sqlstr.substring(4,1000))
    // 5️⃣ Ejecutar la consulta en la base de datos
    if (esConsultaSelect(sqlstr)) {
      // Ejecutar consulta 
      const result = await coneccionDB.query(sqlstr.substring(4, 1000));
      res.send(result.rows)
      //ejecutarConsulta(sqlstr);
    } else {
      console.warn('Consulta bloqueada: solo se permiten consultas SELECT.');
      res.send([{ messages: "no data consulta no valida" }])
    }

    // 6️⃣ Responder con la consulta SQL generada y los resultados
    /* res.json({
       sql: sqlstr,
       data: result.rows,
       threadId: currentThreadId // Se devuelve el threadId por si se necesita en el frontend
     });
     */


  } catch (error) {
    console.error("Error generando SQL:", error);
    res.status(500).send([{ messages: 'Error en la generación de SQL' }]);
  }
};





export const getAnalizador_datos = async (req, res) => {
  try {
    const { rows } = req.body; // Extraer los datos del body
    //console.log('hola')
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: "Datos inválidos, se esperaba una lista de alumnos." });
    }

    const datos = JSON.stringify(rows);
    const assistantId = process.env.OPENAI_ASSISTANT_ID_2
    let currentThreadId = ''//req.session.threadId; // Obtener el threadId de la sesión

    const thread = await openai.beta.threads.create();
    currentThreadId = thread.id;
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: datos
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId
    });

    // 4️⃣ Esperar la respuesta
    let respuesta;
    while (!respuesta) {
      const runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      if (runStatus.status === "completed") {
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        respuesta = messages.data[0].content[0].text.value; // Obtener la respuesta SQL
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un segundo antes de verificar de nuevo
    }
    //console.log(respuesta)
    res.json(respuesta)
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};




export const askAssistant = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query no enviada" });

    const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID_HELP;

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: query,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (!["completed", "failed", "expired"].includes(runStatus.status)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } while (!["completed", "failed", "expired"].includes(runStatus.status));
    //console.log(query)
    const messages = await openai.beta.threads.messages.list(thread.id);

    const assistantResponses = [];
    messages.data.forEach((msg) => {
      if (msg.role === "assistant") {
        msg.content.forEach((c) => {
          if (c.type === "text") {
            assistantResponses.push(c.text.value);
          }
        });
      }
    });



    // 🔥 Normalizar salida a string
    const reply = assistantResponses.join("\n\n");
    //console.log(reply)
    return res.json({ reply });


    //return res.json({ responses: assistantResponses[0] });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    return res.status(500).json({ error: "Error consultando al asistente" });
  }
};

/*
export const askAssistant_R = async (req, res) => {


  try {

    const client = openai; // asumimos que ya lo inicializaste en otro módulo
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query no enviada" });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
            Eres un asistente amable y servicial para un Sistema de Información Académica.
            Tu tarea es responder **solo** con base en la información contenida en los documentos del sistema.
            tus respuestas deben ser concisas, directas al punto y no mayor a 50 palabras. 
            recuerda que los alumnos pueden ser de plan 2019 o plan 98
            Si no encuentras información relacionada, responde exactamente:
            
            "No hay información al respecto sobre ese tema. Puede ser que todavía no se ha procesado información del tema."
            
            Mantén un tono empático, claro y profesional.
          `,
        },
        {
          role: "user",
          content: query,
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [process.env.VECTOR_STORE_ID],

        },
      ],


    });

    const textoRespuesta =
      response.output_text ||
      "No se obtuvo una respuesta del asistente.";
    //console.log("Respuesta del asistente:", textoRespuesta);
    res.json({ respuesta: textoRespuesta });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    res.status(500).json({
      error: "Error interno al procesar la solicitud de ayuda.",
      detalle: error.message,
    });
  }
};


*/

///

export const askAssistant_R = async (req, res) => {
  try {
    const client = openai;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query no enviada" });
    }
   console.log(query)
    // Catálogo de acciones que el asistente puede "ordenar"
    const actionTools = [
      {
        type: "function",
        name: "consultar_alumnos_activos",
        description:
          "Devolver el listado/cantidad de alumnos activos. Usar cuando el usuario pregunte cuántos o cuáles alumnos están activos.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        type: "function",
        name: "consultar_alumnos_por_sede",
        description:
          "Devolver la cantidad de alumnos de una sede específica.",
        parameters: {
          type: "object",
          properties: {
            sede: { type: "string", description: "Nombre o id de la sede" },
          },
          required: ["sede"],
        },
      },
      {
        type: "function",
        name: "consultar_egresados_anio",
        description:
          "Devolver la cantidad de egresados de un año lectivo. Si no se especifica año, usar el año en curso.",
        parameters: {
          type: "object",
          properties: {
            anio: { type: "integer", description: "Año lectivo" },
          },
          required: ["anio"],
        },
      },
      {
        type: "function",
        name: "navegar_a",
        description:
          "Navegar a una sección del sistema cuando el usuario lo pida explícitamente ('llevame a…', 'abrí…').",
        parameters: {
          type: "object",
          properties: {
            ruta: {
              type: "string",
              enum: [
                "/estudiantes-activos",
                "/egresados",
                "/sedes",
                "/inscripciones",
                // sumá las que tengas en tu router
              ],
            },
          },
          required: ["ruta"],
        },
      },
    ];

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
Eres un asistente para un Sistema de Información Académica. Operás en DOS modos y elegís UNO según la intención del usuario:

1) ACCIÓN / CONSULTA OPERATIVA: si el usuario pide datos concretos del sistema (ej: "cuántos alumnos están activos", "alumnos de la sede X", "cuántos egresados llevamos este año") o pedir abrir una sección, INVOCÁ la function correspondiente. NO respondas con texto.

2) AYUDA / DOCUMENTACIÓN: si pregunta cómo usar el sistema, procedimientos, normativas o planes de estudio (recordá que los alumnos pueden ser plan 2019 o plan 98), usá file_search y respondé en menos de 50 palabras, tono empático, claro y profesional. Si no hay info, respondé exactamente: "No hay información al respecto sobre ese tema. Puede ser que todavía no se ha procesado información del tema."

Nunca combines los dos modos en una misma respuesta.
          `.trim(),
        },
        { role: "user", content: query },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [process.env.VECTOR_STORE_ID],
        },
        ...actionTools,
      ],
      tool_choice: "auto",
    });

    // ¿El modelo decidió invocar una de nuestras funciones?
    const functionCall = response.output?.find(
      (item) => item.type === "function_call"
    );
    console.log(functionCall);
    if (functionCall) {
      let parametros = {};
      try {
        parametros = JSON.parse(functionCall.arguments || "{}");
      } catch (_) {}
      console.log(`El asistente ordena ejecutar: ${functionCall.name} con parámetros:`, parametros);
      return res.json({
        tipo: "accion",
        accion: functionCall.name,
        parametros,
      });
    }

    // Caso ayuda (file_search): devolver texto
    const textoRespuesta =
      response.output_text || "No se obtuvo una respuesta del asistente.";
    console.log("Respuesta del asistente:", textoRespuesta);
    return res.json({
      tipo: "respuesta",
      respuesta: textoRespuesta,
    });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    res.status(500).json({
      error: "Error interno al procesar la solicitud de ayuda.",
      detalle: error.message,
    });
  }
};


///

export const getAnalizador_datos_R = async (req, res) => {
  try {
    const client = openai;
    const { consulta } = req.body;
    //console.log(consulta)

    if (!consulta) {
      return res.status(400).json({ error: "Query no enviada" });
    }
    // console.log(consulta)
    // ✅ Convertimos el objeto a texto legible para el modelo
    const queryText = consulta;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
           Eres un analizador de los planes de estudio 2026.
         Eres un asistente académico especializado en equivalencias de planes de estudio.
Tu única fuente de verdad es la información recuperada desde los documentos de equivalencias vectorizados.

Tarea principal:
Determinar qué actividades del Plan 2026 se otorgan como equivalencia,
indicando claramente por qué actividad del plan de origen se concede.

Reglas obligatorias:
- Responde SOLO con información presente en los documentos.
- NO inventes materias, códigos ni reglas.
- NO hagas suposiciones ni inferencias fuera del texto.
- Si una equivalencia es parcial, indícalo explícitamente y menciona el requisito.
- Si no existe equivalencia, indícalo explícitamente.

Formato de respuesta:
- Menciona primero la actividad del Plan 2026.
- Luego indica la actividad o actividades del plan de origen que otorgan la equivalencia.
- Usa frases breves y claras.
- No superes las 50 palabras.

Si no existe información relacionada, responde EXACTAMENTE:
"No hay información al respecto sobre ese tema. Puede ser que todavía no se ha procesado información del tema."

Tono:
Empático, claro y profesional.
          `,
        },
        {
          role: "user",
          content: queryText, // 👈 ahora es texto legible
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [
            process.env.VECTOR_STORE_ID_EQUI,

          ],
        },
      ],
    });
    
    const textoRespuesta =
      response.output_text || "No se obtuvo una respuesta del asistente.";
    //console.log("Respuesta del asistente:", textoRespuesta);
      res.json({ respuesta: textoRespuesta });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};
//////bbb






export const handlePromptResponse = async (req, res) => {
  try {
    const client = openai;
    const { consulta } = req.body;
    console.log(consulta)
    if (!consulta) {
      return res.status(400).json({ error: "Query no enviada" });
    }

    // ✅ Convertimos el objeto a texto legible para el modelo
    const queryText = Array.isArray(consulta) ? consulta.join(", ") : consulta;
    console.log(queryText)
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
           Eres un analizador de los planes de estudio 2026.
            Responde únicamente con base en la información recuperada del sistema.
          Las respuestas deben ser concisas, claras y no superar las 50 palabras.
          Si no existe información relacionada, responde exactamente:
          "No hay información al respecto sobre ese tema. Puede ser que todavía no se ha procesado información del tema."

          Mantén un tono empático, claro y profesional.
          No inventes información ni hagas suposiciones.
          debes dar las materias equivalentes del plan 26 a que materia se
          otorga

          `,
        },
        {
          role: "user",
          content: consulta, // 👈 ahora es texto legible
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_693ac43f41ac819184676d7a057f9e85"],
        },
      ],
    });

    const textoRespuesta =
      response.output_text || "No se obtuvo una respuesta del asistente.";
    res.json({ respuesta: textoRespuesta });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }

};

////////

///////



export const generateInformeIA_actividades_historicas = async (req, res) => {
  // 1. Desestructuración segura (asegúrate que los nombres coincidan con el service)
  const { data, promedios, filtrosAplicados } = req.body;

  // Ejecución previa
  const promediosCalculados = calcularPromediosAnuales(data);
  let esComparativo = false;
  promediosCalculados.length > 1 ? esComparativo = true : esComparativo = false;
  const bloqueEstadistico = esComparativo
    ? `ANÁLISIS MULTIANUAL DETECTADO:
       Histórico de Promedios: ${JSON.stringify(promediosCalculados)}
       INSTRUCCIÓN: Es obligatorio calcular la variación porcentual entre años.`
    : `ANÁLISIS DE PERIODO ÚNICO:
       Promedios Actuales: ${JSON.stringify(promediosCalculados)}
       INSTRUCCIÓN: Realiza un análisis descriptivo profundo de este periodo, ya que no hay datos previos para comparar.`;
  // Mapeo para compatibilidad con tu lógica interna
  const datos = data;
  const filtros = filtrosAplicados;
  let añoref = ''
  if (filtros.anioInicio !== filtros.anioFin) {
    añoref = `Año Referencia: desde ${filtros.anioInicio}-  hasta ${filtros.anioFin}`;

  } else {
    añoref = `Año Referencia: ${filtros.anioInicio}`;
  }

  let sede = ''
  if (filtros.sede === 1) {
    sede = 'MENDOZA'
  } else if (filtros.sede === 2) {
    sede = 'SAN RAFAEL'
  } else if (filtros.sede === 3) {
    sede = 'GRAL.ALVEAR'
  } else if (filtros.sede === 4) {
    sede = 'ESTE'
  } else {
    sede = 'TODAS'
  }

  let propuesta = ''
  if (filtros.propuesta === 1) {
    propuesta = 'Contador Publico Nacional'
  } else if (filtros.propuesta === 2) {
    propuesta = 'Licenciatura en Administracion'
  } else if (filtros.propuesta === 3) {
    propuesta = 'Licenciatura en Economia'
  } else if (filtros.propuesta === 6) {
    propuesta = 'Licenciatura en Gestion de Negocios Regionales'
  } else if (filtros.propuesta === 7) {
    propuesta = 'Licenciatura en Logistica'
  } else if (filtros.propuesta === 8) {
    propuesta = 'Contador Publico'
  } else {
    propuesta = 'Todas'
  }



  let browser; // Declaramos fuera para asegurar el cierre en el catch

  try {
    const client = openai;

    const prompt = `Genera un análisis académico profesional para la Sede: ${sede}. 
                    Contexto: Propuesta ${propuesta}, Periodo ${filtros?.periodo}.
                    Métricas: Promoción ${promedios?.relacion_promocion}, E2: ${promedios?.indice_e2}.
                    datos comparativos si hay mas de un año${bloqueEstadistico}
                    Datos: ${JSON.stringify(datos?.slice(0, 150))}`; // Limitamos para evitar errores de tokens

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: `Eres un analista de datos experto. Tu tarea es generar un informe académico basado en las siguientes reglas estrictas:

      1. AGRUPACIÓN POR ACTIVIDAD:
         - Los datos detallados contienen comisiones. Si una Actividad tiene múltiples comisiones en el mismo año, DEBES sumar los inscriptos y calcular el promedio ponderado de sus índices antes de determinar si pertenece al 5% mejor o peor.

      2. ANÁLISIS DE TENDENCIAS (Solo si hay >1 año):
         - Compara el Índice E1 y la Relación de Promoción entre años.
         - Identifica las actividades con "Mayor Aumento" y "Mayor Caída" comparando el último año contra el anterior.

      3. CRITERIOS DE SELECCIÓN:
         - Listado Mejores (Top 5%): Basado en Regularidad y Promoción. Solo actividades con >10 inscriptos.
         - Listado Peores (Bottom 5%): Basado en Regularidad y Promoción. Solo actividades con >10 inscriptos.
         - Si no hay suficientes actividades con >10 inscriptos, usa las disponibles pero acláralo.

      4. ESTRUCTURA DEL INFORME (HTML):
         - <h2> Título del Análisis.
         - <p> Resumen ejecutivo mencionando Sede y Propuesta.
         - <ul> Lista de métricas globales: Año, Inscriptos, Regularidad, Promoción, Cursada, E1 y E2.
         - <h2> Análisis de Extremos (Mejores y Peores rendimientos).
         - <h2> Variaciones (Solo si hay comparativa): Actividades con mayor aumento/caída.

      5. RESTRICCIONES:
         - Responde ÚNICAMENTE en HTML (h2, p, li). 
         - PROHIBIDO usar bloques de código markdown (\`\`\`html).
         - No menciones IDs internos, solo nombres de actividades/materias.
         - Si hay un solo año, omite toda mención a tendencias o variaciones.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });

    const textoAI = response.output_text || "No se pudo generar el análisis.";
    const textoLimpio = textoAI
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();
    // 2. Puppeteer
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    let htmlFinal = plantillaBase
      .replace('{{CONTENIDO_AI}}', textoLimpio)
      .replace('{{FILTRO_SEDE}}', sede || 'Todas')
      .replace('{{FILTRO_PROPUESTA}}', propuesta || 'Todas') // Agregado
      .replace('{{FILTRO_PERIODO}}', añoref + " - " + filtros?.periodo || 'Todos')    // Agregado
      .replace('{{AVG_PROMOCION}}', promedios?.relacion_promocion || '0')
      .replace('{{AVG_REGULAR}}', promedios?.relacion_regular || '0')
      .replace('{{AVG_E2}}', promedios?.indice_e2 || '0');

    await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true // Clave para que no salga en blanco
    });

    await browser.close();

    // 3. Respuesta Exitosa
    res.setHeader('Content-Type', 'application/pdf');
    // Forzamos el nombre del archivo para que el navegador lo reconozca
    res.setHeader('Content-Disposition', 'attachment; filename=informe_academico.pdf');
    res.end(pdfBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error detallado:', error);

    // IMPORTANTE: Si hay error, el front espera un Blob. 
    // Al fallar aquí, enviamos un status 500.
    res.status(500).set('Content-Type', 'text/plain').send(error.message);
  }
};





/**
 * Envía los datos crudos al orquestador para que el Agente Clasificador
 * realice su trabajo según las reglas de negocio (LA, CP, LE).
 */
export const ejecutarEquivalencias = async (req, res) => {
  try {
    const { origen, destino, materias } = req.body;

    // 1. Validación básica de presencia de datos
    if (!origen || !destino || !Array.isArray(materias)) {
      return res.status(400).json({
        error: "Se requieren 'origen', 'destino' y el array 'materias'."
      });
    }

    // 2. Empaquetado para 'input_as_text'
    // Creamos un objeto que coincida exactamente con lo que el agente clasificador busca
    const payloadParaAgente = {
      carrera_origen: origen,
      carrera_destino: destino,
      mat_aprobadas: materias
    };

    // 3. Llamada al Orquestador
    const run = await openai.responses.create({
      model: "gpt-4o-mini",
      // Convertimos el objeto a string para que entre como 'input_as_text'
      input: JSON.stringify(payloadParaAgente),
      metadata: {
        workflow_id: "wf_6928720e2b588190ba6a260e0c0d307b058620db2344363a"
      },
    });

    const resultado = run.output_text || run.choices?.[0]?.message?.content;
    console.log(resultado)
    if (!resultado) {
      return res.status(500).json({ error: "El flujo de agentes no devolvió respuesta." });
    }

    return res.status(200).send(resultado);

  } catch (error) {
    console.error("Error en el punto de entrada del workflow:", error);
    return res.status(500).json({
      error: "Error en la comunicación con el agente clasificador.",
      details: error.message
    });
  }
};



///


/**
 * GET /api/faqs
 * Query params opcionales:
 *  - plan=plan_2019 | plan_2026 | plan_1998
 *  - categoria=cambio_de_plan | equivalencias | general
 */
export const getFaqs = async (req, res) => {
  const { plan, categoria } = req.query;

  let resultado = faqs;

  if (plan) {
    resultado = resultado.filter(faq =>
      faq.aplica_a.includes(plan) || faq.aplica_a.includes("todos")
    );
  }

  if (categoria) {
    resultado = resultado.filter(
      faq => faq.categoria === categoria
    );
  }

  res.json({
    total: resultado.length,
    data: resultado
  });
};


