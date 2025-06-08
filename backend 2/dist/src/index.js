"use strict";
// backend.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarCarton = void 0;
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var socket_io_1 = require("socket.io");
var http_1 = __importDefault(require("http"));
var path_1 = __importDefault(require("path"));
var body_parser_1 = __importDefault(require("body-parser"));
var app = express_1.default();
// Configuración segura de CORS
app.use(cors_1.default({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(body_parser_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, 'dist/draw_board')));
var jsonParser = body_parser_1.default.json();
var server = http_1.default.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
// --- DATOS GLOBALES ---
var users = {};
var gameRooms = {};
// --- FUNCIONES AUXILIARES ---
function generarOrdenNumeros() {
    var _a;
    var numeros = Array.from({ length: 90 }, function (_, i) { return i + 1; });
    for (var i = numeros.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [numeros[j], numeros[i]], numeros[i] = _a[0], numeros[j] = _a[1];
    }
    return numeros;
}
function generarNumerosAleatorios(cantidad, min, max) {
    var numeros = new Set();
    while (numeros.size < cantidad) {
        var num = Math.floor(Math.random() * (max - min + 1)) + min;
        numeros.add(num);
    }
    return Array.from(numeros);
}
function generarCarton() {
    var filas = 3;
    var columnas = 9;
    var carton = Array.from({ length: filas }, function () {
        return Array(columnas).fill(null);
    });
    var columnasConNumeros = [];
    for (var i = 0; i < columnas; i++) {
        var min = i === 0 ? 1 : i * 10;
        var max = i === 8 ? 90 : i * 10 + 9;
        var cantidad = 1 + Math.floor(Math.random() * 2); // 1 o 2 números
        columnasConNumeros[i] = generarNumerosAleatorios(cantidad, min, max).sort(function (a, b) { return a - b; });
    }
    for (var col = 0; col < columnas; col++) {
        for (var n = 0; n < columnasConNumeros[col].length; n++) {
            var intentos = 0;
            while (intentos < 10) {
                var fila = Math.floor(Math.random() * filas);
                if (carton[fila][col] === null && carton[fila].filter(function (c) { return c !== null; }).length < 5) {
                    carton[fila][col] = {
                        numero: columnasConNumeros[col][n],
                        tachado: false
                    };
                    break;
                }
                intentos++;
            }
        }
    }
    // Asegurar 5 números por fila
    for (var f = 0; f < filas; f++) {
        var fila = carton[f];
        var _loop_1 = function () {
            var columnasDisponibles = fila
                .map(function (c, i) { return (c === null ? i : -1); })
                .filter(function (i) { return i !== -1; });
            if (!columnasDisponibles.length)
                return "break";
            var col = columnasDisponibles[Math.floor(Math.random() * columnasDisponibles.length)];
            var min = col === 0 ? 1 : col * 10;
            var max = col === 8 ? 90 : col * 10 + 9;
            var nuevoNumero = generarNumerosAleatorios(1, min, max)[0];
            if (!carton.some(function (row) { var _a; return ((_a = row[col]) === null || _a === void 0 ? void 0 : _a.numero) === nuevoNumero; })) {
                fila[col] = { numero: nuevoNumero, tachado: false };
            }
        };
        while (fila.filter(function (c) { return c !== null; }).length < 5) {
            var state_1 = _loop_1();
            if (state_1 === "break")
                break;
        }
    }
    return carton;
}
exports.generarCarton = generarCarton;
// --- RUTAS HTTP ---
/*app.get('/players/:id', async (req, res) => {
  console.log(`GET /players/${req.params.id}`);
  try {
    // Prevención de SQL Injection
    let query = `SELECT * FROM usuarios WHERE id = $1`;
    let db_response = await db.query(query, [req.params.id]);
    res.json(db_response.rows.length > 0 ? db_response.rows[0] : {error: 'User not found'});
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/user', jsonParser, async (req, res) => {
  console.log('POST /user', req.body);
  
  // Validación de datos de entrada
  if (!req.body.id || !req.body.nombre_usuario || req.body.dinero === undefined) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    // Prevención de SQL Injection
    let query = `INSERT INTO usuarios (id, nombre_usuario, dinero)
      VALUES ($1, $2, $3)`;
    let params = [req.body.id, req.body.nombre_usuario, req.body.dinero];
    let db_response = await db.query(query, params);
    res.json(db_response.rowCount == 1 ?
      {message: 'Registro creado correctamente'} :
      {error: 'No se pudo crear el registro'});
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
*/
// --- SOCKET.IO ---
io.on('connection', function (socket) {
    socket.on('disconnect', function () {
        var _a;
        var room = socket.data.room_code;
        var user = socket.data.username;
        if (room && user && users[room]) {
            users[room].delete(user);
            // Transferir host si el host se desconecta
            if (socket.data.isHost && users[room].size > 0) {
                var newHost = Array.from(users[room])[0];
                io.to(room).emit('new_host', newHost);
            }
            if (users[room].size === 0) {
                // Limpieza segura de sala
                if ((_a = gameRooms[room]) === null || _a === void 0 ? void 0 : _a.intervalo) {
                    clearInterval(gameRooms[room].intervalo);
                }
                delete users[room];
                delete gameRooms[room];
            }
            else {
                io.to(room).emit('user_list_' + room, Array.from(users[room]));
            }
        }
    });
    socket.on('join_room', function (_a) {
        var info = _a.info;
        // Validación de código de sala
        var roomCodeRegex = /^[A-Z0-9]{4,6}$/i;
        if (!roomCodeRegex.test(info.code)) {
            socket.disconnect();
            return;
        }
        var code = info.code, user_name = info.user_name;
        socket.join(code);
        socket.data.username = user_name;
        socket.data.room_code = code;
        if (!users[code])
            users[code] = new Set();
        users[code].add(user_name);
        // Determinar si es el primer jugador (host)
        var isFirstUser = users[code].size === 1;
        if (isFirstUser) {
            socket.data.isHost = true;
            socket.emit('set_host'); // Notificar al primer usuario que es host
        }
        // Crear sala de juego si no existe
        if (!gameRooms[code]) {
            gameRooms[code] = {
                numerosCantados: [],
                numerosDisponibles: generarOrdenNumeros(),
                numeroActual: null,
                juegoTerminado: false,
                ganador: null,
                intervalo: undefined,
                juegoIniciado: false // Juego no iniciado inicialmente
            };
        }
        // Enviar lista de usuarios
        io.to(code).emit('user_list_' + code, Array.from(users[code]));
    });
    // Manejar inicio del juego por el host
    socket.on('start_game', function (roomCode) {
        var room = gameRooms[roomCode];
        if (!room || room.juegoIniciado)
            return;
        // Solo el host puede iniciar el juego
        if (socket.data.isHost) {
            room.juegoIniciado = true;
            // Iniciar intervalo para cantar números
            room.intervalo = setInterval(function () {
                if (room.numerosDisponibles.length === 0) {
                    if (room.intervalo)
                        clearInterval(room.intervalo);
                    room.juegoTerminado = true;
                    io.to(roomCode).emit('game_ended', { ganador: room.ganador || null });
                    return;
                }
                var numero = room.numerosDisponibles.shift();
                room.numeroActual = numero;
                room.numerosCantados.push(numero);
                io.to(roomCode).emit('numero_actual', {
                    numeroActual: numero,
                    numerosCantados: room.numerosCantados
                });
            }, 6000);
            // Notificar a todos que el juego comenzó
            io.to(roomCode).emit('game_started');
        }
    });
    socket.on('bingo_cantado', function (_a) {
        var roomCode = _a.roomCode, jugador = _a.jugador;
        var room = gameRooms[roomCode];
        if (!room || room.juegoTerminado)
            return;
        room.juegoTerminado = true;
        room.ganador = jugador;
        if (room.intervalo)
            clearInterval(room.intervalo);
        io.to(roomCode).emit('bingo_ganado', {
            ganador: jugador
        });
    });
});
var port = process.env.PORT || 3000;
server.listen(port, function () { return console.log("Servidor corriendo en el puerto " + port); });
