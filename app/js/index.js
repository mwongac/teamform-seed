$(document).ready(function () {

	$("#btn_admin").click(function () {
		var val = $('#input_text').val();
		if (val !== '') {
			var url = "admin.html?q=" + val;
			window.location.href = url;
			return false;
		}
	});

	$("#btn_leader").click(function () {
		var val = $('#input_text').val();
		if (val !== '') {
			var url = "team.html?q=" + val;
			window.location.href = url;
			return false;
		}
	});

	$("#btn_member").click(function () {
		var val = $('#input_text').val();
		if (val !== '') {
			var url = "member.html?q=" + val;
			window.location.href = url;
			return false;
		}
	});


});

angular
	.module('index-app', ['firebase'])
	.controller('LoginCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {
		//init firebase
		initalizeFirebase();
		$scope.txtEmail = '';
		$scope.txtPassword = '';
		$scope.loggedIn = false;
		$scope.displayEmail = '';
		$scope.username = '';
		$scope.keywordfilter = '';

		$scope.eventName = '';
		$scope.userID = '';

		//testing abt firebase
		var ref = firebase.database().ref('events');
		$scope.events = $firebaseArray(ref);



		//enter event
		$scope.enterEvent = function (eventid) {

			var database = firebase.database();
			var currentUser = firebase.auth().currentUser;
			var refpath = "users/" + currentUser.uid + "/teams";
			var ref = database.ref(refpath);
			var teamList = $firebaseArray(ref);

			teamList.$loaded()
				.then(function (x) {

					

					console.log(teamList.$getRecord(eventid));
					if (teamList.$getRecord(eventid) == null) {
						//the first time the user enters an event
						var userTeamRefPath = refpath + '/' + eventid;
						var userTeamRef = firebase.database().ref(userTeamRefPath);
						adminData = $firebaseObject(userTeamRef);
						adminData.role = {};
						adminData.role = "null";
						adminData.$save();

						var url = "event.html?q=" + eventid;
						window.location.href = url;
						return true;

					} else if (teamList.$getRecord(eventid).role == "admin") {
						//the user is the admin of the event
						var url = "admin.html?q=" + eventid;
						window.location.href = url;
						return true;
					} else if (teamList.$getRecord(eventid).role == "leader") {
						//the user is the one of the leaders of a team of the event
						var url = "leader.html?eventid=" + eventid + "&teamid=" + teamList.$getRecord(eventid).teamid;
						window.location.href = url;
						return true;
					} else if (teamList.$getRecord(eventid).role == "member") {
						//the user is the one of the members of a team of the event
						var url = "member.html?eventid=" + eventid + "&teamid=" + teamList.$getRecord(eventid).teamid;
						window.location.href = url;
						return true;
					} else if (teamList.$getRecord(eventid).role == "null") {
						//the user has not yet enter a team
						var url = "event.html?q=" + eventid;
						window.location.href = url;
						return true;
					} else if (teamList.$getRecord(eventid).role == "") {
						//the user has not yet enter a team
						var url = "event.html?q=" + eventid;
						window.location.href = url;
						return true;
					} else if (typeof teamList.$getRecord(eventid).role == "undefined") {
						//the user has not yet enter a team
						var url = "event.html?q=" + eventid;
						window.location.href = url;
						return true;
					}
					console.log(typeof teamList.$getRecord(eventid).role);
				});
		}

		//filter test for rule.*
		// $scope.matchRuleShort = function(str, rule){
		// 	var matchtest = new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
		// 	console.log("match: " + matchtest);
		// 	return matchtest;
		// }
		//filter for *.rule and rule.*
		$scope.matchRule = function (str, rule) {
			var matchtest = new RegExp(rule).test(str);
			console.log("match: " + matchtest);
			return matchtest;
		}

		$scope.filter = function (eventname) {
			//	var rulename = $scope.eventName + "*";
			//	var reultRight=$scope.matchRuleShort(eventname, rulename);
			var rulename = $scope.keywordfilter;
			var reultLeft = $scope.matchRule(eventname, rulename);
			return (reultLeft);
		}


		
		//identify the role in the event
		$scope.getUserRoleInEvent = function (event) {
			var resultRole;
            //console.log("getUserRoleInEvent for Event: " + event.$id);
            $scope.getUserRoleByEventID(event.$id, function (resultFromCallback) {
                resultRole = resultFromCallback;
                console.log("Event: getUserRoleByEventID: " + resultRole);
                event.Role = resultRole;
            })
			
		}

		$scope.getUserRoleByEventID = function (eventid, callback) {
            var foundRole;
			var currentUser = firebase.auth().currentUser;
			if (currentUser) {
				var userDatabase = firebase.database();
				var userRef = userDatabase.ref('users/' + currentUser.uid + '/teams');
				var userData = $firebaseArray(userRef);
			
				userData.$loaded()
					.then(function (data) {
						var teamevent = userData.$getRecord(eventid);
						//console.log("getUserRoleByEventID: " + currentUser.uid);
						console.log("getUserRoleByEventID: "+ teamevent);
						if (teamevent == null) {
							callback('');    								//Not Yet Entered
						} else if (teamevent.role == "null") { 					//role is a STRING!!!!!
							callback(''); 									//You don't have a role yet
						} else {
							callback('Role: ' + teamevent.role);
						}
					})
			}
        }	


		//check id the deadline of a event is passed TRUE:passed FALSE:Not yet passed
		$scope.checkDL = function  (eventDL) {
			var today = new Date();
			var deadline = new Date(eventDL);
            // console.log("checkDL: " + deadline);
			// console.log("checkDL TODAY: " + today);
			// console.log('Deadline: ' + (today > deadline));
			if (today > deadline) {
				return true;
			} else {
				return false;
			}
		}
		
			

		//create new event
		$scope.createNewEvent = function (eventname) {
			var val = $('#eventName').val();
			if (val == '') {
				var url = "createEvent.html?q=" + val;
				window.location.href = url;
				return false;
				//user can enter create event page with existing event name,  it will warning when user create it
			} else {
				var url = "createEvent.html?q=" + val;
				window.location.href = url;
				return true;
			}
		}

		$scope.enterEventWithName = function (eventName) {
			$scope.getEventid(eventName, function (result) {
				console.log("get event id:" + result);
				if (result) {
					console.log("found event");
					$scope.enterEvent(result);
				} else {//result = null
					//ask if user want to create new event
					console.log("cannot found event, ask user if they want to create new event");
					if (confirm(eventName + " is not existed. \n Do you want to create new event?") == true) {
						console.log("create event " + eventName);
						$scope.createNewEvent(eventName);
					} else {
						console.log("Canceled");
					}
				}
			})
		}

		$scope.getEventid = function (eventname, callback) {
			console.log("get event id by eventname");
			console.log("eventname: " + eventname);
			var ref = firebase.database().ref("events/");
			var eventsList = $firebaseObject(ref);
			var eventid = null;
			eventsList.$loaded(function (data) {
				data.forEach(function (eventObj, key) {
					console.log("eventObj's key: " + key);
					if ((eventObj.admin.param.eventName == eventname)) {
						console.log("found, callback eventid");
						eventid = key;
					}
				})
			}).then(function () {
				callback(eventid);
			});
		}

		$scope.scrollToTop = function () {
			$window.scrollTo(0, 0);
		}

		//login function
		$scope.login = function () {
			const email = $scope.txtEmail;
			const pass = $scope.txtPassword;
			console.log(email);
			console.log(pass);
			const auth = firebase.auth();
			//Sign in
			auth.signInWithEmailAndPassword(email, pass)
				.then(user => {
					console.log('promise is done');
					// $window.alert("You have successfully logged in");
					window.location.href = "index.html";
				}).catch(e => {
					console.log(e.message);
					$window.alert(e.message);
				});
		}

		//signup function
		$scope.signup = function () {
			const email = $scope.txtEmail;
			const pass = $scope.txtPassword;
			console.log(email);
			console.log(pass);
			const auth = firebase.auth();
			//Sign up
			auth.createUserWithEmailAndPassword(email, pass)
				.then(user => {
					console.log('promise is done');
					$window.alert("You have successfully signed up");
				})
				.catch(e => {
					console.log(e.message);
					$window.alert(e.message);
				});
		}

		//logout function
		$scope.logout = function () {
			firebase.auth().signOut();
			window.location.href = "index.html";
		}

		//Change LoggedIn
		$scope.changeLoggedIn = function (bool) {
			$scope.loggedIn = bool;
		}

		firebase.auth().onAuthStateChanged(user => {
			if (user) {
				console.log(user);
				$scope.changeLoggedIn(true);
				console.log($scope.loggedIn);
				$scope.displayEmail = user.email;
				$scope.userData = {};
				$scope.$apply();

				var usersRef = firebase.database().ref('users');
				var usersArray = $firebaseArray(usersRef);
				usersArray.$loaded()
					.then(function (x) {
						
						console.log(usersArray.$getRecord(user.uid));
						if (usersArray.$getRecord(user.uid) == null) {
							console.log('it is null and i am setting new profile for it');
							firebase.database().ref('users/' + user.uid).set({
								name: user.email,
								language: ['C++'],
								gpa: 3,
								team: ['null'],
								test: 'never change'
							});
							$scope.username = user.email;
							// loading screen
					var load_screen = document.getElementById("load_screen");
					document.body.removeChild(load_screen);
						} else {
							$scope.username = usersArray.$getRecord(user.uid).name;
							// loading screen
					var load_screen = document.getElementById("load_screen");
					document.body.removeChild(load_screen);
						}

						// $scope.username = usersArray.$getRecord(user.uid).name;
						// $scope.username = user.email;

					})
					.catch(function (error) {
						console.log("Error:" + error);
					});
			} else {
					// loading screen
					var load_screen = document.getElementById("load_screen");
					document.body.removeChild(load_screen);

				console.log('not log in');
				$scope.changeLoggedIn(false);
				$scope.$apply();
			}
		})
	}]);