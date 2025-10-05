const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importamos tu archivo de conexión a la BD

const app = express();
const port = 3000; // Puerto para el servidor

app.use(cors());
app.use(express.json()); // Para poder recibir datos JSON desde la app

// Endpoint para el login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos' });
    }

    try {
        // Buscamos en la BD un usuario que coincida con el username
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);

        if (rows.length === 0) {
            // Si no se encuentra el usuario
            return res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];

        // Comparamos la contraseña (¡OJO! Esto es solo para desarrollo)
        if (password === user.password) {
            // Si la contraseña coincide
            res.json({ success: true, message: 'Inicio de sesión exitoso', user });
        } else {
            // Si la contraseña es incorrecta
            res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);  
});