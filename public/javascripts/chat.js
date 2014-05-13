var Chat = function(socket) {
    this.socket = socket;
};


// Function to send chat messages
Chat.prototype.sendMessage = function(room, text) {
    var message = {
    room: room,
    text: text
    };
    this.socket.emit('message', message);
};

// Function to handle room change
Chat.prototype.changeRoom = function(room) {
    this.socket.emit('join', {
                     newRoom: room
                     });
};

// Function to handle user leaving a room
Chat.prototype.leaveRoom = function(room) {
    this.socket.emit('leave', {
                     room: room
                     });
};

// Helper function to update user list
Chat.prototype.dispayUsersInRoom = function(room) {
    this.socket.emit('users', {
                     currRoom: room
                     });
}

// Process user commands other than messages
Chat.prototype.processCommand = function(command) {
    var words = command.split(' ');
    var command = words[0]
    .substring(1, words[0].length)
    .toLowerCase();
    var message = false;
    switch(command) {
        case 'join':
            // Handle room change or creation
            words.shift();
            var room = words.join(' ');
            this.changeRoom(room);
            break;
        case 'nick':
            // Handle name change attempts
            words.shift();
            var name = words.join(' ');
            this.socket.emit('nameAttempt', name);
            break;
        case 'leave':
            // Handle user leaving a room
            this.leaveRoom();
            break;
        default:
            // Handle invalid commands
            message = 'Unrecognized command';
            break;
    }
    return message;
};
