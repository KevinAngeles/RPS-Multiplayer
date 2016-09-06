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
	
	/*User Data*/
	var name = "";
	var turn = 0;
	var currentStatus = "";
	var opponentPlayed = false;
	var iPlayed = false;
	var myUserRef;//ref to user data in Firebase
	var myKey = "";
	/*End User Data*/
	var chatMsg= "";
	var score1 = 0;
	var score2 = 0;
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
			selectedUsersCounter = Object.keys(u.val()).length;
		}
	});
	/*End Users Selected*/
	
	chatRef.on("value", function(snapshot){
		if(snapshot.hasChild("msg"))
			chatMsg = snapshot.val().msg;
	});

	$("#sendChat").prop("disabled",true);
	$("#inputChat").prop("disabled",true);
	
	$("#sub").on("click",function(ev){
		ev.preventDefault();
		
		name = $("#inputUserName").val().trim();
		if( name !== "" )
		{
			if(selectedUsersCounter < 2)
			{
				currentStatus = "selected";
				// Generate a reference to a new location for my user with push.
				myUserRef = userListRef.push();
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
				if (isOnline.val()) {
					// If I lose internet connection, remove me from the list.
					myUserRef.onDisconnect().remove();
				}
				// Set initial status.
				setUserStatus(currentStatus);
				$(ev.currentTarget).prop("disabled",true);
				$("#inputUserName").prop("disabled",true);
				$("#sendChat").prop("disabled",false);
				$("#inputChat").prop("disabled",false);

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
	    
	    if(chatMsg !== "") chatMsg = chatMsg + "\n";
	    chatMsg = chatMsg + name + ": " + txt;
		//$("#chat").val(chatMsg);
		console.log("chat message is "+chatMsg);
		chatRef.set({msg:chatMsg});
		$("#inputChat").val("");
	});
	$(".btnRps").on("click",function(ev){
		ev.preventDefault();
		
		if( (selectedUsersCounter === 2) && (!iPlayed) && (currentStatus === "selected") )
		{
			var rps = $(ev.currentTarget).data("val");
			var rndVal = Date.now()+Math.floor(Math.random() * 1500);//used to force a child_added event even if the user had the same selection.
			myUserRef.update({ turn: turn, rpsSelected: rps, rnd: rndVal });
			$("#game").append($("<div>" + name + " selected " + rps + "</div>"));
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
						var res = "";
						//check who won
						res = pname1 + " selected " + playerSelection1 + " and " + pname2 + " selected " + playerSelection2 + " so ";
						if(playerSelection1===playerSelection2)
						{
							res = res + " It is a tie!";
						}
						else if(playerSelection1 === "rock" && playerSelection2 === "scissors" || playerSelection1 === "paper" && playerSelection2 === "rock" || playerSelection1 === "scissors" && playerSelection2 === "paper" )
						{
							res = res + pname1 + " wins!!!";
							score1 = score1 + 1;
							$("#" + pkey1 + " .userScore").html(score1);
						}
						else
						{
							res = res + pname2 + " wins!!!";
							score2 = score2 + 1;
							$("#" + pkey2 + " .userScore").html(score2);
						}
					
						//set results and won to battle result
						$("#battleResult").html(res);
						iPlayed = false;
						opponentPlayed = false;
						$("#game").html("");
						turn=turn+1;
					}
				});
			}
		}
		else
		{
			if(currentStatus === "waitlist")
				console.log("You are in the wait list!!");
			else
				console.log("waiting for an opponent");
		}

	});

	function setUserStatus(status)
	{
		currentStatus = status;
		myUserRef.set({ name: name, status: status, score: 0 });
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
			console.log("possible change to 'selected'");//change this later / move an user from waitlist to selected list
	});

	waitListRef.on("child_removed", function(snapshot) {
		$("#" + snapshot.key).remove();
		waitListUsersCounter--;
	});

	// Update our GUI to change a user"s status.
	userListRef.on("child_changed", function(snapshot) {
		var user = snapshot.val();
		
		if( snapshot.key !== myKey )
		{
			if(user.hasOwnProperty("rpsSelected") && user.rpsSelected !== "")
			{
				$("#game").append($("<div>"+user.name+" made a selection. </div>"));
				opponentPlayed = true;
				if(iPlayed)
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
							//check who won
							res = pname1 + " selected "+playerSelection1+" and "+pname2+" selected "+playerSelection2+" so ";
							if(playerSelection1===playerSelection2)
							{
								res = res + " It is a tie!";
							}
							else if(playerSelection1 === "rock" && playerSelection2 === "scissors" || playerSelection1 === "paper" && playerSelection2 === "rock" || playerSelection1 === "scissors" && playerSelection2 === "paper" )
							{
								res = res + pname1 + " wins!!!";
								score1 = score1 + 1;
								$("#"+pkey1+" .userScore").html(score1);
							}
							else
							{
								res = res + pname2 + " wins!!!";
								score2 = score2 + 1;
								$("#"+pkey2+" .userScore").html(score2);
							}
							//set results and won to battle result
							$("#battleResult").html(res);
							iPlayed = false;
							opponentPlayed = false;
							$("#game").html("");
							turn=turn+1;
						}
					});
				}
			}
		}
	});

	chatRef.on("child_added", function(snapshot) {
		var msgHistory = snapshot.val();
		$("#chat").val(msgHistory);
	});

	chatRef.on("child_changed", function(snapshot) {
		var msgHistory = snapshot.val();
		$("#chat").val(msgHistory);
	});

});