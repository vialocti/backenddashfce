import OpenAI from "openai";
import dotenv from 'dotenv'
dotenv.config()

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Usa variables de entorno para seguridad
});

export default openai
