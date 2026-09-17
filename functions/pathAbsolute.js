import path from 'path'
import { fileURLToPath } from 'url'

export default function pathAbsolute (file) {

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)  
    
    const caminho = path.join(__dirname,'..',file)
    return caminho
}

