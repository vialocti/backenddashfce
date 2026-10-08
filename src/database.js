import {config} from './configdb.js'
import pkg from 'pg';
const {Pool} = pkg
const coneccionDB = new Pool(config)

export default coneccionDB

