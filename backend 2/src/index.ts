

//////////



// backend.ts

import express from "express";
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import * as db from './db-connection';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist/draw_board')));
const jsonParser = bodyParser.json();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// --- INTERFACES ---

interface GameRoomState {
  numerosCantados: number[];       // números ya cantados
  numerosDisponibles: number[];    // números por cantar, orden aleatorio
  numeroActual: number | null;     // número actual cantado
  juegoTerminado: boolean;
  ganador: string | null;
  intervalo?: NodeJS.Timeout;
}

// --- DATOS GLOBALES ---

let users: { [roomCode: string]: Set<string> } = {};
let gameRooms: { [roomCode: string]: GameRoomState } = {};

// --- FUNCIONES AUXILIARES ---

function generarOrdenNumeros(): number[] {
  let numeros = Array.from({ length: 90 }, (_, i) => i + 1);
  for (let i = numeros.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [numeros[i], numeros[j]] = [numeros[j], numeros[i]];
  }
  return numeros;
}

function generarNumerosAleatorios(cantidad: number, min: number, max: number): number[] {
  let numeros: Set<number> = new Set();
  while (numeros.size < cantidad) {
    let num = Math.floor(Math.random() * (max - min + 1)) + min;
    numeros.add(num);
  }
  return Array.from(numeros);
}

export function generarCarton(): ({ numero: number, tachado: boolean } | null)[][] {
  let filas = 3;
  let columnas = 9;
  let carton: ({ numero: number, tachado: boolean } | null)[][] = Array.from({ length: filas }, () =>
    Array(columnas).fill(null)
  );

  let columnasConNumeros: number[][] = [];
  for (let i = 0; i < columnas; i++) {
    let min = i === 0 ? 1 : i * 10;
    let max = i === 8 ? 90 : i * 10 + 9;
    let cantidad = 1 + Math.floor(Math.random() * 2); // 1 o 2 números
    columnasConNumeros[i] = generarNumerosAleatorios(cantidad, min, max).sort((a, b) => a - b);
  }

  for (let col = 0; col < columnas; col++) {
    for (let n = 0; n < columnasConNumeros[col].length; n++) {
      let intentos = 0;
      while (intentos < 10) {
        let fila = Math.floor(Math.random() * filas);
        if (carton[fila][col] === null && carton[fila].filter(c => c !== null).length < 5) {
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
  for (let f = 0; f < filas; f++) {
    let fila = carton[f];
    while (fila.filter(c => c !== null).length < 5) {
      let columnasDisponibles = fila
        .map((c, i) => (c === null ? i : -1))
        .filter(i => i !== -1);

      if (!columnasDisponibles.length) break;

      let col = columnasDisponibles[Math.floor(Math.random() * columnasDisponibles.length)];
      let min = col === 0 ? 1 : col * 10;
      let max = col === 8 ? 90 : col * 10 + 9;
      let nuevoNumero = generarNumerosAleatorios(1, min, max)[0];

      if (!carton.some(row => row[col]?.numero === nuevoNumero)) {
        fila[col] = { numero: nuevoNumero, tachado: false };
      }
    }
  }

  return carton;
}

// --- RUTAS HTTP ---

// Endpoints REST API
app.get('/players/:id', async (req, res) => {
  console.log(`GET /players/${req.params.id}`);
  try {
    let query = `SELECT * FROM usuarios WHERE id='${req.params.id}'`;
    let db_response = await db.query(query);
    res.json(db_response.rows.length > 0 ? db_response.rows[0] : {error: 'User not found'});
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/user', jsonParser, async (req, res) => {
  console.log('POST /user', req.body);
  try {
    let query = `INSERT INTO usuarios (id, nombre_usuario, dinero)
      VALUES ('${req.body.id}', '${req.body.nombre_usuario}', ${req.body.dinero})`;
    let db_response = await db.query(query);
    res.json(db_response.rowCount == 1 ? 
      {message: 'Registro creado correctamente'} : 
      {error: 'No se pudo crear el registro'});
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// --- SOCKET.IO ---

io.on('connection', (socket) => {

  socket.on('disconnect', () => {
    let room = socket.data.room_code;
    let user = socket.data.username;
    if (room && user && users[room]) {
      users[room].delete(user);
      if (users[room].size === 0) {
        // limpiar sala y juego
        delete users[room];
       if (gameRooms[room]?.intervalo) {
  clearInterval(gameRooms[room].intervalo!);
}

      } else {
        io.to(room).emit('user_list_' + room, Array.from(users[room]));
      }
    }
  });

  socket.on('join_room', ({ info }) => {
    let { code, user_name } = info;
    socket.join(code);
    socket.data.username = user_name;
    socket.data.room_code = code;

    if (!users[code]) users[code] = new Set();
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
      gameRooms[code].intervalo = setInterval(() => {
      let room = gameRooms[code];
      if (!room) return;

      if (room.numerosDisponibles.length === 0) {
      if (room.intervalo) clearInterval(room.intervalo);
      room.juegoTerminado = true;
      io.to(code).emit('game_ended', { ganador: room.ganador || null });
      return;
  }

      let numero = room.numerosDisponibles.shift()!;
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

  socket.on('bingo_cantado', ({ roomCode, jugador }) => {
    let room = gameRooms[roomCode];
    if (!room || room.juegoTerminado) return;

    room.juegoTerminado = true;
    room.ganador = jugador;
    if (room.intervalo) clearInterval(room.intervalo);

    io.to(roomCode).emit('bingo_ganado', {
      ganador: jugador
    });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Servidor corriendo en el puerto ${port}`));