// import io from 'socket.io-client';

// // Establish a connection
// const socket = io('http://localhost:3000');

// // Listen for the connect event
// socket.on('connect', () => {
//   console.log('Connected to the server');

//   // Join a room
//   socket.emit('joinRoom', 'room1');

//   // Emit a custom event with data
//   socket.emit('customEvent', { message: 'Hello, Server!' });

//   // Listen for a custom event
//   socket.on('customEvent', (data) => {
//     console.log('Received custom event:', data);
//   });

//   // Broadcast to all clients in the room
//   socket.emit('message', { room: 'room1', message: 'Hello, everyone in room1!' });
  
//   // Handle disconnect
//   socket.on('disconnect', () => {
//     console.log('Disconnected from the server');
//   });
// });
