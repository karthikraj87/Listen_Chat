var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
    // Start the Socket.io server
    io = socketio.listen(server);
    io.set('log level', 1);
    // Handle new user connection
    io.sockets.on('connection', function (socket) {
                  // Assign each user a guest name when they connect
                  guestNumber = assignGuestName(socket, guestNumber,
                                                nickNames, namesUsed);
                  // Place new users in 'Lobby' when they connect
                  joinRoom(socket, 'Lobby');
                  // Handle user messages, name change attempts, and room
                  // creation/changes, leaving a room etc
                  handleMessageBroadcasting(socket, nickNames);
                  handleNameChangeAttempts(socket, nickNames, namesUsed);
                  handleRoomJoining(socket);
                  // List of occupied rooms
                  socket.on('rooms', function() {
                            socket.emit('rooms', io.sockets.manager.rooms);
                            });
                  // Cleanup when a user leaves a room or disconnects
                  handleClientLeaving(socket, nickNames, namesUsed);
                  handleClientDisconnection(socket, nickNames, namesUsed);
                  handleDisplayUsers(socket, nickNames, namesUsed);
                  });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;
    // Associate guest name with connection ID
    nickNames[socket.id] = name;
    // Notify the user about their guest name
    socket.emit('nameResult', {
                success: true,
                name: name
                });
    namesUsed.push(name);
    return guestNumber + 1;
}

function broadcastUsers(socket, room) {
    // Get the list of users in a given room
    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length >= 1) {
        var usersInRoomSummary = '';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            usersInRoomSummary += nickNames[userSocketId];
            usersInRoomSummary += ',';
        }
        // Notify the update for the user list to all users in the room
        socket.broadcast.to(room).emit('userResult', {users: usersInRoomSummary});
    }
}

function displayUsers(socket, room) {
    // Get the list of users in a given room
    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length >= 1) {
        var usersInRoomSummary = '';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            usersInRoomSummary += nickNames[userSocketId];
            usersInRoomSummary += ',';
        }
        // Notify the update for the user list
        socket.emit('userResult', {users: usersInRoomSummary});
    }
}

function joinRoom(socket, room) {
    // Make the user join the given room
    socket.join(room);
    currentRoom[socket.id] = room;
    // Notify the user about the room that they have joined
    socket.emit('joinResult', {room: room});
    // Broadcast the addition of a new user to the room to all the users in the room
    socket.broadcast.to(room).emit('message', {
                                   text: nickNames[socket.id] + ' has joined ' + room + '.'
                                   });
    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        // Send summary of users in the current room to the user
        socket.emit('message', {text: usersInRoomSummary});
        displayUsers(socket, room);
        broadcastUsers(socket, room);
    }
}

function leaveRoom(socket, room) {
    // Notify user about leaving the current room
    socket.emit('leaveResult', {room: room, nick: nickNames[socket.id]});
    // Broadcast the user removal from the room to all the users in the room
    socket.broadcast.to(room).emit('message', {
                                   text: nickNames[socket.id] + ' has left ' + room + '.'
                                   });
    // Update user list
    displayUsers(socket, 'Lobby');
    broadcastUsers(socket, room);
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function(name) {
              // If the name isn't already registered, register it
              if (namesUsed.indexOf(name) == -1) {
              var previousName = nickNames[socket.id];
              var previousNameIndex = namesUsed.indexOf(previousName);
              namesUsed.push(name);
              nickNames[socket.id] = name;
              // Remove previous name so that its made available to other users
              delete namesUsed[previousNameIndex];
              socket.emit('nameResult', {
                          success: true,
                          name: name
                          });
              socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                                                               text: previousName + ' is now known as ' + name + '.'
                                                               });
              } else {
              // Send an error message to the user if the name is already registered
              socket.emit('nameResult', {
                          success: false,
                          message: 'That name is already in use.'
                          });
              }
              });
}

// Broadcast function to relay the message
function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
              socket.broadcast.to(message.room).emit('message', {
                                                     text: nickNames[socket.id] + ': ' + message.text
                                                     });
              });
}

// Function to enable room changing
function handleRoomJoining(socket) {
    socket.on('join', function(room) {
              socket.leave(currentRoom[socket.id]);
              leaveRoom(socket, currentRoom[socket.id]);
              joinRoom(socket, room.newRoom);
              });
}

// Clean up function when the user leaves a room
function handleClientLeaving(socket) {
    socket.on('leave', function() {
              socket.leave(currentRoom[socket.id]);
              leaveRoom(socket, currentRoom[socket.id]);
              // Place user back in 'Lobby'
              joinRoom(socket, 'Lobby');
              });
}

// Clean up function when the user leaves disconnects
function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
              var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
              delete namesUsed[nameIndex];
              delete nickNames[socket.id];
              });
}

// Helper function to update user list
function handleDisplayUsers(socket) {
    socket.on('users', function(room) {
              displayUsers(socket, room.currRoom);
              });
}
