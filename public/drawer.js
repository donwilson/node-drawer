	
	var canvas,
		context,
		socket,
		player,
		can_render = true,
		window_width = 0, window_height = 0,
		window_halfWidth = 0, window_halfHeight = 0,
		mouse_screenPosition = {'x': 0, 'x': 0},
		
		// [{'r': 0-255, 'g': 0-255, 'b': 0-255}, ...]
		colors = [
			{'r': 235, 'g':  75, 'b':   0},
			{'r': 225, 'g': 125, 'b': 255},
			{'r': 180, 'g':   7, 'b':  20},
			{'r':  80, 'g': 170, 'b': 240},
			{'r': 180, 'g':  90, 'b': 135},
			{'r': 195, 'g': 240, 'b':   0},
			{'r': 150, 'g':  18, 'b': 255},
			{'r':  80, 'g': 245, 'b':   0},
			{'r': 165, 'g':  25, 'b':   0},
			{'r':  80, 'g': 145, 'b':   0},
			{'r':  80, 'g': 170, 'b': 240},
			{'r':  55, 'g':  92, 'b': 255}
		],
		
		thicknesses = [1, 2, 4, 6, 8, 10],
		
		drawings = {},   // {$DRAWING_KEY$: Pen instance}
		//user_ids = [],   // [{drawing_key: $DRAWING_KEY$, name: "..."}]
		
		input_active = {},
		game_fps = 0,
		loop__time = new Date().getTime(),
		fps = 0,
		last_fps = 0,
		
		MAX_USER_NAME_LENGTH = 12,
		DEFAULT_USER_THICKNESS = 4,
		MIN_USER_THICKNESS = Math.min.apply(null, thicknesses),
		MAX_USER_THICKNESS = Math.max.apply(null, thicknesses);
	
	
	function createCookie(name, value, days, path) {
		var expires = "",
			date;
		
		path = path || "/";
		
		if(days) {
			date = new Date();
			date.setTime((date.getTime() + (days * 24 * 60 * 60 * 1000)));
			
			expires = "; expires="+ date.toGMTString();
		}
		
		document.cookie = name +"="+ value + expires +"; path="+ path;
	}
	
	function readCookie(name) {
		var nameEQ = name +"=",
			ca = document.cookie.split(";"),
			j, k, c;
		
		for(j=0, k = ca.length; j < k; j++) {
			c = ca[ j ];
			
			while (c.charAt(0) == " ") {
				c = c.substring(1, c.length);
			}
			
			if(c.indexOf(nameEQ) == 0) {
				return c.substring(nameEQ.length, c.length);
			}
		}
		
		return null;
	}
	
	function eraseCookie(name) {
		createCookie(name, "", -1);
	}
	
	function esc_html(str) {
		str = str.split("&").join("&amp;");
		str = str.split("\"").join("&quot;");
		str = str.split("'").join("&apos;");
		str = str.split("<").join("&lt;");
		str = str.split(">").join("&gt;");
		
		return str;
	}
	
	function unesc_html(str) {
		str = str.split("&gt;").join(">");
		str = str.split("&lt;").join("<");
		str = str.split("&apos;").join("'");
		str = str.split("&quot;").join("\"");
		str = str.split("&amp;").join("&");
		
		return str;
	}
	
	function randomBetween(min, max) {
		return Math.floor((Math.random() * (max - min + 1) + min));
	}
	
	function calibrateCameraSize(cam_width, cam_height) {
		window_width = cam_width;
		window_height = cam_height;
		
		window_halfWidth = (window_width * 0.5);
		window_halfHeight = (window_height * 0.5);
		
		canvas.width = window_width;
		canvas.height = window_height;
	}
	
	function windowXtoGameX(x) {
		return (x - window_halfWidth);
	}
	
	function windowYtoGameY(y) {
		return (y - window_halfHeight);
	}
	
	
	function chooseRandomColor() {
		return colors[ Math.floor(Math.random() * colors.length) ];
		
		//// truly random color
		//return {
		//	'r':	Math.floor(Math.random() * (255 - 0 + 1) + 0),
		//	'g':	Math.floor(Math.random() * (255 - 0 + 1) + 0),
		//	'b':	Math.floor(Math.random() * (255 - 0 + 1) + 0)
		//};
	}
	
	function darkenColor(color, strokeDiff) {
		strokeDiff = strokeDiff || 0.85;
		
		if(!color || (color.r === undefined) || (color.g === undefined) || (color.b === undefined) || isNaN(strokeDiff) || (strokeDiff < 0) || (strokeDiff > 1)) {
			// color ill-defined or strokeDiff out of bounds, no need to process math
			return color;
		}
		
		return {
			'r':	Math.max(0, Math.round( (color.r * strokeDiff) )),
			'g':	Math.max(0, Math.round( (color.g * strokeDiff) )),
			'b':	Math.max(0, Math.round( (color.b * strokeDiff) ))
		};
	}
	
	// turn raw text username into usable username
	function cleanUsername(name) {
		if((null === name) || ("" === name)) {
			return "";
		}
		
		name = name.replace(/^\s+/g, "");
		name = name.replace(/\s+$/g, "");
		name = name.substring(0, MAX_USER_NAME_LENGTH);
		
		return name;
	}
	
	// turn raw color string into usable value
	function cleanColor(color, return_color) {
		if((color === undefined) || (color === false) || (typeof color !== "object") || (color.r === undefined) || isNaN(color.r) || (color.g === undefined) || isNaN(color.g) || (color.b === undefined) || isNaN(color.b)) {
			// not a color object
			
			if(return_color) {
				// choose a random color if return_color is true
				return chooseRandomColor();
			}
			
			// return false by default
			return false;
		}
		
		// is a color object
		
		// return provided color object
		if(return_color) {
			return color;
		}
		
		// return true by default
		return true;
	}
	
	// turn raw thickness value into usable value
	function cleanThickness(thickness) {
		if(isNaN(thickness) || (thickness < MIN_USER_THICKNESS) || (thickness > MAX_USER_THICKNESS)) {
			return DEFAULT_USER_THICKNESS;
		}
		
		return thickness;
	}
	
	// add a player into drawings object
	// @todo: merge into Player::_setPen
	function setPlayer(drawing_key, name, color, thickness) {
		var j, k;
		
		drawing_key = drawing_key || false;
		
		if(false !== drawing_key) {
			if(drawings[ drawing_key ] === undefined) {
				drawings[ drawing_key ] = new Pen(name, color, thickness);
			} else {
				if(name !== undefined) {
					drawings[ drawing_key ].setName(name);
				}
				
				if(color !== undefined) {
					drawings[ drawing_key ].setColor(color);
				}
				
				if(thickness !== undefined) {
					drawings[ drawing_key ].setThickness(thickness);
				}
			}
		}
		
		return drawing_key;
	}
	
	// remove a player from drawings object
	function removePlayer(drawing_key) {
		if(drawings[ drawing_key ] !== undefined) {
			delete drawings[ drawing_key ];
		}
	}
	
	
	
	/*** class: Pen ***/
	
		function Pen(name, color, thickness) {
			this.lines					= [];   // simple array containing line objects {'color': "rgb(...)", 'thickness': 1, 'points': [x1, y1, x2, y2, ..., xn, yn]}
			this.line_key				= 0;   // the latest this.lines key to add points to
			this.thickness				= DEFAULT_USER_THICKNESS;
			this.color					= {'r': 0, 'g': 0, 'b': 0};
			this.color_rgb				= "rgb(0,0,0)";
			this.name					= "";
			this.is_drawing				= false;
			this.drawing_stay_seconds	= 1;   // number of seconds after drawing stops that it should remain full opacity
			this.drawing_fade_seconds	= 0.7;   // number of seconds a drawing should 
			this.draw_life				= 0;   // number of seconds left to draw
			this.draw_opacity			= 1;   // 0-1 draw opacity	
			
			this.setName(name);
			this.setColor(color);
			this.setThickness(thickness);
		}
		
		Pen.prototype = {
			// sync all data with server
			'acceptSync': function(data) {
				// ignore if malformed data, id missing, or is player
				if(!data || !data.id || (data.id == player.getPenID())) {
					//console.log("Ignoring acceptSync due to data.id: "+ data.id);
					
					return;
				}
				
				if(data.is_drawing !== undefined) {
					this.is_drawing = data.is_drawing;
				}
				
				if(data.draw_life !== undefined) {
					this.draw_life = data.draw_life;
				}
				
				if(data.name !== undefined) {
					this.name = data.name;
				}
				
				if(data.color !== undefined) {
					this.setColor(data.color);
				}
				
				if(data.lines !== undefined) {
					this.lines = data.lines;
				}
			},
			
			// @param	new_color	Color object	ex: {'r': [0-255], 'b': [0-255], 'g': [0-255]}
			'setColor': function(new_color) {
				this.color = cleanColor(new_color, true);
				
				this.color_rgb = "rgb("+ this.color.r +","+ this.color.g +","+ this.color.b +")";
			},
			
			'getColor': function() {
				return this.color;
			},
			
			'getColorRGB': function() {
				return this.color_rgb;
			},
			
			'setThickness': function(new_thickness) {
				new_thickness = cleanThickness(new_thickness);
				
				this.thickness = new_thickness;
			},
			
			'getThickness': function() {
				return this.thickness;
			},
			
			'_resetPen': function() {
				// totally reset pen data
				this.lines = [];   // reset lines array
				this.line_key = 0;   // reset points array key
				this.draw_life = 0;   // reset draw life to 0
				this.draw_opacity = 1;   // reset opacity
			},
			
			'setName': function(new_name) {
				new_name = new_name || "";
				new_name = cleanUsername(new_name);
				
				this.name = new_name.substring(0, MAX_USER_NAME_LENGTH);
			},
			
			'getName': function() {
				if("" === this.name) {
					return "Unnamed artist";
				}
				
				return this.name;
			},
			
			'startDrawing': function(x, y) {
				this.is_drawing = true;
				
				this.lines[ this.line_key ] = {
					'line_color':		this.color_rgb,
					'line_thickness':	this.thickness,
					'points':			[x, y]
				};
				
				this.draw_life = 0;
				this.draw_opacity = 1;
			},
			
			'movePen': function(x, y) {
				this.is_drawing = true;
				
				this.draw_life = 0;
				this.draw_opacity = 1;
				
				this.lines[ this.line_key ].points.push(x);
				this.lines[ this.line_key ].points.push(y);
			},
			
			'stopDrawing': function() {
				this.line_key += 1;   // move to next lines key
				this.is_drawing = false;   // not drawing anymore
				
				// set duration of how long drawing should remain on screen
				this.draw_life = (this.drawing_stay_seconds + this.drawing_fade_seconds);
			},
			
			'getLines': function() {
				return this.lines;
			},
			
			'isDrawing': function() {
				return this.is_drawing;
			},
			
			'getDrawLife': function() {
				return this.draw_life;
			},
			
			'update': function(dt) {
				if(!this.is_drawing && (this.draw_life > 0)) {
					this.draw_life -= dt;
					
					if(this.draw_life >= this.drawing_stay_seconds) {
						this.draw_opacity = 1;
					} else if(this.draw_life > 0) {
						this.draw_opacity = (this.draw_life / this.drawing_fade_seconds);
					} else {
						this._resetPen();
					}
				}
			},
			
			'draw': function() {
				var x, y, j, k;
				
				if(!this.is_drawing && !this.draw_life) {
					return;
				}
				
				context.globalAlpha = this.draw_opacity;
				
				for(x = 0, y = this.lines.length; x < y; x++) {
					context.beginPath();
					
					context.lineCap = "round";
					
					context.strokeStyle = this.lines[ x ].line_color;
					context.lineWidth = this.lines[ x ].line_thickness;
					
					context.moveTo(this.lines[ x ].points[0], this.lines[ x ].points[1]);
					
					for(j = 2, k = this.lines[ x ].points.length; j < k; j += 2) {
						// @todo - save d(x/y) instead of raw points
						context.lineTo(this.lines[ x ].points[ j ], this.lines[ x ].points[ (j + 1) ]);
					}
					
					context.stroke();
				}
				
				context.globalAlpha = 1;
			}
		};
	
	
	/*** class: Player ***/
	
		function Player(name) {
			this.pen_id = "me";   // default value for pen ID
			
			// pull last used user_name, or ask for a new one
			this._getInitialName();
			
			// Create Pen instance for player
			this._setPen();
			
			// Create player interface
			this._createInterface();
			
			// sync data with server
			this.sync();
		}
		
		Player.prototype = {
			// sync data with server
			'sync': function() {
				socket.emit('sync_player', {
					'is_drawing':	this.getPen().isDrawing(),
					'draw_life':	this.getPen().getDrawLife(),
					'name':			this.getPen().getName(),
					'color':		this.getPen().getColor(),
					'lines':		this.getPen().getLines()
				});
			},
			
			// nickname
			'promptName': function() {
				return prompt("Name:");
			},
			
			'_saveName': function(saved_name) {
				createCookie('drawer_name', saved_name, 10);
			},
			
			'askNewName': function(can_cancel) {
				var new_name = prompt("Name:");
				
				new_name = cleanUsername(new_name);
				
				this._saveName(new_name);
				
				this.getPen().setName(new_name);
				
				// send name to server
				socket.emit('name_change', {
					'name':	this.getPen().getName()
				});
				
				return new_name;
			},
			
			'_getInitialName': function() {
				var new_name;
				
				// find previously used username
				if(null === (new_name = readCookie('drawer_name'))) {
					new_name = this.promptName();
				}
				
				new_name = cleanUsername(new_name);
				
				this._saveName(new_name);
				
				this.user_name = new_name;
				
				return new_name;
			},
			
			
			// pen instance
			'setPenID': function(new_pen_id) {
				if(drawings[ this.pen_id ] !== undefined) {
					drawings[ new_pen_id ] = drawings[ this.pen_id ];
					
					removePlayer(this.pen_id);
					
					this.pen_id = new_pen_id;
				} else {
					this.pen_id = setPlayer(new_pen_id, this.user_name);
				}
				
				return this.pen_id;
			},
			
			'_setPen': function() {
				this.pen_id = setPlayer(this.pen_id, this.user_name);
				
				return this.pen_id;
			},
			
			'getPenID': function() {
				return this.pen_id;
			},
			
			'getPen': function() {
				return drawings[ this.pen_id ];
			},
			
			
			// interface
			'_createInterface': function() {
				var html = [],
					player_pen = this.getPen();
				
				// change color
				html.push("<li class=\"user_option__choose_color\">");
				html.push("<div id=\"user_color_choices\">");
				html.push("<div class=\"title\">Choose a color:</div>");
				html.push("<ul class=\"colors\">");
				
				// Fill in defined colors into user color changer
				$.each(colors, function(index, value) {
					var color_string = "rgb("+ value.r +","+ value.g +","+ value.b +")",
						color_attribute = JSON.stringify(value);
					
					html.push("<li"+ ((color_string == player_pen.getColorRGB())?" class=\"selected\"":"") +">");
					html.push("<a href=\"#\" title=\""+ esc_html(color_string) +"\" class=\"select_user_color\" style=\"background-color: "+ color_string +";\" data-color=\""+ esc_html(color_attribute) +"\">"+ color_string +"</a>");
					html.push("</li>");
				});
				
				html.push("</ul>");
				html.push("</div>");
				html.push("<a href=\"#\" class=\"option_button button_change_color\">");
				html.push("<span id=\"user_color_legend\" style=\"background-color: "+ player_pen.getColorRGB() +";\">&nbsp;</span>");
				html.push("<span class=\"underline\">color</span>");
				html.push("</a>");
				html.push("</li>");
				
				// change thickness
				html.push("<li class=\"user_option__choose_thickness\">");
				html.push("<ul id=\"user_thickness_choices\">");
				
				// Fill in defined thickness options into user thickness changer
				$.each(thicknesses, function(index, value) {
					html.push("<li"+ ((value == player_pen.getThickness())?" class=\"selected\"":"") +">");
					html.push("<a href=\"#\" title=\""+ value +"\" class=\"select_user_thickness\" data-thickness=\""+ value +"\">");
					html.push("<span class=\"line_preview\">");
					html.push("<span class=\"preview\"><span class=\"line\" style=\"background-color: "+ player_pen.getColorRGB() +"; width: "+ value +"px;\">|</span></span>");
					html.push("<span class=\"value\">"+ value +"</span>");
					html.push("</span>");
					html.push("</a>");
					html.push("</li>");
				});
				
				html.push("</ul>");
				html.push("<a href=\"#\" class=\"option_button button_change_thickness\">");
				html.push("<span id=\"user_thickness_legend\" class=\"line_preview\">");
				html.push("<span class=\"preview\"><span class=\"line\" style=\"background-color: "+ player_pen.getColorRGB() +"; width: "+ player_pen.getThickness() +"px;\">|</span></span>");
				html.push("<span class=\"value\">"+ player_pen.getThickness() +"</span>");
				html.push("</span>");
				html.push("<span class=\"underline\">thickness</span>");
				html.push("</a>");
				html.push("</li>");
				
				
				// change name
				html.push("<li class=\"user_option__choose_name\">");
				html.push("<a href=\"#\" class=\"option_button button_change_name\">");
				html.push("<span id=\"user_name_legend\">"+ esc_html(player_pen.getName()) +"</span>");
				html.push("<span class=\"underline\">name</span>");
				html.push("</a>");
				html.push("</li>");
				
				$("#user_options").append( html.join("") );
			}
		};
	
	
	function draw_grid() {
		var grid_size = 20,
			grid_start_x = (0 - ((window_halfWidth * -1) % grid_size)),
			grid_start_y = (0 - ((window_halfHeight * -1) % grid_size)),
			grid_point;
		
		// save context before translating context
		context.save();
		
		context.translate((window_halfWidth * -1), (window_halfHeight * -1));
		
		
		context.beginPath();
		context.lineWidth = 1;
		context.strokeStyle = "#dee6ea";
		
		for(grid_point = grid_start_x; grid_point <= window_width; grid_point += grid_size) {
			context.moveTo(grid_point, 0);
			context.lineTo(grid_point, window_height);
		}
		
		for(grid_point = grid_start_y; grid_point <= window_height; grid_point += grid_size) {
			context.moveTo(0, grid_point);
			context.lineTo(window_width, grid_point);
		}
		
		context.stroke();
		
		context.restore();
	}
	
	function draw_leaderboard() {
		var windowPadding = 12,
			boxPadding = 9,
			fontSize = 11,
			headerFontSize = 16,
			headerLineSpacing = 10,
			lineSpacing = 10,
			boxTransparency = 0.3,
			boxInnerWidth = 150,
			numNames = Object.keys(drawings).length || 0,
			userColorDiagramWidth = 12, userColorDiagramHeight = 12,
			boxWidth, boxHeight, lineHeightOffset;
		
		boxWidth = (boxPadding + boxInnerWidth + boxPadding);
		boxHeight = (boxPadding + headerFontSize + headerLineSpacing + (lineSpacing * Math.max(0, (numNames - 1))) + (fontSize * numNames) + boxPadding);
		
		context.save();
		
		context.scale(1, 1);
		context.translate( (window_halfWidth - windowPadding - boxWidth), ((window_halfHeight * -1) + windowPadding) );
		
		// draw text container box
		context.beginPath();
		
		// background
		context.rect(0, 0, boxWidth, boxHeight);
		context.fillStyle = "rgba(0, 0, 0, "+ boxTransparency +")";
		context.fill();
		
		// header
		context.font = "bold "+ headerFontSize +"pt Verdana";
		context.fillStyle = "#ffffff";
		context.textAlign = "left";
		context.textBaseline = "hanging";
		context.fillText("Artists", boxPadding, boxPadding);
		
		// draw text
		j = 0;
		
		for(k in drawings) {
			if(k == player.getPenID()) {
				context.font = "bold "+ fontSize +"pt Verdana";
			} else {
				context.font = "normal "+ fontSize +"pt Verdana";
			}
			
			lineHeightOffset = (boxPadding + headerFontSize + headerLineSpacing + ((lineSpacing + fontSize) * j));
			drawer_name = drawings[ k ].getName();
			
			if("" == drawer_name) {
				drawer_name = "Unnamed artist";
			}
			
			context.beginPath();
			
			// player color
			context.rect(boxPadding, lineHeightOffset, userColorDiagramWidth, userColorDiagramHeight);
			context.fillStyle = drawings[ k ].getColorRGB();
			context.fill();
			
			// player name
			context.fillStyle = "#ffffff";
			context.textAlign = "left";
			context.textBaseline = "hanging";
			context.fillText(drawer_name, (boxPadding + userColorDiagramWidth + (boxPadding / 2)), lineHeightOffset);
			
			j++;
		}
		
		context.restore();
	}
	
	function draw_game_fps() {
		var playerScoreText = Math.floor(game_fps) +" FPS",
			fontSize = 12,
			windowPadding = 12,
			boxPadding = 6,
			boxTransparency = 0.3,
			textMetrics;
		
		context.save();
		
		context.scale(1, 1);
		context.translate( ((window_halfWidth * -1) + windowPadding), ((window_halfHeight * -1) + windowPadding) );
		
		// setup font context
		context.font = "normal "+ fontSize +"pt Verdana";
		
		textMetrics = context.measureText(playerScoreText);
		
		// draw text container box
		context.beginPath();
		
		context.rect(0, 0, (boxPadding + textMetrics.width + boxPadding), (boxPadding + fontSize + boxPadding));
		context.fillStyle = "rgba(0, 0, 0, "+ boxTransparency +")";
		context.fill();
		
		// draw text
		context.fillStyle = "#ffffff";
		context.textAlign = "left";
		context.textBaseline = "hanging";
		context.fillText(playerScoreText, boxPadding, boxPadding);
		
		context.restore();
	}
	
	
	/*** Game Logic ***/
	
	function update(dt) {
		var obj;
		
		// update pens
		for(obj in drawings) {
			drawings[ obj ].update(dt);
		}
	}
	
	function draw() {
		var obj;
		
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		context.save();
		
		context.translate(window_halfWidth, window_halfHeight);
		
		// draw grid
		draw_grid();
		
		// draw pens
		for(obj in drawings) {
			drawings[ obj ].draw();
		}
		
		// draw leaderboard
		draw_leaderboard();
		
		// draw fps
		draw_game_fps();
		
		context.restore();
	}
	
	
	function game_loop() {
		var now = new Date().getTime(),
			dt = ((now - loop__time) / 1000);
		
		window.requestAnimationFrame(game_loop);
		
		fps += 1;
		last_fps += dt;
		
		if(last_fps > 1) {
			game_fps = fps;
			
			fps = 0;
			last_fps %= 1;
			
			//console.log(drawings);
		}
		
		loop__time = now;
		
		if(can_render) {
			// update logic
			update(dt);
			
			// draw
			draw();
		}
	}
	
	
	jQuery(document).ready(function($) {
		// initialize canvas & context
		canvas = document.getElementById('screen');
		context = canvas.getContext('2d');
		
		// create socket connection
		socket = io.connect();
		
		// Create Player instance
		player = new Player();
		
		
		
		
		
		// window-based events
		$(window).on({
			'load': function() {
				// window finishes loading
				calibrateCameraSize($(window).width(), $(window).height());
			},
			'resize': function() {
				// resize window
				calibrateCameraSize($(window).width(), $(window).height());
			},
			'focus': function() {
				// browser gains focus
				
			},
			'blur': function() {
				// browser loses focus
				
			}
		});
		
		// // document-based events
		$(document).on({
			'mousedown': function(e) {
				if(e.which == 1) {
					//can_render = !can_render;
					
					// start player drawing
					player.getPen().startDrawing(windowXtoGameX(e.pageX), windowYtoGameY(e.pageY));
					
					player.sync();
				}
			},
			'mousemove': function(e) {
				if(player.getPen().isDrawing()) {
					// Player is drawing, move player pen
					player.getPen().movePen(windowXtoGameX(e.pageX), windowYtoGameY(e.pageY));
					
					player.sync();
				}
				
				//mouse_screenPosition.x = e.pageX;
				//mouse_screenPosition.y = e.pageY;
			},
			'mouseup': function(e) {
				if(e.which == 1) {
					// Stop player from drawing
					player.getPen().stopDrawing();
					
					player.sync();
				}
			},
			'keydown': function(e) {
				// prevent repeated key calls
				input_active[ e.which ] = true;
			},
			'keyup': function(e) {
				// release input status
				input_active[ e.which ] = false;
			}
		});
		
		
		// event: change name button
		$("#user_options").on('click', ".button_change_name", function(e) {
			var new_name;
			
			e.preventDefault();
			e.stopPropagation();
			
			new_name = player.askNewName();
			
			player.sync();
			
			// update user's name legend
			$("#user_name_legend").text(new_name);
		});
		
		// event: change thickness button
		$("#user_options").on('click', ".button_change_thickness", function(e) {
			var thickness_choices = $("#user_thickness_choices"),
				click_within = thickness_choices.parent();
			
			e.preventDefault();
			e.stopPropagation();
			
			if(thickness_choices.is(":hidden")) {
				// attach click outside element autohide event
				$(document).on('mousedown.chgThickness_clickOut', function(e) {
					if(!click_within.is(e.target) && !click_within.has(e.target).length) {
						//thickness_choices.slideToggle(400);
						thickness_choices.hide();   // make sure it's hidden, slideToggle isn't specific enough
						
						$(document).off('mousedown.chgThickness_clickOut');
					}
				});
			}
			
			thickness_choices.slideToggle(400);
		});
		
		// event: select thickness and hide thickness chooser
		$("#user_options").on('click', "#user_thickness_choices .select_user_thickness", function(e) {
			var thickness = $(this).attr('data-thickness') || false;
			
			e.preventDefault();
			e.stopPropagation();
			
			$("#user_thickness_choices").slideToggle(400);
			$(document).off('mousedown.chgThickness_clickOut');
			
			if(!cleanThickness(thickness)) {
				return;
			}
			
			player.getPen().setThickness(thickness);
			
			// update thickness legend box
			$("#user_thickness_legend .preview .line").css({
				'width': player.getPen().getThickness() +"px"
			});
			
			$("#user_thickness_legend .value").text(player.getPen().getThickness());
			
			// update selected option in thickness list
			$("#user_thickness_choices li.selected").removeClass("selected");
			$(this).parent("li").addClass("selected");
		});
		
		
		// event: change color button
		$("#user_options").on('click', ".button_change_color", function(e) {
			var color_choices = $("#user_color_choices"),
				click_within = color_choices.parent();
			
			e.preventDefault();
			e.stopPropagation();
			
			if(color_choices.is(":hidden")) {
				// attach click outside element autohide event
				$(document).on('mousedown.chgColor_clickOut', function(e) {
					if(!click_within.is(e.target) && !click_within.has(e.target).length) {
						//color_choices.slideToggle(400);
						color_choices.hide();   // make sure it's hidden, slideToggle isn't specific enough
						
						$(document).off('mousedown.chgColor_clickOut');
					}
				});
			}
			
			color_choices.slideToggle(400);
		});
		
		// event: select color and hide color chooser
		$("#user_options").on('click', "#user_color_choices .select_user_color", function(e) {
			var color_raw = $(this).attr('data-color') || false,
				color;
			
			e.preventDefault();
			e.stopPropagation();
			
			$("#user_color_choices").slideToggle(400);
			$(document).off('mousedown.chgColor_clickOut');
			
			if(!color_raw) {
				return;
			}
			
			color_raw = unesc_html(color_raw);
			color = JSON.parse(color_raw);
			
			if(!cleanColor(color)) {
				return;
			}
			
			player.getPen().setColor(color);
			
			player.sync();
			
			// update color legend box
			$("#user_color_legend").css({
				'background-color':	player.getPen().getColorRGB()
			});
			
			// update color of thickness line in legend
			$("#user_thickness_legend .preview .line").css({
				'background-color':	player.getPen().getColorRGB()
			});
			
			// update color of thickness lines in thickness selection list
			$("#user_thickness_choices .preview .line").css({
				'background-color':	player.getPen().getColorRGB()
			});
		});
		
		
		
		// Socket Events //
		
		// socket event: accept pen_id
		socket.on('set_pen_id', function(data) {
			if(data.id) {
				player.setPenID(data.id);
			}
		});
		
		// socket event: accept a request to sync player data
		socket.on('request_sync_player', function() {
			//console.log("Server requested sync, syncing...");
			
			player.sync();
		});
		
		// socket event: accept a specific player sync
		socket.on('sync_player', function(data) {
			if((data.id === undefined) || (player.getPenID() == data.id)) {
				//console.log("skipping "+ data.id);
				
				return;
			}
			
			//console.log("Syncing "+ data.id);
			//console.log(data);
			
			if(drawings[ data.id ] === undefined) {
				setPlayer(data.id, data.name, data.color);
			}
			
			drawings[ data.id ].acceptSync(data);
		});
		
		// socket event: accept a full user list of pen syncs
		socket.on('freshen', function(data) {
			$.each(data, function(index, value) {
				// ignore when id missing or is active player
				if((value.id === undefined) || (value.id == player.getPenID())) {
					return;
				}
				
				if(drawings[ value.id ] === undefined) {
					setPlayer(value.id, value.name, value.color);
				}
				
				drawings[ value.id ].acceptSync(data);
			});
		});
		
		socket.on('remove_player', function(data) {
			//console.log("Player disconnect:");
			//console.log(data);
			
			if(data && data.id) {
				removePlayer(data.id);
			}
		});
		
		socket.on('system_message', function(data) {
			console.log("System Message: "+ data.message);
		});
		
		
		
		/*
			connection = new WebSocket("ws://"+window.location.hostname+":9008");
			
			connection.onopen = function() {
				console.log("Connection opened");
				connection.send(nickname);
				
				document.getElementById("form").onsubmit = function (event) {
					var msg = document.getElementById("msg");
					
					if(msg.value) {
						connection.send(msg.value)
					}
					
					msg.value = "";
					
					event.preventDefault();
				}	;
			};
			
			connection.onclose = function() {
				console.log("Connection closed");
			};
			
			connection.onerror = function() {
				console.error("Connection error");
			};
			
			connection.onmessage = function (event) {
				var div = document.createElement("div");
				div.textContent = event.data;
				
				document.body.appendChild(div);
			};
		*/
		
		
		// start game
		game_loop();
	});
	