"use strict";
//////////
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarCarton = void 0;
// backend.ts
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var socket_io_1 = require("socket.io");
var http_1 = __importDefault(require("http"));
var path_1 = __importDefault(require("path"));
var body_parser_1 = __importDefault(require("body-parser"));
var db = __importStar(require("./db-connection"));
var app = express_1.default();
app.use(cors_1.default());
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
// Endpoints REST API
app.get('/players/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var query, db_response, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("GET /players/" + req.params.id);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                query = "SELECT * FROM usuarios WHERE id='" + req.params.id + "'";
                return [4 /*yield*/, db.query(query)];
            case 2:
                db_response = _a.sent();
                res.json(db_response.rows.length > 0 ? db_response.rows[0] : { error: 'User not found' });
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                console.error(err_1);
                res.status(500).send('Internal Server Error');
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post('/user', jsonParser, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var query, db_response, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('POST /user', req.body);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                query = "INSERT INTO usuarios (id, nombre_usuario, dinero)\n      VALUES ('" + req.body.id + "', '" + req.body.nombre_usuario + "', " + req.body.dinero + ")";
                return [4 /*yield*/, db.query(query)];
            case 2:
                db_response = _a.sent();
                res.json(db_response.rowCount == 1 ?
                    { message: 'Registro creado correctamente' } :
                    { error: 'No se pudo crear el registro' });
                return [3 /*break*/, 4];
            case 3:
                err_2 = _a.sent();
                console.error(err_2);
                res.status(500).send('Internal Server Error');
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// --- SOCKET.IO ---
io.on('connection', function (socket) {
    socket.on('disconnect', function () {
        var _a;
        var room = socket.data.room_code;
        var user = socket.data.username;
        if (room && user && users[room]) {
            users[room].delete(user);
            if (users[room].size === 0) {
                // limpiar sala y juego
                delete users[room];
                if ((_a = gameRooms[room]) === null || _a === void 0 ? void 0 : _a.intervalo) {
                    clearInterval(gameRooms[room].intervalo);
                }
            }
            else {
                io.to(room).emit('user_list_' + room, Array.from(users[room]));
            }
        }
    });
    socket.on('join_room', function (_a) {
        var info = _a.info;
        var code = info.code, user_name = info.user_name;
        socket.join(code);
        socket.data.username = user_name;
        socket.data.room_code = code;
        if (!users[code])
            users[code] = new Set();
        users[code].add(user_name);
        if (!gameRooms[code]) {
            gameRooms[code] = {
                numerosCantados: [],
                numerosDisponibles: generarOrdenNumeros(),
                numeroActual: null,
                juegoTerminado: false,
                ganador: null,
                intervalo: undefined,
            };
            // Lanzar números automáticamente cada 6 segundos
            gameRooms[code].intervalo = setInterval(function () {
                var room = gameRooms[code];
                if (!room)
                    return;
                if (room.numerosDisponibles.length === 0) {
                    if (room.intervalo)
                        clearInterval(room.intervalo);
                    room.juegoTerminado = true;
                    io.to(code).emit('game_ended', { ganador: room.ganador || null });
                    return;
                }
                var numero = room.numerosDisponibles.shift();
                room.numeroActual = numero;
                room.numerosCantados.push(numero);
                io.to(code).emit('numero_actual', {
                    numeroActual: numero,
                    numerosCantados: room.numerosCantados
                });
            }, 6000);
        }
        io.to(code).emit('user_list_' + code, Array.from(users[code]));
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
