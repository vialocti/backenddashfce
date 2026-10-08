
import coneccionDB from "../database";



export const logProceso = async (req, res) => {
    const { anio, modo, operacion, paso, estado, stats, error } = req.body;
    console.log(req.body);
    const query = `
    INSERT INTO fce_per.proceso_logs (anio, modo, operacion, paso, estado, stats, error_detalle)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id;
  `;

    try {
        const { rows } = await coneccionDB.query(query, [anio, modo, operacion, paso, estado, stats, error]);
        res.status(200).json({ id_log: rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateLogProceso = async (req, res) => {
    const { id } = req.params; // El ID que viene de n8n
    const { estado, paso, stats, error_detalle } = req.body;

    // Preparamos la consulta de actualización
    // Usamos COALESCE para mantener el valor anterior si no se envía uno nuevo
    const query = `
    UPDATE fce_per.proceso_logs
    SET 
      estado = COALESCE($1, estado),
      paso = COALESCE($2, paso),
      stats = COALESCE($3, stats),
      error_detalle = COALESCE($4, error_detalle),
      fecha_fin =  CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *;
  `;

    try {
        const values = [
            estado,
            paso,
            stats ? JSON.stringify(stats) : null, // Convertimos el objeto stats a string para JSONB
            error_detalle,
            id
        ];

        const { rows } = await coneccionDB.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Log no encontrado" });
        }

        res.status(200).json({
            status: "success",
            message: "Log actualizado correctamente",
            data: rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar log:', error);
        res.status(500).json({ status: "error", message: error.message });
    }
};