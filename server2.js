import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// --- Nueva variable para almacenar el entorno de Postman ---
let postmanEnvironment = {};

// --- Ruta para cargar el entorno al inicio del servidor ---
// Puedes llamar a esta función cuando el servidor inicie o cuando lo desees.
// Por simplicidad, la llamaremos al iniciar el servidor aquí.
function loadPostmanEnvironment() {
    const envPath = path.join(__dirname, 'postman_environment.json'); // Asegúrate que esta ruta sea correcta

    if (fs.existsSync(envPath)) {
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const envData = JSON.parse(envContent);
            // Extraemos solo los valores de las variables enabled
            postmanEnvironment = envData.values.reduce((acc, current) => {
                if (current.enabled) {
                    acc[current.key] = current.value;
                }
                return acc;
            }, {});
            console.log('Entorno de Postman cargado exitosamente:', postmanEnvironment);
        } catch (error) {
            console.error('Error al cargar o parsear el entorno de Postman:', error.message);
            postmanEnvironment = {}; // Resetea si hay un error
        }
    } else {
        console.warn('Archivo postman_environment.json no encontrado en:', envPath);
    }
}

// Llamar a la función de carga al iniciar el servidor
loadPostmanEnvironment();


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Función para sustituir variables en una cadena (ej. URL) ---
function substituteVariables(text, env) {
    let newText = text;
    for (const key in env) {
        if (Object.hasOwnProperty.call(env, key)) {
            const value = env[key];
            // Reemplaza {{variable_name}} por su valor
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            newText = newText.replace(regex, value);
        }
    }
    return newText;
}


// Ruta POST para manejar las llamadas a la API externa (MODIFICADA)
app.post('/call-api', async (req, res) => {
    const apiUrlFromClient = req.body.apiUrl; // URL introducida por el usuario

    if (!apiUrlFromClient) {
        return res.status(400).json({ error: 'La URL de la API es requerida.' });
    }

    // --- Sustituir variables de Postman en la URL ---
    let finalApiUrl = substituteVariables(apiUrlFromClient, postmanEnvironment);
    console.log('URL de la API después de sustituir variables:', finalApiUrl);


    try {
        const response = await fetch(finalApiUrl); // Usamos la URL con variables sustituidas

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

// Ruta POST para guardar el JSON (sin cambios, ya que depende de la URL final)
app.post('/save-json', (req, res) => {
    const jsonDataString = req.body.jsonData;
    const originalUrl = req.body.originalUrl; // La URL original del cliente, sin sustituir

    let filename = 'api-response';

    if (originalUrl) {
        try {
            const urlObj = new URL(originalUrl);
            const pathSegments = urlObj.pathname.split('/').filter(segment => segment !== '');

            if (pathSegments.length > 0) {
                let lastSegment = pathSegments[pathSegments.length - 1];
                if (lastSegment.includes('?')) {
                    lastSegment = lastSegment.split('?')[0];
                }
                if (lastSegment.includes('#')) {
                    lastSegment = lastSegment.split('#')[0];
                }
                if (lastSegment.length > 0) {
                    filename = lastSegment;
                }
            }
        } catch (e) {
            console.warn('No se pudo parsear la URL para el nombre de archivo, usando el nombre por defecto.', e);
        }
    }

    filename = filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
    const finalFilename = `${filename}.json`;
    const downloadsDir = path.join(__dirname, 'downloads');

    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
    }

    const filePath = path.join(downloadsDir, finalFilename);

    try {
        JSON.parse(jsonDataString);

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