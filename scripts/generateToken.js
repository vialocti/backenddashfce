// Genera un JWT de larga duracion para una aplicacion cliente confiada.
// Uso: npx babel-node scripts/generateToken.js <nombreApp> [duracion]
// Ejemplo: npx babel-node scripts/generateToken.js dashboard-cp 365d
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

const [, , appName, expiresIn = '365d'] = process.argv

if (!appName) {
    console.error('Uso: npx babel-node scripts/generateToken.js <nombreApp> [duracion]')
    process.exit(1)
}

if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en el .env')
    process.exit(1)
}

const token = jwt.sign({ app: appName }, process.env.JWT_SECRET, { expiresIn })

console.log(token)
