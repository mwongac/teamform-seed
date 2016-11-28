$(document).ready(function () {
	$('#team_page_controller').hide();
	$('#text_event_name').text("Error: Invalid event name ");
	var eventid = getURLParameter("eventid");
	console.log(eventid);
	if (eventid != null && eventid !== '') {
		$('#text_event_name').text("Event id: " + eventid);

	}


});

angular.module('teamform-team-app', ['firebase'])
	.controller('TeamCtrl', ['$scope', '$firebaseObject', '$firebaseArray',
		function ($scope, $firebaseObject, $firebaseArray) {
			
			// Call Firebase initialization code defined in site.js
			initalizeFirebase();

			
			var teamid = getURLParameter("teamid");
			$scope.teamid = teamid;
			var eventid = getURLParameter("eventid");
			$scope.eventid = eventid;


			var teamRef = firebase.database().ref('events/' + eventid + '/teams/' + teamid);
			var teamObject = $firebaseObject(teamRef);
			console.log("teamObject:");
			console.log(teamObject);


			var eventRef = firebase.database().ref('events/' + eventid + '/admin/param');
			var eventObject = $firebaseObject(eventRef);
			console.log("eventObject:");
			console.log(eventObject);

			// TODO: implementation of MemberCtrl	
			$scope.param = {
				"eventName": '',
				"teamMembers": [],
				"minTeamSize":0,
				"maxTeamSize":0,
			};
			$scope.currentTeamSize = 0;
			$scope.teamLeaderName ='';
			
			//Start: It get the data about admin and put them in parm
			//$scope.param = $firebaseObject(eventRef);
			// $scope.param.$loaded()
			//  	.then(function (data) {

			// 		$scope.today = new Date();
			// 		var database = firebase.database();
			// 		var adminRef = database.ref('users/' + $scope.param.admin);
			// 		var adminData = $firebaseObject(adminRef);
			// 		adminData.$loaded()
			// 			.then(function (data) {
			// 				$scope.adminName = adminData.name;
			// 			})

			// 		// Enable the UI when the data is successfully loaded and synchornized
			// 		$('#text_event_name').text("Event Name: " + $scope.param.eventName);
			// 		$('#admin_page_controller').show();
			// 	})
			// 	.catch(function (error) {
			// 		// Database connection error handling...
			// 		//console.error("Error:", error);
			// 	});
			//End: It get the data about admin and put them in parm


			refPath = "events/" + eventid + "/admin";
			retrieveOnceFirebase(firebase, refPath, function (data) {
				console.log(data.child("param").val());
				if (data.child("param").val() != null) {
					$scope.range = data.child("param").val();
					$scope.param.minTeamSize = parseInt($scope.range.minTeamSize);
					//console.log($scope.param.minTeamSize);
					$scope.param.maxTeamSize = parseInt($scope.range.maxTeamSize);
					$scope.deadline = Date.parse($scope.range.deadline);
					$scope.today = new Date();
					//console.log($scope.today);
					$scope.param.eventName= $scope.range.eventName;
					$scope.param.description = $scope.range.description;
					$scope.param.admin = $scope.range.admin;

					adminRefPath = "users/" + $scope.range.admin;
					retrieveOnceFirebase(firebase, adminRefPath, function (adminData) {
					//	console.log(adminData.child("name").val());
						if (adminData.child("name").val() != null) {
							$scope.adminName = adminData.child("name").val();
							//$scope.adminName = $scope.adminData.name;
							$scope.$apply(); // force to refresh
						}
					});

					$scope.$apply(); // force to refresh
					$('#team_page_controller').show(); // show UI
				}
			});


			refPath = "events/" + eventid + "/teams/"+ teamid;
			 retrieveOnceFirebase(firebase, refPath, function (data) {
			 //	console.log(data.val());
			 		if (data.val() != null) {
						$scope.range = data.val();
						$scope.preference = $scope.range.preference;
 						$scope.preferredTeamSize = $scope.range.preferredTeamSize;
						$scope.teamDescription = $scope.range.teamDescription;
						//$scope.teamLeader = $scope.range.teamLeader;
  						$scope.teamName = $scope.range.teamName; 
						$scope.$apply(); // force to refresh
			 		}
				 });
			
			var teamLeaderRef = firebase.database().ref("events/" + eventid + "/teams/" + teamid + "/teamLeader");
			 $scope.teamLeader = $firebaseObject(teamLeaderRef);
			 $scope.teamLeader.$loaded()
			 	.then(function (data) {
					//  console.log("data.$value: ");
			 		//  console.log(data.$value);
							$scope.getUserNameByID(data.$value, function (resultFromCallback){
								$scope.teamLeader.name= resultFromCallback;
								$scope.currentTeamSize +=1;
								console.log("The Team Leader name: "+ $scope.teamLeader.name );
								//console.log($scope.teamLeader.name);
							});
			 	});

			var membersRef = firebase.database().ref("events/" + eventid + "/teams/" + teamid + "/members");
			//$scope.members = [];
			$scope.members = $firebaseObject(membersRef);

			 $scope.members.$loaded()
			 	.then(function (data) {
					// console.log("data: ");
			 		// console.log(data);
					angular.forEach(data, function (oneMember, key) {
						// console.log("oneMember: ");
						// console.log(oneMember);
						$scope.getUserNameByID(oneMember.memberID, function (resultFromCallback){
						oneMember.name = resultFromCallback;
						$scope.currentTeamSize +=1;
						console.log("a member name: "+ oneMember.name);
						});
						$scope.getUserDescriptionByID(oneMember.memberID, function (resultFromCallback){
						oneMember.description = resultFromCallback;
						console.log("a member's description: "+ oneMember.description);
						});
					});
					
			 	});

			$scope.getUserNameByID = function (currentUserId, callback) {
				var RefPath = "users/" + currentUserId;
				retrieveOnceFirebase(firebase, RefPath, function (currentUserData) {
					//console.log(currentUserData.child("name").val());
					if (currentUserData.child("name").val() != null) {
						callback(currentUserData.child("name").val());
					}
				});
			}

			$scope.getUserDescriptionByID = function (currentUserId, callback) {
				var RefPath = "users/" + currentUserId;
				retrieveOnceFirebase(firebase, RefPath, function (currentUserData) {
					//console.log(currentUserData.child("name").val());
					if (currentUserData.child("description").val() != null) {
						callback(currentUserData.child("description").val());
					}
				});
			}

		//request to join this team 
		$scope.requestJoinTeam = function (currentTeamid) {
			if (currentTeamid == "undefined") {
				return false;
			} else if (currentTeamid == ''){
				currentTeamid = $scope.teamid;
			}
				console.log(currentTeamid);
				var newteamRef = firebase.database().ref('events/'+$scope.eventid+'/teams/'+ currentTeamid);
				var teamobject = $firebaseObject(newteamRef);
				teamobject.$loaded()
					.then(function(data){
							$scope.requestMemberList = teamobject.requestMemberList;
							if(typeof $scope.requestMemberList == "undefined"){
								$scope.requestMemberList = [];
							}
							$scope.requestMemberList.push( {"memberID":$scope.uid});
							teamobject.requestMemberList = $scope.requestMemberList; 
							teamobject.$save();
							console.log(teamobject);
					});		
			
		}

		//join this team 
		$scope.joinTeam = function (currentTeamid) {
			if (typeof currentTeamid == "undefined") {
				return false;
				//user will enter team page which is created by user who become leader
			} else if (currentTeamid == ''){
				currentTeamid = $scope.teamid;
			}
			//	console.log(currentTeamid);
				var currentUser = $scope.uid;
				var currentUsersRef = firebase.database().ref('users/'+currentUser+'/teams/'+$scope.eventid);
				var userNewTeamObject = $firebaseObject(currentUsersRef);
				userNewTeamObject.$loaded()
					.then(function(data){
						if(userNewTeamObject.role != 'admin' && userNewTeamObject.role != 'leader'){
							userNewTeamObject.role = 'member';
							userNewTeamObject.teamid = currentTeamid;
							userNewTeamObject.$save();
						}
						console.log(userNewTeamObject);
					});	


					
				var newteamRef = firebase.database().ref('events/'+$scope.eventid+'/teams/'+ currentTeamid);
				var teamobject = $firebaseObject(newteamRef);
				teamobject.$loaded()
					.then(function(data){
							//console.log(data);
							$scope.joinTeamMembers = teamobject.members;
							if(typeof $scope.joinTeamMembers == "undefined"){
								$scope.joinTeamMembers = [];
							}
							// var membersArrayRef=firebase.database().ref('events/'+$scope.eventid+'/teams/'+ currentTeamid+'/members');
							// var membersArray = $firebaseArray(membersArrayRef);
							// console.log(membersArray);
							// for(mA in membersArray){
							// 	console.log(mA.memberID);
							// 	if(mA.memberID == $scope.uid){
							// 	return;
							// 	}	
							// }
							$scope.joinTeamMembers.push({"memberID":$scope.uid});
							teamobject.members = $scope.joinTeamMembers; 
							teamobject.$save();
							$scope.$apply();
							console.log(teamobject);
					});	
		}


			//logout function
			$scope.logout = function() {
				firebase.auth().signOut();
			}

			//monitor if the user is logged in or not
			firebase.auth().onAuthStateChanged(user => {
				if (user) {
					console.log('logged in');
					var database = firebase.database();
					var usersRef = database.ref('users/' + user.uid);
					var currentUserData = $firebaseObject(usersRef);
					currentUserData.$loaded()
						.then(function (data) {
							$scope.username = currentUserData.name;
							var load_screen = document.getElementById("load_screen");
							document.body.removeChild(load_screen);
						})
						.catch(function (error) {
							console.error("Error: " + error);
						});
					$scope.loggedIn = true;
					$scope.uid = user.uid;
					
					//console.log("$scope.loggedIn: "+$scope.loggedIn);
					// eventid = getURLParameter("eventid");
					// refPath = "events/" + eventid + "/admin/param";
					// ref = firebase.database().ref(refPath);
					// $scope.param = $firebaseObject(ref);
					// $scope.param.$loaded().then(function (data) {
					// 	// if($scope.param.admin != user.uid){//check if user is admin of this event
					// 	// 	console.log('admin: '+$scope.param.admin+', user: '+user.uid);
					// 	// 	console.log('not admin');
					// 	// 	$window.alert("Permission Denied. \n You are not admin of this event")
					// 	// 	$window.location.href = '/index.html';
					// 	// }
					// })

				} else {
					console.log('not log in');
					window.location.href = '/index.html';
				}
			})
		}]);