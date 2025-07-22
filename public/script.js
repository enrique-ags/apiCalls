document.addEventListener('DOMContentLoaded', () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const callApiBtn = document.getElementById('callApiBtn');
    const apiResponseTextarea = document.getElementById('apiResponse');
    const copyResponseBtn = document.getElementById('copyResponseBtn');
    const saveResponseBtn = document.getElementById('saveResponseBtn');

    // Inicialmente deshabilitar los botones de acción
    copyResponseBtn.disabled = true;
    saveResponseBtn.disabled = true;

    // Función para habilitar/deshabilitar botones de acción
    function setActionButtonsState(enable) {
        copyResponseBtn.disabled = !enable;
        saveResponseBtn.disabled = !enable;
    }

    callApiBtn.addEventListener('click', async () => {
        const apiUrl = apiUrlInput.value.trim();

        if (!apiUrl) {
            apiResponseTextarea.value = "Por favor, introduce una URL de API válida.";
            apiResponseTextarea.style.color = 'red';
            setActionButtonsState(false);
            return;
        }

        apiResponseTextarea.value = "Cargando respuesta...";
        apiResponseTextarea.style.color = 'black';
        setActionButtonsState(false);

        try {
            const response = await fetch('/call-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiUrl: apiUrl })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || `Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            apiResponseTextarea.value = JSON.stringify(data, null, 2);
            apiResponseTextarea.style.color = 'green';
            setActionButtonsState(true);

        } catch (error) {
            console.error('Error al llamar a la API:', error);
            apiResponseTextarea.value = `Error: ${error.message}\n\nPor favor, verifica la URL o la consola para más detalles.`;
            apiResponseTextarea.style.color = 'red';
            setActionButtonsState(false);
        }
    });

    copyResponseBtn.addEventListener('click', () => {
        apiResponseTextarea.select();
        apiResponseTextarea.setSelectionRange(0, 99999);

        try {
            navigator.clipboard.writeText(apiResponseTextarea.value)
                .then(() => {
                    alert('Respuesta copiada al portapapeles!');
                })
                .catch(err => {
                    console.error('Error al copiar al portapapeles:', err);
                    alert('No se pudo copiar la respuesta. Inténtalo manualmente.');
                });
        } catch (err) {
            document.execCommand('copy');
            alert('Respuesta copiada al portapapeles! (Método antiguo)');
        }
    });

    // --- Lógica del botón "Guardar como JSON" (MODIFICADA) ---
    saveResponseBtn.addEventListener('click', async () => {
        const responseData = apiResponseTextarea.value;
        const originalApiUrl = apiUrlInput.value.trim(); // <--- OBTENEMOS LA URL ORIGINAL

        if (!responseData || responseData.trim() === '' || responseData.includes("Cargando respuesta...") || responseData.includes("Error:")) {
            alert('No hay una respuesta válida para guardar.');
            return;
        }

        try {
            // Enviamos la URL original junto con los datos JSON al servidor
            const response = await fetch('/save-json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonData: responseData,
                    originalUrl: originalApiUrl // <--- ¡AÑADIDO!
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            alert(result.message);

        } catch (error) {
            console.error('Error al guardar el JSON:', error);
            alert(`Error al intentar guardar el archivo: ${error.message}`);
        }
    });
});