import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import bodyParser from 'body-parser';
import * as db from './db-connection';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

const port = process.env.PORT || 3000;
const jsonParser = bodyParser.json();

app.use(cors());
app.use(express.static(path.join(__dirname, 'dist/chat-app')));

// Estructuras para gestión de salas
const roomHosts: Record<string, string> = {};
const rooms: Record<string, {
  players: Set<string>;
  gameActive: boolean;
  numbers: number[];
  calledNumbers: number[];
  currentNumber: number | null;
  interval?: NodeJS.Timeout;
}> = {};

io.on('connection', (socket: any) => {
  console.log('Nuevo cliente conectado:', socket.id);
  
  socket.on('disconnect', (reason: string) => {
    console.log('Cliente desconectado:', socket.id, 'Razón:', reason);
    const username = socket.data.username;
    const roomCode = socket.data.room_code;
    
    if (username && roomCode && rooms[roomCode]) {
      rooms[roomCode].players.delete(username);
      console.log(`Usuario ${username} removido de sala ${roomCode}`);
      
      if (rooms[roomCode].players.size === 0) {
        console.log(`Sala ${roomCode} vacía, eliminando...`);
        if (rooms[roomCode].interval) {
          clearInterval(rooms[roomCode].interval);
        }
        delete rooms[roomCode];
        delete roomHosts[roomCode];
      } else {
        io.to(roomCode).emit('user_list', Array.from(rooms[roomCode].players));
      }
    }
  });

  socket.on('join_room', (data: any) => {
    console.log('Solicitud para unirse a sala:', data);
    const { code, username } = data;
    
    if (!code || !username) {
      console.error('Datos inválidos para unirse a sala');
      return;
    }
    
    socket.join(code);
    socket.data.username = username;
    socket.data.room_code = code;

    if (!rooms[code]) {
      console.log(`Creando nueva sala: ${code}`);
      rooms[code] = {
        players: new Set(),
        gameActive: false,
        numbers: [],
        calledNumbers: [],
        currentNumber: null
      };
    }
    
    rooms[code].players.add(username);
    console.log(`Usuario ${username} añadido a sala ${code}`);
    io.to(code).emit('user_list', Array.from(rooms[code].players));

    if (!roomHosts[code]) {
      roomHosts[code] = username;
      socket.emit('set_host', true);
      console.log(`Host establecido: ${username} en sala ${code}`);
    }
    
    // Enviar estado actual si el juego ya está en progreso
    if (rooms[code].gameActive) {
      console.log(`Enviando estado actual a nuevo jugador en sala ${code}`);
      socket.emit('game_started');
      socket.emit('current_state', {
        numbers: rooms[code].calledNumbers,
        current: rooms[code].currentNumber
      });
    }
  });

  socket.on('start_game', (roomCode: string) => {
    console.log(`Solicitud para iniciar juego en sala ${roomCode}`);
    
    if (!roomHosts[roomCode] || !rooms[roomCode]) {
      console.error('Sala no existe o no tiene host');
      return;
    }
    
    if (roomHosts[roomCode] === socket.data.username) {
      console.log(`Iniciando juego en sala ${roomCode}`);
      rooms[roomCode].gameActive = true;
      
      // Generar números aleatorios (1-90)
      rooms[roomCode].numbers = Array.from({ length: 90 }, (_, i) => i + 1);
      // Barajar los números
      for (let i = rooms[roomCode].numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rooms[roomCode].numbers[i], rooms[roomCode].numbers[j]] = 
          [rooms[roomCode].numbers[j], rooms[roomCode].numbers[i]];
      }
      
      rooms[roomCode].calledNumbers = [];
      rooms[roomCode].currentNumber = null;
      
      // Enviar primer número inmediatamente
      if (rooms[roomCode].numbers.length > 0) {
        const firstNumber = rooms[roomCode].numbers.pop()!;
        rooms[roomCode].currentNumber = firstNumber;
        rooms[roomCode].calledNumbers.push(firstNumber);
        console.log(`Enviando primer número ${firstNumber} a sala ${roomCode}`);
        io.to(roomCode).emit('next_number', firstNumber);
      }
      
      // Iniciar intervalo para números
      rooms[roomCode].interval = setInterval(() => {
        if (rooms[roomCode].numbers.length === 0) {
          clearInterval(rooms[roomCode].interval!);
          console.log(`Todos los números han sido cantados en sala ${roomCode}`);
          return;
        }
        
        const nextNumber = rooms[roomCode].numbers.pop()!;
        rooms[roomCode].currentNumber = nextNumber;
        rooms[roomCode].calledNumbers.push(nextNumber);
        
        console.log(`Enviando número ${nextNumber} a sala ${roomCode}`);
        io.to(roomCode).emit('next_number', nextNumber);
      }, 6000); // 6 segundos
      
      io.to(roomCode).emit('game_started');
    } else {
      console.log('Intento de inicio no autorizado:', socket.data.username, 'no es host');
    }
  });

  socket.on('bingo', (data: {roomCode: string, cartonIndex: number, markedNumbers: number[]}) => {
    console.log('Bingo recibido:', data);
    const roomCode = data.roomCode;
    const username = socket.data.username;
    
    if (!rooms[roomCode] || !rooms[roomCode].gameActive) {
      console.log('Juego no activo o sala no existe');
      return;
    }
    
    // Verificar bingo
    const isValid = data.markedNumbers.every(num => 
      rooms[roomCode].calledNumbers.includes(num)
    );
    
    if (isValid) {
      // Terminar juego para todos
      if (rooms[roomCode].interval) {
        clearInterval(rooms[roomCode].interval);
      }
      rooms[roomCode].gameActive = false;
      
      console.log(`¡Bingo válido! ${username} ha ganado en sala ${roomCode}`);
      io.to(roomCode).emit('game_won', {
        winner: username,
        cartonIndex: data.cartonIndex
      });
    } else {
      console.log(`Bingo inválido de ${username} en sala ${roomCode}`);
      socket.emit('bingo_invalid', data.cartonIndex);
    }
  });
});

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

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  console.log('Modo:', process.env.NODE_ENV || 'development');
});