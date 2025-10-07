const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importamos tu archivo de conexión a la BD

const app = express();
const port = 3000; // Puerto para el servidor

app.use(cors());
app.use(express.json()); // Para poder recibir datos JSON desde la app

// ... (El endpoint de /login no cambia) ...
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];

        if (password === user.password) {
            res.json({ success: true, message: 'Inicio de sesión exitoso', user });
        } else {
            res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// ... (El endpoint de /mis-calificaciones no cambia) ...
app.get('/mis-calificaciones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [calificaciones] = await pool.query('SELECT materia, calificacion FROM kardex WHERE id_alumno = ?', [id]);
        res.json({ success: true, calificaciones });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener calificaciones' });
    }
});


// --- ENDPOINTS PARA PROFESORES (CRUD) ---

// GET: Devolver la lista de todos los alumnos (sin cambios)
app.get('/alumnos', async (req, res) => {
    try {
        const [alumnos] = await pool.query("SELECT id_user, nombre, apellido FROM usuarios WHERE tipo_user = 'alumno'");
        res.json({ success: true, alumnos });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener la lista de alumnos' });
    }
});

// --- NUEVO ENDPOINT PARA CREAR ALUMNOS ---
app.post('/alumnos', async (req, res) => {
    const { nombre, apellido, username, password } = req.body;
    if (!nombre || !apellido || !username || !password) {
        return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [userResult] = await connection.query(
            'INSERT INTO usuarios (nombre, apellido, tipo_user, username, password) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, 'alumno', username, password]
        );
        
        const newUserId = userResult.insertId;

        await connection.query(
            'INSERT INTO alumnos_prop (id_alumno, estado) VALUES (?, ?)',
            [newUserId, 'alta']
        );

        await connection.commit();
        res.status(201).json({ success: true, message: 'Alumno agregado correctamente.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error en POST /alumnos:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El nombre de usuario ya existe.' });
        }
        res.status(500).json({ success: false, message: 'Error en el servidor al agregar alumno.' });
    } finally {
        connection.release();
    }
});


// ... (Los endpoints de calificaciones no cambian) ...
app.get('/calificaciones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [calificaciones] = await pool.query('SELECT materia, calificacion FROM kardex WHERE id_alumno = ?', [id]);
        res.json({ success: true, calificaciones });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener las calificaciones del alumno' });
    }
});

app.post('/calificaciones', async (req, res) => {
    const { id_alumno, materia, calificacion } = req.body;
    try {
        await pool.query('INSERT INTO kardex (id_alumno, materia, calificacion) VALUES (?, ?, ?)', [id_alumno, materia, calificacion]);
        res.status(201).json({ success: true, message: 'Calificación agregada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al agregar la calificación. ¿Quizás la materia ya existe para este alumno?' });
    }
});

app.put('/calificaciones', async (req, res) => {
    const { id_alumno, materia, calificacion } = req.body;
    try {
        const [result] = await pool.query('UPDATE kardex SET calificacion = ? WHERE id_alumno = ? AND materia = ?', [calificacion, id_alumno, materia]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'No se encontró la materia para el alumno especificado.' });
        }
        res.json({ success: true, message: 'Calificación actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar la calificación' });
    }
});

app.delete('/calificaciones', async (req, res) => {
    const { id_alumno, materia } = req.query;
    try {
        const [result] = await pool.query('DELETE FROM kardex WHERE id_alumno = ? AND materia = ?', [id_alumno, materia]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'No se encontró la materia para el alumno especificado.' });
        }
        res.json({ success: true, message: 'Calificación eliminada correctamente' });
    } catch (error) {
        console.error('Error en DELETE /calificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la calificación' });
    }
});


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

