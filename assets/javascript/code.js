$(document).on("ready",function(){
	
	var config = {
			apiKey: "AIzaSyAME90fzEZTufLoGrGLJRKiXzDZiUn7W4k",
			authDomain: "rpsgame-3782d.firebaseapp.com",
			databaseURL: "https://rpsgame-3782d.firebaseio.com",
			storageBucket: "rpsgame-3782d.appspot.com",
		};
	firebase.initializeApp(config);
	var db = firebase.database();
	
	// Get a reference to the users data in Firebase.
	var userListRef = db.ref("selectedUsers");
	var waitListRef = db.ref("waitListUsers");
	var chatRef = db.ref("chat");
	var turnRef = db.ref("turn");
	var userScoreRef = db.ref("score");
	
	/*User Data*/
	var name = "";
	var turn = 0;
	var currentStatus = "";
	var opponentPlayed = false;
	var iPlayed = false;
	var myUserRef;//ref to user data in Firebase
	var myScoreRef;
	var myKey = "";
	var	opponentKey = ""; 

	var gameStarted = false;
	/*End User Data*/
	var chatMsg= "";
	var playerWins = 0;
	var playerLosses = 0;
	var opponentWins = 0;
	var opponentLosses = 0;
	//Waitlist Users counter
	var waitListUsersCounter = 0;
	//update users in waitlist counter
	waitListRef.on("value", function(w) {
		if( w.val() !== null)
			waitListUsersCounter = Object.keys(w.val()).length;
	});
	/*End Waitlist Users Counter*/
	
	/*Users Selected*/
	var selectedUsersCounter = 0;
	//update users selected counter
	userListRef.on("value", function(u) {
		if( u.val() !== null)
		{
			selectedUsersCounter = Object.keys( u.val() ).length;
			if( selectedUsersCounter === 2 && currentStatus === "selected" && !gameStarted )
			{
				Object.keys( u.val() ).forEach(function(k){
					if( myKey !== "" && k !== myKey )
						opponentKey = k;
				}) 
				$("#battleResult").html("Click on a picture to play.");
				gameStarted = true;
			}
		}
	});
	/*End Users Selected*/
	
	userScoreRef.on("value", function(us) {
		if( us.val() !== null)
		{
			var usrObj = us.val();
			usrKeys = Object.keys( usrObj );

			if( usrKeys.length === 2 && currentStatus === "selected" )
			{
				for( var i = 0; i < usrKeys.length; i++ )
				{
					var scr = usrObj[usrKeys[i]];
					if( scr.key === myKey )
					{
						playerLosses = parseInt(scr.losses);
						playerWins = parseInt(scr.wins);
						$("#"+scr.key+" .userScore").html(playerWins);
					}
					else
					{
						opponentLosses = parseInt(scr.losses);
						opponentWins = parseInt(scr.wins);
						$("#"+scr.key+" .userScore").html(opponentWins);
					}
				}
				if(myKey !== "")
					$("."+myKey).css({"color":"blue","font-weight": "bold"});
			}
		}
	});
	chatRef.on("value", function(snapshot){
		if(snapshot.hasChild("msg"))
		{
			chatMsg = snapshot.val().msg;
			var msgHistory = snapshot.val();
			$("#chat").html(chatMsg);
			if(name !== "")
				chatRef.onDisconnect().set({msg:chatMsg+"<p>"+name+" left the game.</p>"});

			//Keep chat scrolled to the bottom
			$("#chat").animate({"scrollTop": $('#chat')[0].scrollHeight}, "slow");
			if(myKey !== "")
				$("."+myKey).css({"color":"blue","font-weight": "bold"});
		}
	});

	turnRef.on("value", function(snapshot){
		if(snapshot.val() !== null)
			turn = parseInt(snapshot.val());
		$("#turn").html(turn);
	});
	$("#sendChat").prop("disabled",true);
	$("#inputChat").prop("disabled",true);
	$(".btnRps").prop("disabled",true);
	
	$("#sub").on("click",function(ev){
		ev.preventDefault();
		
		name = $("#inputUserName").val().trim();
		if( name !== "" )
		{
			if(selectedUsersCounter < 2)
			{
				currentStatus = "selected";
				if(selectedUsersCounter <= 0)
					$("#battleResult").html("Waiting for an opponent to start the game.");
				// Generate a reference to a new location for my user with push.
				myUserRef = userListRef.push();
				myScoreRef = userScoreRef.push({key:myUserRef.key,wins:playerWins,losses:playerLosses});
			}
			else
			{
				currentStatus = "waitlist";
				// Generate a reference to a new location for my user with push.
				myUserRef = waitListRef.push();
			}
			myKey = myUserRef.key;

			// Get a reference to my own presence status.
			var connectedRef = db.ref(".info/connected");
			connectedRef.on("value", function(isOnline) {
				if (isOnline.val())
				{
					// If I lose internet connection, remove me from the list.
					myUserRef.onDisconnect().remove();
					//Reset turn to 0 on disconnect
					turnRef.onDisconnect().set(0);
					//
					myScoreRef.onDisconnect().remove();
				}
				// Set initial status.
				setUserStatus(currentStatus);
				$(ev.currentTarget).prop("disabled",true);
				$("#inputUserName").prop("disabled",true);
				$("#sendChat").prop("disabled",false);
				$("#inputChat").prop("disabled",false);
				$(".btnRps").prop("disabled",false);
			});
		}
		else
		{
			$('#myModal').modal('show');
		}
	});

	$("#sendChat").on("click",function(ev){
		ev.preventDefault();

		var txt = $.trim($("#inputChat").val());
	    
	    if(chatMsg !== "") chatMsg = chatMsg + "<p>";
	    chatMsg = chatMsg + "<span class='"+myKey+"'>" + name + ": " + txt+"</span></p>";
		chatRef.set({msg:chatMsg});
		$("#inputChat").val("");
	});
	$("#inputChat").keyup(function (e) {
		if (e.which == 13)
		{
			var txt = $.trim($("#inputChat").val());
	    
			if(chatMsg !== "") chatMsg = chatMsg + "<p>";
			chatMsg = chatMsg + "<span class='"+myKey+"'>"+name + ": " + txt+"</span></p>";
			chatRef.set({msg:chatMsg});
			$("#inputChat").val("");
		}
	});
	$(".btnRps").on("click",function(ev){
		ev.preventDefault();
		
		if( currentStatus === "selected" )
		{
			if( selectedUsersCounter === 2 )
			{
				if( !iPlayed )
				{
					var rps = $(ev.currentTarget).data("val");
					var rndVal = Date.now()+Math.floor(Math.random() * 1500);//used to force a child_added event even if the user had the same selection.
					myUserRef.update({ turn: turn, rpsSelected: rps, rnd: rndVal });
					$("#battleResult").html($("<div>" + name + " selected " + rps + "</div>"));
					iPlayed = true;
					if(opponentPlayed)
					{
						userListRef.once("value", function(u) {
							if( u.val() !== null)
							{
								var obj = u.val();
								//get the result of player 1
								var pkey1 = Object.keys(obj)[0];
								var player1 = obj[pkey1];
								var pname1 = player1.name;
								var playerSelection1 = player1.rpsSelected;
								//get the result of player 2
								var pkey2 = Object.keys(obj)[1];
								var player2 = obj[pkey2];
								var pname2 = player2.name;
								var playerSelection2 = player2.rpsSelected;
								var res = {};
								//check who won
								if(pkey1 === myKey)
								{
									res = checkResult(pkey1,pkey2,pname1,pname2,playerSelection1,playerSelection2);
								}
								else
								{
									res = checkResult(pkey2,pkey1,pname2,pname1,playerSelection2,playerSelection1);
								}

								iPlayed = false;
								opponentPlayed = false;
								turn=turn+1;
								turnRef.set(turn);

							}
						});
					}		
				}
				else
				{
					$("#battleResult").html("Waiting for opponent choice.");
				}
			}
			else
			{
				$("#battleResult").html("Waiting for an opponent to start the game.");
			}
		}
		else if(currentStatus === "waitlist")
		{
			$("#battleResult").html("You are in the wait list!!");
		}
	});

	function setUserStatus(status)
	{
		currentStatus = status;
		myUserRef.set({ name: name, status: status });
	}

	function checkResult(pk,ok,playerName,opponentName,playerChoice,opponentChoice)
	{
		var msg = "<span class='"+pk+"'>"+"You" + " selected "+playerChoice+"</span> and "+opponentName+" selected "+opponentChoice+" so ";

		if( playerChoice === opponentChoice )
		{
			msg = msg + "It is a tie!";
		}
		else if( playerChoice === "rock" && opponentChoice === "scissors" || playerChoice === "paper" && opponentChoice === "rock" || playerChoice === "scissors" && opponentChoice === "paper" )
		{
			msg = msg + "<span class='" + pk + "'>" + "You" + " won!!!</span>";
			playerWins = playerWins + 1;
			myScoreRef.update({wins:playerWins});			 
		}
		else
		{
			msg = msg + "<span class='" + pk + "'>" + "You" + " lost!!!</span>";
			playerLosses = playerLosses + 1;
			myScoreRef.update({losses:playerLosses});
		}
		$("#battleResult").html(msg);
	}

	userListRef.on("child_added", function(snapshot) {
		var user = snapshot.val();
		//increase local counter in one
		selectedUsersCounter++;
		//add to playing html
		$("#selectedList").append($("<div id='"+snapshot.key+"'><div class='userName'>"+user.name+"</div><div class='userScore'>0</div></div>"));
	});

	waitListRef.on("child_added", function(snapshot) {
		var user = snapshot.val();
		
		waitListUsersCounter++;
		//add them to a waitlist (html)
		$("#waitList").append($("<div id='"+snapshot.key+"'>"+user.name+"</div>"));
	});

	// Update our GUI to remove the status of a user who has left.
	userListRef.on("child_removed", function(snapshot) {
		$("#" + snapshot.key).remove();
		selectedUsersCounter--;
		if(selectedUsersCounter<2)
		{
			//change turn to 0
			console.log("possible change to 'selected'");//change this later / move an user from waitlist to selected list
		}
		turn = 0;
		$("#battleResult").html("");
	});

	waitListRef.on("child_removed", function(snapshot) {
		$("#" + snapshot.key).remove();
		waitListUsersCounter--;
	});

	userListRef.on("child_changed", function(snapshot) {
		var user = snapshot.val();
		
		if( snapshot.key !== myKey )
		{
			if(user.hasOwnProperty("rpsSelected") && user.rpsSelected !== "")
			{
				$("#battleResult").html($("<div>"+user.name+" made a selection. </div>"));
				opponentPlayed = true;
				if(iPlayed)
				{
					userListRef.once("value", function(u) {
						if( u.val() !== null )
						{
							var obj = u.val();
							//get the result of player 1
							var pkey1 = Object.keys(obj)[0];
							var player1 = obj[pkey1];
							var pname1 = player1.name;
							var playerSelection1 = player1.rpsSelected;
							//get the result of player 2
							var pkey2 = Object.keys(obj)[1];
							var player2 = obj[pkey2];
							var pname2 = player2.name;
							var playerSelection2 = player2.rpsSelected;
							//check who won
							if(pkey1 === myKey)
							{
								res = checkResult(pkey1,pkey2,pname1,pname2,playerSelection1,playerSelection2);
							}
							else
							{
								res = checkResult(pkey2,pkey1,pname2,pname1,playerSelection2,playerSelection1);
							}
							//set results and won to battle result
							if(myKey !== "")
								$("."+myKey).css({"color":"blue","font-weight": "bold"});
							iPlayed = false;
							opponentPlayed = false;
						}
					});
				}
			}
		}
	});
});