"use strict";
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
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var socket_io_1 = require("socket.io");
var cors_1 = __importDefault(require("cors"));
var path_1 = __importDefault(require("path"));
var body_parser_1 = __importDefault(require("body-parser"));
var db = __importStar(require("./db-connection"));
var app = express_1.default();
var server = http_1.default.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
    }
});
var port = process.env.PORT || 3000;
var jsonParser = body_parser_1.default.json();
app.use(cors_1.default());
app.use(express_1.default.static(path_1.default.join(__dirname, 'dist/chat-app')));
// Estructuras para gestión de salas
var roomHosts = {};
var rooms = {};
io.on('connection', function (socket) {
    console.log('Nuevo cliente conectado:', socket.id);
    socket.on('disconnect', function (reason) {
        console.log('Cliente desconectado:', socket.id, 'Razón:', reason);
        var username = socket.data.username;
        var roomCode = socket.data.room_code;
        if (username && roomCode && rooms[roomCode]) {
            rooms[roomCode].players.delete(username);
            console.log("Usuario " + username + " removido de sala " + roomCode);
            if (rooms[roomCode].players.size === 0) {
                console.log("Sala " + roomCode + " vac\u00EDa, eliminando...");
                if (rooms[roomCode].interval) {
                    clearInterval(rooms[roomCode].interval);
                }
                delete rooms[roomCode];
                delete roomHosts[roomCode];
            }
            else {
                io.to(roomCode).emit('user_list', Array.from(rooms[roomCode].players));
            }
        }
    });
    socket.on('join_room', function (data) {
        console.log('Solicitud para unirse a sala:', data);
        var code = data.code, username = data.username;
        if (!code || !username) {
            console.error('Datos inválidos para unirse a sala');
            return;
        }
        socket.join(code);
        socket.data.username = username;
        socket.data.room_code = code;
        if (!rooms[code]) {
            console.log("Creando nueva sala: " + code);
            rooms[code] = {
                players: new Set(),
                gameActive: false,
                numbers: [],
                calledNumbers: [],
                currentNumber: null
            };
        }
        rooms[code].players.add(username);
        console.log("Usuario " + username + " a\u00F1adido a sala " + code);
        io.to(code).emit('user_list', Array.from(rooms[code].players));
        if (!roomHosts[code]) {
            roomHosts[code] = username;
            socket.emit('set_host', true);
            console.log("Host establecido: " + username + " en sala " + code);
        }
        // Enviar estado actual si el juego ya está en progreso
        if (rooms[code].gameActive) {
            console.log("Enviando estado actual a nuevo jugador en sala " + code);
            socket.emit('game_started');
            socket.emit('current_state', {
                numbers: rooms[code].calledNumbers,
                current: rooms[code].currentNumber
            });
        }
    });
    socket.on('start_game', function (roomCode) {
        var _a;
        console.log("Solicitud para iniciar juego en sala " + roomCode);
        if (!roomHosts[roomCode] || !rooms[roomCode]) {
            console.error('Sala no existe o no tiene host');
            return;
        }
        if (roomHosts[roomCode] === socket.data.username) {
            console.log("Iniciando juego en sala " + roomCode);
            rooms[roomCode].gameActive = true;
            // Generar números aleatorios (1-90)
            rooms[roomCode].numbers = Array.from({ length: 90 }, function (_, i) { return i + 1; });
            // Barajar los números
            for (var i = rooms[roomCode].numbers.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                _a = [rooms[roomCode].numbers[j], rooms[roomCode].numbers[i]], rooms[roomCode].numbers[i] = _a[0], rooms[roomCode].numbers[j] = _a[1];
            }
            rooms[roomCode].calledNumbers = [];
            rooms[roomCode].currentNumber = null;
            // Enviar primer número inmediatamente
            if (rooms[roomCode].numbers.length > 0) {
                var firstNumber = rooms[roomCode].numbers.pop();
                rooms[roomCode].currentNumber = firstNumber;
                rooms[roomCode].calledNumbers.push(firstNumber);
                console.log("Enviando primer n\u00FAmero " + firstNumber + " a sala " + roomCode);
                io.to(roomCode).emit('next_number', firstNumber);
            }
            // Iniciar intervalo para números
            rooms[roomCode].interval = setInterval(function () {
                if (rooms[roomCode].numbers.length === 0) {
                    clearInterval(rooms[roomCode].interval);
                    console.log("Todos los n\u00FAmeros han sido cantados en sala " + roomCode);
                    return;
                }
                var nextNumber = rooms[roomCode].numbers.pop();
                rooms[roomCode].currentNumber = nextNumber;
                rooms[roomCode].calledNumbers.push(nextNumber);
                console.log("Enviando n\u00FAmero " + nextNumber + " a sala " + roomCode);
                io.to(roomCode).emit('next_number', nextNumber);
            }, 6000); // 6 segundos
            io.to(roomCode).emit('game_started');
        }
        else {
            console.log('Intento de inicio no autorizado:', socket.data.username, 'no es host');
        }
    });
    socket.on('bingo', function (data) {
        console.log('Bingo recibido:', data);
        var roomCode = data.roomCode;
        var username = socket.data.username;
        if (!rooms[roomCode] || !rooms[roomCode].gameActive) {
            console.log('Juego no activo o sala no existe');
            return;
        }
        // Verificar bingo
        var isValid = data.markedNumbers.every(function (num) {
            return rooms[roomCode].calledNumbers.includes(num);
        });
        if (isValid) {
            // Terminar juego para todos
            if (rooms[roomCode].interval) {
                clearInterval(rooms[roomCode].interval);
            }
            rooms[roomCode].gameActive = false;
            console.log("\u00A1Bingo v\u00E1lido! " + username + " ha ganado en sala " + roomCode);
            io.to(roomCode).emit('game_won', {
                winner: username,
                cartonIndex: data.cartonIndex
            });
        }
        else {
            console.log("Bingo inv\u00E1lido de " + username + " en sala " + roomCode);
            socket.emit('bingo_invalid', data.cartonIndex);
        }
    });
});
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
server.listen(port, function () {
    console.log("Servidor escuchando en http://localhost:" + port);
    console.log('Modo:', process.env.NODE_ENV || 'development');
});
