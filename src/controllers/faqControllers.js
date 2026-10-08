import faqs from "../utiles/faqs_preguntas_frecuentes.json" ;

export const getPreguntas = (req, res) => {
  const preguntas = faqs.map(faq => ({
    id: faq.id,
    pregunta: faq.pregunta
  }));

  res.status(200).json(preguntas);
};


export const getPreguntaById = (req, res) => {
  const { id } = req.params;
 
  const pregunta = faqs.find(faq => faq.id === id);

  if (!pregunta) {
    return res.status(404).json({
      message: "Pregunta no encontrada"
    });
  }

  res.status(200).json({
    id: pregunta.id,
    pregunta: pregunta.pregunta,
    respuesta: pregunta.respuesta
  });
};
