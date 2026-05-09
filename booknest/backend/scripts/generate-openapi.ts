import fs from 'fs'
import path from 'path'
import { generateOpenApiDocument } from '../src/lib/openapi'

const document = generateOpenApiDocument()
const outputPath = path.resolve(__dirname, '../generated/openapi.json')

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2))

console.log(`OpenAPI generated: ${outputPath}`)
