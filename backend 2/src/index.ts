// backend.ts

import express from "express";
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import * as db from './db-connection';

const app = express();

// Configuración segura de CORS
app.use(cors({
  origin: '*', // Reemplazar con tu dominio en producción
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist/draw_board')));
const jsonParser = bodyParser.json();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://bingo-bad44.web.app',
    methods: ['GET', 'POST']
  }
});

// --- INTERFACES ---

interface GameRoomState {
  numerosCantados: number[];
  numerosDisponibles: number[];
  numeroActual: number | null;
  juegoTerminado: boolean;
  ganador: string | null;
  intervalo?: NodeJS.Timeout;
  juegoIniciado: boolean;
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
    let cantidad = 1 + Math.floor(Math.random() * 2);
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

// --- SOCKET.IO ---

io.on('connection', (socket) => {

  socket.on('disconnect', () => {
    let room = socket.data.room_code;
    let user = socket.data.username;
    if (room && user && users[room]) {
      users[room].delete(user);

      if (socket.data.isHost && users[room].size > 0) {
        const newHost = Array.from(users[room])[0];
        io.to(room).emit('new_host', newHost);
      }

      if (users[room].size === 0) {
        if (gameRooms[room]?.intervalo) {
          clearInterval(gameRooms[room].intervalo!);
        }
        delete users[room];
        delete gameRooms[room];
      } else {
        io.to(room).emit('user_list_' + room, Array.from(users[room]));
      }
    }
  });

  socket.on('join_room', ({ info }) => {
    const roomCodeRegex = /^[A-Z0-9]{4,6}$/i;
    if (!roomCodeRegex.test(info.code)) {
      socket.disconnect();
      return;
    }

    let { code, user_name } = info;
    socket.join(code);
    socket.data.username = user_name;
    socket.data.room_code = code;

    if (!users[code]) users[code] = new Set();
    users[code].add(user_name);

    const isFirstUser = users[code].size === 1;
    if (isFirstUser) {
      socket.data.isHost = true;
      socket.emit('set_host');
    }

    if (!gameRooms[code]) {
      gameRooms[code] = {
        numerosCantados: [],
        numerosDisponibles: generarOrdenNumeros(),
        numeroActual: null,
        juegoTerminado: false,
        ganador: null,
        intervalo: undefined,
        juegoIniciado: false
      };
    }

    io.to(code).emit('user_list_' + code, Array.from(users[code]));
  });

  socket.on('start_game', (roomCode) => {
    const room = gameRooms[roomCode];
    if (!room || room.juegoIniciado) return;

    if (socket.data.isHost) {
      room.juegoIniciado = true;

      room.intervalo = setInterval(() => {
        if (room.numerosDisponibles.length === 0) {
          if (room.intervalo) clearInterval(room.intervalo);
          room.juegoTerminado = true;
          io.to(roomCode).emit('game_ended', { ganador: room.ganador || null });
          return;
        }

        let numero = room.numerosDisponibles.shift()!;
        room.numeroActual = numero;
        room.numerosCantados.push(numero);

        io.to(roomCode).emit('numero_actual', {
          numeroActual: numero,
          numerosCantados: room.numerosCantados
        });
      }, 6000);

      io.to(roomCode).emit('game_started');
    }
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
