import coneccionDB from "../database";

export const getAprobadasHistoricoPrimer = async (req, res) => {    
   
    
    try {
        
        const result= await coneccionDB.query(`
            SELECT * FROM fce_per.dash_aprobadas_anio  order by anio desc       
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getIndicesTotales = async (req, res) => {    
   
    
    try {
        
        const result= await coneccionDB.query(`
            SELECT * FROM fce_per.dash_indices_total         
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getTurnosExamenesMain  = async (req, res) => {    
   
    
    try {
        
        const result= await coneccionDB.query(`         
            SELECT * FROM fce_per.dash_turnos_examenes     
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

