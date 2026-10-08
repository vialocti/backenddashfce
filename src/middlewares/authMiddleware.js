import jwt from 'jsonwebtoken'

export function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
        return res.status(401).json({ error: 'Token no provisto' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalido o expirado' })
        }
        req.app_client = payload
        next()
    })
}
