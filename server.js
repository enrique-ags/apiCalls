import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/call-api', async (req, res) => {
    const apiUrl = req.body.apiUrl;

    if (!apiUrl) {
        return res.status(400).json({ error: 'La URL de la API es requerida.' });
    }

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            let errorDetails = errorText;
            try {
                errorDetails = JSON.parse(errorText);
            } catch (parseError) {
                // No es JSON, se queda con el texto plano
            }
            throw new Error(`Error al llamar a la API externa: ${response.status} ${response.statusText}. Detalles: ${JSON.stringify(errorDetails, null, 2)}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error en /call-api:', error.message);
        res.status(500).json({
            error: 'Ocurrió un error al procesar la solicitud de la API.',
            details: error.message
        });
    }
});

// --- Ruta POST para guardar el JSON (MODIFICADA) ---
app.post('/save-json', (req, res) => {
    const jsonDataString = req.body.jsonData;
    const originalUrl = req.body.originalUrl; // <--- OBTENEMOS LA URL ORIGINAL

    let filename = 'api-response'; // Nombre de archivo por defecto

    // Extraer el último segmento de la URL
    if (originalUrl) {
        try {
            const urlObj = new URL(originalUrl); // Usamos el constructor URL para parsear
            const pathSegments = urlObj.pathname.split('/').filter(segment => segment !== ''); // Divide por '/' y filtra vacíos

            if (pathSegments.length > 0) {
                let lastSegment = pathSegments[pathSegments.length - 1];

                // Limpiar el segmento de cualquier query string o hash
                if (lastSegment.includes('?')) {
                    lastSegment = lastSegment.split('?')[0];
                }
                if (lastSegment.includes('#')) {
                    lastSegment = lastSegment.split('#')[0];
                }

                // Asegurarse de que el nombre no esté vacío después de la limpieza
                if (lastSegment.length > 0) {
                    filename = lastSegment;
                }
            }
        } catch (e) {
            console.warn('No se pudo parsear la URL para el nombre de archivo, usando el nombre por defecto.', e);
        }
    }

    // Asegurarse de que el nombre del archivo no tenga caracteres no válidos para nombres de archivo
    filename = filename.replace(/[^a-zA-Z0-9-_.]/g, '_'); // Reemplaza caracteres no válidos por guiones bajos

    const finalFilename = `${filename}.json`; // Añade la extensión .json
    const downloadsDir = path.join(__dirname, 'downloads');

    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
    }

    const filePath = path.join(downloadsDir, finalFilename);

    try {
        JSON.parse(jsonDataString); // Intentar parsear para validar que sea JSON

        fs.writeFile(filePath, jsonDataString, (err) => {
            if (err) {
                console.error('Error al escribir el archivo JSON:', err);
                return res.status(500).json({ message: 'Error al guardar el archivo JSON.', error: err.message });
            }
            res.json({ message: `Archivo "${finalFilename}" guardado exitosamente en la carpeta 'downloads'!` });
        });
    } catch (error) {
        console.error('Error al parsear o guardar el JSON:', error);
        return res.status(400).json({ message: 'El contenido proporcionado no es un JSON válido o hubo un error al guardarlo.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
    console.log(`Abre tu navegador y ve a http://localhost:${port}`);
});