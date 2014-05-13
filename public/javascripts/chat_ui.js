function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

// Helper function to update user list
function displayUserList(userList) {
    var users = userList.users.split(',');
    $('#user-list').empty();
    var slElement = $(document.createElement("option"));
    slElement.attr("value", "all");
    slElement.text("all");
    $('#user-list').append(slElement);
    for(var id in users) {
        user = users[id];
        if (user != '') {
            slElement = $(document.createElement("option"));
            slElement.attr("value", user);
            slElement.text(user);
            $('#user-list').append(slElement);
        }
    }
}

// Process user input
function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;
    if (message.charAt(0) == '/') {
        // If user input begins with a slash, treat it as a command
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        // Broadcast non-command input to other users
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement('You: ' + message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}

var socket = io.connect();
$(document).ready(function() {
                  var chatApp = new Chat(socket);
                  // Display the results of a name change attempt
                  socket.on('nameResult', function(result) {
                            var message;
                            if (result.success) {
                                message = 'You are now known as ' + result.name + '.';
                            } else {
                                message = result.message;
                            }
                            $("#name").text(result.name);
                            $('#messages').append(divSystemContentElement(message));
                            });
                  // Display the results of a room change
                  socket.on('joinResult', function(result) {
                            $('#room').text(result.room);
                            $('#messages').append(divSystemContentElement('Room changed.'));
                            $("#current-room").text(result.room);
                            chatApp.dispayUsersInRoom($('#room').text());
                            });
                  // Display the results of a user leaving a room
                  socket.on('leaveResult', function(result) {
                            $('#room').text('Lobby');
                            $('#messages').append(divSystemContentElement(result.nick + ' has left the chat'));
                            $("#current-room").text('Lobby');
                            chatApp.dispayUsersInRoom($('#room').text());
                            });
                  // Display received messages
                  socket.on('message', function (message) {
                            var newElement = $('<div></div>').text(message.text);
                            $('#messages').append(newElement);
                            });
                  // Display the list of users in the selected room
                  socket.on('userResult', function (userList) {
                                displayUserList(userList);
                            });
                  // Display list of available rooms
                  socket.on('rooms', function(rooms) {
                            $('#room-list').empty();
                            for(var room in rooms) {
                                room = room.substring(1, room.length);
                                if (room != '') {
                                    $('#room-list').append(divEscapedContentElement(room));
                                }
                            }
                            // Allow the click of a room name to display the users
                            // in that room in the user list
                            $('#room-list div').click(function() {
                                                      chatApp.dispayUsersInRoom($(this).text());
                                                      });
                            });
                  // Update the list of rooms periodically
                  setInterval(function() {
                              socket.emit('rooms');
                              }, 1000);
                  $('#send-message').focus();
                  $('#send-form').submit(function() {
                                         processUserInput(chatApp, socket);
                                         return false;
                                         });

                  });
