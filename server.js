const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importamos tu archivo de conexión a la BD
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000; // Puerto para el servidor

app.use(cors());
app.use(express.json()); // Para poder recibir datos JSON desde la app
const JWT_SECRET = 'jsontoken';

// Middlewares
app.use(cors());
app.use(express.json());

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

        const validPassw = (password === user.password);

        if (!validPassw) {
            res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign(
            {
                id: user.id_user,
                nombre: user.nombre,
                tipo_user: user.tipo_user
            },
            JWT_SECRET,
            { expiresIn: '3h' } // El token expirará en 3hr
        );
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token: token,
            user: {
                id: user.id_user,
                nombre: user.nombre,
                apellido: user.apellido,
                tipo_user: user.tipo_user
            }
        });

        // Comparamos la contraseña (¡OJO! Esto es solo para desarrollo)
        // if (password === user.password) {
        //     // Si la contraseña coincide
        //     res.json({ success: true, message: 'Inicio de sesión exitoso', user });
        // } else {
        //     // Si la contraseña es incorrecta
        //     res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        // }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Middleware de autenticacion
const checkToken = (req, res, next) => {
    // Obtenemos el token del encabezado 'Authorization'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. No se proporcionó token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token no válido o expirado.' }); // Forbidden
        }
        // Si el token es válido, guardamos los datos del usuario en el objeto `req`
        req.user = user;
        next(); // Continuamos a la siguiente función/ruta
    });
};

// Middleware para verificar si el usuario es un alumno
const esAlumno = (req, res, next) => {
    if (req.user.tipo_user !== 'alumno') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Ruta solo para alumnos.' });
    }
    next();
};

// Middleware para verificar si el usuario es un profesor
const esProfesor = (req, res, next) => {
    if (req.user.tipo_user !== 'profesor') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Ruta solo para profesores.' });
    }
    next();
};

// -- RUTAS PROTEGIDAS --
// Se aplican los middlewares en orden: primero verifica el token, luego si es alumno
app.get('/api/mis-calificaciones', [checkToken, esAlumno], async (req, res) => {
    try {
        const idAlumno = req.user.id; // Obtenemos el ID del alumno desde el token verificado
        const [kardex] = await pool.query('SELECT materia, calificacion FROM kardex WHERE id_alumno = ?', [idAlumno]);
        res.json({ success: true, data: kardex });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener calificaciones.' });
    }
});

// Ruta para que un profesor vea la lista de todos los alumnos
app.get('/api/alumnos', [checkToken, esProfesor], async (req, res) => {
     try {
        const [alumnos] = await pool.query("SELECT id_user, nombre, apellido FROM usuarios WHERE tipo_user = 'alumno'");
        res.json({ success: true, data: alumnos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener la lista de alumnos.' });
    }
});



app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);  
});