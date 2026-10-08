import app from './app.js'
import coneccionDB from './database.js'

const requeridas = ['PORT', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT']
const faltantes = requeridas.filter((nombre) => !process.env[nombre])
if (faltantes.length > 0) {
    console.error('Faltan variables de entorno: ' + faltantes.join(', '))
    process.exit(1)
}

const server = app.listen(app.get('port'), ()=>{
    console.log('server is runnig in Port ' + app.get('port'))
})

// pm2 envia SIGINT al reiniciar: se dejan terminar los pedidos en curso y se cierra el pool
const cerrar = () => {
    server.close(async () => {
        await coneccionDB.end().catch(() => {})
        process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)
