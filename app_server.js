var DEBUGGING = true;   // toggle debugging (console logging for now)
var express = require('express');   // get the express module
var app = express();   // create express by calling the prototype of express
var http = require('http').Server(app);   // generate http instance and attach app as the server
var io = require('socket.io')(http);   // generate socket.io instance and provide http instance

var user_list = {};   // store active user objects {USER_ID: {'nickname': "User Name", 'last_seen': 113203503, 'moves'}}

var MAX_USER_NAME_LENGTH = 12;

var debug_interval;
var debug_players_time = 30;   // number of seconds between each player list console message
var debug_players_last_time = 0;   // seconds since last debug message for player list

app.get('/', function(req, res) {
	res.sendFile(__dirname +"/index.html");
});

app.use(express.static("public"));

function debug_message(message, force) {
	if(DEBUGGING || force) {
		console.log(message);
	}
}

function send_system_message(socket, message) {
	debug_message("System Message: "+ message);
	
	io.emit('system_message', {
		'message':	message
	});
}

function trim_str(str) {
	str = str.replace(/^\s+/g, "");
	str = str.replace(/\s+$/g, "");
	
	return str;
}


debug_interval = setInterval(function() {
	var num_users = 0, key, raw_players = [];
	
	//io.emit('request_sync_player');
	
	debug_players_last_time += 1;
	
	if(debug_players_last_time < debug_players_time) {
		return;
	}
	
	debug_players_last_time = 0;
	
	for(key in user_list) {
		num_users += 1;
		raw_players.push(key +": "+ user_list[ key ].name);
	}
	
	debug_message("Active players: "+ num_users);
	debug_message("Players: "+ raw_players.join(", "));
}, 1000);


// user connection
io.on('connection', function(socket) {
	var pen_id,
		moves = [],   // simple array of {}
		updateLastSeen;
	
	// make sure we get a unique pen_id
	do {
		pen_id = "User"+ Math.ceil((Math.random() * 100000))
	} while(user_list[ pen_id ] !== undefined);
	
	// create user_list entry
	user_list[ pen_id ] = {
		'id':			pen_id,
		'is_drawing':	false,
		'draw_life':	0,
		'name':			"",
		'color':		{'r': 0, 'g': 0, 'b': 0},
		'lines':		[],
		'last_seen':	new Date()
	};
	
	
	updateLastSeen = function() {
		user_list[ pen_id ].last_seen = new Date();
	};
	
	// broadcast to all other sockets except this socket
	send_system_message(socket, "User "+ pen_id +" has joined");
	
	// tell player their pen_id
	socket.emit('set_pen_id', {
		'id':	pen_id
	});
	
	io.emit('request_sync_player');
	
	// event: user changes name
	socket.on('name_change', function(data) {
		var old_nickname = user_list[ pen_id ].name,
			new_nickname = data.name || "";
		
		updateLastSeen();
		
		debug_message("User '"+ old_nickname +"' attempting to change nickname to '"+ new_nickname +"'");
		
		// test for empty string
		if("" == (new_nickname = trim_str(new_nickname))) {
			debug_message("new_nickname empty string");
			
			return;
		}
		
		// test if no change in nickname
		if(old_nickname == new_nickname) {
			debug_message("new_nickname not different");
			
			return;
		}
		
		// only allow acceptable characters
		if(!new_nickname.match(/^[A-Za-z0-9\-_][A-Za-z0-9\-_\s]*$/g)) {
			debug_message("new_nickname did not match");
			
			return;
		}
		
		// trim off extra characters
		new_nickname = new_nickname.substring(0, MAX_USER_NAME_LENGTH);
		
		// save name by updating user_list
		user_list[ pen_id ].name = nickname;
		
		// tell other users about nickname change
		send_system_message(socket, "User "+ old_nickname +" changed name to "+ user_list[ pen_id ].name);
	});
	
	// event: sync player data
	socket.on('sync_player', function(data) {
		updateLastSeen();
		
		if(data.is_drawing !== undefined) {
			user_list[ pen_id ].is_drawing = data.is_drawing;
		}
		
		if(data.draw_life !== undefined) {
			user_list[ pen_id ].draw_life = data.draw_life;
		}
		
		if(data.name !== undefined) {
			user_list[ pen_id ].name = data.name;
		}
		
		if(data.color !== undefined) {
			user_list[ pen_id ].color = data.color;
		}
		
		if(data.lines !== undefined) {
			user_list[ pen_id ].lines = data.lines;
		}
		
		io.emit('sync_player', {
			'id':			pen_id,
			'is_drawing':	user_list[ pen_id ].is_drawing,
			'draw_life':	user_list[ pen_id ].draw_life,
			'name':			user_list[ pen_id ].name,
			'color':		user_list[ pen_id ].color,
			'lines':		user_list[ pen_id ].lines
		});
	});
	
	// event: refresh all data except this user
	socket.on('freshen', function(data) {
		updateLastSeen();
		
		socket.emit('freshen', user_list);
	});
	
	// event: user disconnect
	socket.on('disconnect', function() {
		debug_message("User "+ user_list[ pen_id ].name +" disconnected");
		
		send_system_message(socket, "User "+ user_list[ pen_id ].name +" has left");
		
		updateLastSeen();
		
		if(user_list[ pen_id ] !== undefined) {
			delete user_list[ pen_id ];
		}
		
		io.emit('remove_player', {
			'id':	pen_id
		});
	});
});

http.listen(7223, function() {
	debug_message("Listening on *:7223", true);
});