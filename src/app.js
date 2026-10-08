import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import express from 'express'
//import session from 'express-session'
import ingresantesRoutes from './routes/ingresantesRoutes.js'
import inscriptosRoutes from './routes/inscriptosRoutes.js'
import opeanaiRoutes from './routes/openaiRoutes.js'
import rendimientoRoutes from './routes/rendimientoRoutes.js'
import utilesRoutes from './routes/utilesRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import logRoutes from './routes/logRoutes.js'
import faqRoutes from './routes/faqRoutes.js'
import padronesRoutes from './routes/padronesRoutes.js'
import processosRoutes from './routes/procesosRoutes.js'
import alumnosInfoRoutes from './routes/alumnosInfoRoutes.js'
import alumnosInfoOrquestadorRoutes from './routes/alumnosInfoOrquestadorRoutes.js'
import indicesOrquestadorRoutes from './routes/indicesOrquestadorRoutes.js'
import alumnosRoutes from './routes/alumnosRoutes.js'
import cursadasRoutes from './routes/cursadasRoutes.js'
import egresadosRoutes from './routes/egresadosRoutes.js'
import examenesRoutes from './routes/examenesRoutes.js'
import indicerendimientoRoutes from './routes/indicerendimientoRoutes.js'
import abanderadosRoutes from './routes/abanderadosRoutes.js'
import { verificarToken } from './middlewares/authMiddleware.js'
//

dotenv.config()
const app = express()

/*
app.use(session({
  secret: 'd1sb41rfc35nc5',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Usa `true` si tienes HTTPS
}));
*/
//

app.set('port', process.env.PORT)

//
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())

//
//

//
app.use('/dbingreso', ingresantesRoutes)
app.use('/dbinscriptos', inscriptosRoutes)
app.use('/dbegresados', egresadosRoutes)
app.use('/alutivos', alumnosRoutes)
app.use('/cursadas', cursadasRoutes)
app.use('/examenes', examenesRoutes)
app.use('/rendimiento', rendimientoRoutes)
app.use('/utiles', utilesRoutes)
app.use('/aluinfo', alumnosInfoRoutes)
app.use('/aluinfo-orquestador', alumnosInfoOrquestadorRoutes)
app.use('/indices-orquestador', indicesOrquestadorRoutes)

app.use('/admin', adminRoutes)
app.use('/log', logRoutes)
app.use('/faq', faqRoutes)
app.use('/padrones', padronesRoutes)
app.use('/procesos', processosRoutes)
app.use('/indices-rendimiento', indicerendimientoRoutes)
app.use('/abanderados', abanderadosRoutes)
app.use(verificarToken)
app.use('/datosanalisis', opeanaiRoutes)
export default app
