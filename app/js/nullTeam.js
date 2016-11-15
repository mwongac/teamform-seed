$(document).ready(function () {

	$('#admin_page_controller').hide();
	$('#text_event_name').text("Error: Invalid event id ");
	var eventid = getURLParameter("q");
	if (eventid != null && eventid !== '') {
		$('#text_event_name').text("Event ID: " + eventid);
	}
	$('#create_team_page_visibility').hide();
	$('#create_team_page_btn_visibility').show();
});

//TODO:
//join button in event?q=
//then there will look for user that want to join but without team
//to generate

angular.module('teamform-event-app', ['firebase'])
	.controller('EventCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {

		// TODO: implementation of AdminCtrl

		// Initialize $scope.param as an empty JSON object
		$scope.param = {}; //event.{eventid}.admin.param
		$scope.loggedIn = true;

		// Call Firebase initialization code defined in site.js
		initalizeFirebase();

		var refPath, ref, eventid; //ref for sqecified event
		$scope.eventid = getURLParameter("q");
		eventid = getURLParameter("q");
		console.log("event id : " + eventid)
		refPath = "events/" + eventid + "/admin/param";
		ref = firebase.database().ref(refPath);

		// Link and sync a firebase object
		$scope.param = $firebaseObject(ref);
		$scope.param.$loaded()
			.then(function (data) {
				// // Fill in some initial values when the DB entry doesn't exist
				console.log("loaded: " + $scope.param.eventName);
				console.log("loaded: " + $scope.param);
				if (typeof $scope.param.eventName == "undefined") {
					$scope.param.eventName = "";
				}
				if (typeof $scope.param.admin == "undefined") {
					$scope.param.admin = $scope.uid;
				}
				if (typeof $scope.param.description == "undefined") {
					$scope.param.description = "This is team form for " + $scope.param.eventName + ".";
				}
				if (typeof $scope.param.maxTeamSize == "undefined") {
					$scope.param.maxTeamSize = 10;
				}
				if (typeof $scope.param.minTeamSize == "undefined") {
					$scope.param.minTeamSize = 1;
				}
				if (typeof $scope.param.deadline == "undefined") {
					$scope.deadline = new Date(new Date().setDate(new Date().getDate() + 30));//outside new Date: change string to date object, 2nd Date: create date, 3 rd Date: get today day
				} else {
					$scope.deadline = new Date($scope.param.deadline);
					console.log(new Date($scope.param.deadline));
				}
				$scope.today = new Date();
				var database = firebase.database();
				var adminRef = database.ref('users/' + $scope.param.admin);
				var adminData = $firebaseObject(adminRef);
				adminData.$loaded()
					.then(function (data) {
						$scope.adminName = adminData.name;
					})
				// Enable the UI when the data is successfully loaded and synchornized
				$('#text_event_name').text("Event Name: " + $scope.param.eventName);
				$('#admin_page_controller').show();
			})
			.catch(function (error) {
				// Database connection error handling...
				//console.error("Error:", error);
			});

		//enter the team page 
		$scope.enterTeam = function (currentTeamid) {
			if (currentTeamid == '') {
				return false;
				//user will enter team page which is created by user who become leader
			} else {
				console.log(currentTeamid);
				var url = "team.html?teamid=" + currentTeamid + "&eventid=" + $scope.eventid;
				window.location.href = url;
				return true;
			}
		}



	// for create new team 
	$scope.teamName = "";
	$scope.teamDescription = '';
    $scope.preference = [];
    $scope.addpreference = '';
	$scope.preferredTeamSize = 1;
    // $scope.filtedUsers = [];
    // $scope.displayName = '';
    // $scope.nameToInvite = '';
    // $scope.invitelist =

	//show create team form
	$scope.showTeamForm = function(){
		$('#create_team_page_visibility').show(); 
		$('#create_team_page_btn_visibility').hide(); 
	
	}
    //addpreference
    $scope.addPre = function(){
        console.log('addPre pressed');
        $scope.preference.push($scope.addpreference);
        $scope.preference.sort();
        $scope.addpreference = '';
    }
	//removepreference
    $scope.removePre = function(target){
        console.log('remove clicked');
        console.log($scope.preference.indexOf(target));
        $scope.preference.splice($scope.preference.indexOf(target),1);
	}

	$scope.changePreferredTeamSize = function (delta) {
	var newVal = $scope.preferredTeamSize + delta;
	if (newVal >= 1 && newVal <= $scope.param.maxTeamSize) {
		$scope.preferredTeamSize = newVal;
	}
}

   //create team function 
    $scope.eventid = eventid;
    $scope.createTeam = function(){
		var teamNameVal = $scope.teamName
     	console.log(teamNameVal);
        console.log('creating team');
        var ref = firebase.database().ref('events/'+$scope.eventid+'/teams/');
        console.log($scope.eventid);
        var teamkey = ref.push().key;
        console.log(teamkey);
        var event = $firebaseObject(ref);
        event.$loaded()
            .then(function(data){
                //console.log(data);
                var newteamRef = firebase.database().ref('events/'+$scope.eventid+'/teams/'+ teamkey);
                var teamobject = $firebaseObject(newteamRef);
                teamobject.teamName = teamNameVal; 
				teamobject.teamLeader = $scope.uid;
				teamobject.teamDescription = $scope.teamDescription ;
				teamobject.preference = $scope.preference;
				teamobject.preferredTeamSize = $scope.preferredTeamSize;

                teamobject.$save();
                console.log(teamobject);

                var currentUser = firebase.auth().currentUser;
                var currentUsersRef = firebase.database().ref('users/'+currentUser.uid+'/teams/'+teamkey);
                var userNewTeamObject = $firebaseObject(currentUsersRef);
               if(userNewTeamObject.role != 'admin'){
				userNewTeamObject.role = 'leader';
			   }
			   userNewTeamObject.teamid = teamkey;
                userNewTeamObject.$save();
				console.log(userNewTeamObject);
            });
		if (teamNameVal == '' ){
 			var url = "team.html?teamid=" + teamkey+ "&eventid="+$scope.eventid;
	    	//	window.location.href = url;
    		return false;
		//user will enter team page which is created by user who become leader
    	}else{
		//	var url = "team.html?teamid=" + teamkey+ "&eventid="+$scope.eventid;
			var url = "leader.html?teamid=" + teamkey+ "&eventid="+$scope.eventid;
    	//	window.location.href = url;
    		return true;
		}
    }


		refPath = "events/" + eventid + "/teams";
		$scope.teams = [];
		$scope.teams = $firebaseArray(firebase.database().ref(refPath));

		refPath = "events/" + eventid + "/member";
		$scope.member = [];
		$scope.member = $firebaseArray(firebase.database().ref(refPath));

		refPath = "events/" + eventid + "/announcements";
		$scope.announcements = [];
		$scope.announcements = $firebaseArray(firebase.database().ref(refPath));

		//$scope.users is an array of users in firebase
		var usersRef = firebase.database().ref('users');
		$scope.users = $firebaseArray(usersRef);

		$scope.acceptInvite = function (teamid) {
			console.log("******/nAccept invite")
			refPath = "events/" + eventid + "/teams/" + teamid;
			team = $firebaseObject(firebase.database().ref(refPath));
			team.$loaded().then(function () {
				//console.log("team info: callback "+team.description);
				if (typeof team.members == "undefined") {
					team.members = [];
				}
				//add to member list of team
				team.members.push({ "memberID": $scope.uid });
				//jump to member page
				//$window.location.href = "/member.html?eventid=" + eventid + "&teamid=" + teamid;
			})
			//remove from invitelist for current user of all team!!!!
			angular.forEach($scope.teams, function (team2, team2id) {
				angular.forEach(team2.invitelist, function (invite, inviteKey) {
					if (inviteKey == $scope.uid) {
						refPath = "events/" + eventid + "/teams/" + team2.$id + "/invitelist/" + inviteKey;
						inviteObject = $firebaseObject(firebase.database().ref(refPath));
						console.log("remove invite of team: " + team2.$id + "\ninviteObject: " + inviteObject + "\n" + inviteObject.name);
						inviteObject.$remove();
					}
				})
			})

			//del all invite of user
			$scope.inviteTeams.$remove();
			//change role of user
			var currentUsersRef = firebase.database().ref('users/' + $scope.uid + '/teams/' + eventid);
			var userNewTeamObject = $firebaseObject(currentUsersRef);
			userNewTeamObject.role = 'member';
			userNewTeamObject.team = teamid;
			userNewTeamObject.$save();
			//TODO: del all request

			var url = "member.html?eventid=" + eventid + "$teamid=" + teamid;
			window.location.href = url;
		}

		$scope.rejectInvite = function (teamid) {
			console.log("******/nReject invite")
			//remove invite in team
			refPath = "events/" + eventid + "/teams/" + teamid + "/invitelist/" + $scope.uid;
			inviteOfTeam = $firebaseObject(firebase.database().ref(refPath));
			console.log("remove invites: " + inviteOfTeam.name)
			inviteOfTeam.$remove();
			//remove invite in user
			refPath = "users/" + $scope.uid + "/invitelist/" + eventid + "/" + teamid;
			inviteInUser = $firebaseObject(firebase.database().ref(refPath));
			console.log("remove invites: " + inviteInUser.teamName)
			inviteInUser.$remove();
		}

		$scope.getUserNameInTeam = function (team) {
			var resultName;
			console.log("getUserNameInTeam for team" + team.teamName);
			$scope.getUserNameByID(team.teamLeader, function (resultFromCallback) {
				resultName = resultFromCallback;
				console.log("Leader: getMemberNameByID: " + resultName);
				team.teamLeaderName = resultName;
			})
			angular.forEach(team.members, function (member, key) {
				$scope.getUserNameByID(member.memberID, function (resultFromCallback) {
					resultName = resultFromCallback;
					//console.log("Member: getMemberNameByID: "+ resultName);
					member.memberName = resultName;
					console.log("member: " + member.memberID + "\nmember: " + member.memberName);
					team.memberNames = [];
					team.memberNames.push(resultName);
				})
				console.log("team.members: " + team.members + "\nteam.memberNames: " + team.memberNames);
			})
		}

		$scope.getTeamInfoByTeamID = function (teamid, TeamObject) {
			//for inviteTeams in user data
			//input teamIDwithteamName= {teamName:teamName, ...}
			// refPath = "events/"+ eventid + "/teams";	
			// $scope.teams = [];
			// $scope.teams = $firebaseArray(firebase.database().ref(refPath));
			// $scope.teams.$loaded().then(function(){
			console.log("******start**********\ngetTeamInfoByTeamID\n\nteam id: " + teamid + "\n" + $scope.teams.$getRecord(teamid).teamName);
			TeamObject = $scope.teams.$getRecord(teamid);
			console.log("TeamObject: " + TeamObject.teamName + "\nleader uid : " + TeamObject.teamLeader);

			// 	console.log("TeamObject leader name: "+ TeamObject.teamLeaderName);
			// });
			{//getUserNameInTeam callback and timeout -> cannot return, so I just copy this code to here
				$scope.getUserNameInTeam(TeamObject);
			};
			console.log("leader name: " + TeamObject.teamLeaderName + "\ndone get team info by ID \n*************end************\n\n");
			// });
		}

		$scope.getUserNameByID = function (userid, callback) {
			var foundName;
			var userDatabase = firebase.database();
			var userRef = userDatabase.ref('users/' + userid + '/name');
			var userData = $firebaseObject(userRef);
			userData.$loaded()
				.then(function (data) {
					//console.log("getUserNameByID: "+userData.$value);
					callback(userData.$value);
				})
		}

		//logout function
		$scope.logout = function () {
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
					})
					.catch(function (error) {
						console.error("Error: " + error);
					});
				$scope.loggedIn = true;
				$scope.uid = user.uid;
			} else {
				console.log('not log in');
				$window.location.href = '/index.html';
			}
			//need uid so need to run after onAuthStateChanged

			refPath = "events/" + eventid + "/teams";
			$scope.teams = [];
			$scope.teams = $firebaseArray(firebase.database().ref(refPath));

			$scope.inviteTeams = [];
			refPath = "users/" + user.uid + "/invitelist/" + eventid;
			console.log("refPath: " + refPath);

			$scope.inviteTeams = $firebaseObject(firebase.database().ref(refPath));
			$scope.teams.$loaded().then(function () {
				$scope.inviteTeams.$loaded().then(function () {
					angular.forEach($scope.inviteTeams, function (team, teamid) {//team=invite team
						console.log("******start**********\ngetTeamInfoByTeamID\n\nteam id: " + teamid + "\n" + $scope.teams.$getRecord(teamid).teamName);
						team = $scope.teams.$getRecord(teamid);
						console.log("TeamObject: " + team.teamName + "\nleader uid : " + team.teamLeader);
						// $scope.getUserNameInTeam(team);

						var resultName;
						console.log("getUserNameInTeam for team " + team.teamName);
						$scope.getUserNameByID(team.teamLeader, function (resultFromCallback) {
							resultName = resultFromCallback;
							// console.log("callback\nLeader: getMemberNameByID: "+ resultName);
							$scope.inviteTeams[teamid].teamLeaderName = resultName;
							console.log("callback\nleader name: " + team.teamLeaderName + "\ndone get team info by ID \n*************end************\n\n");
						})
						angular.forEach(team.members, function (member, key) {
							$scope.getUserNameByID(member.memberID, function (resultFromCallback) {
								resultName = resultFromCallback;
								//console.log("Member: getMemberNameByID: "+ resultName);
								member.memberName = resultName;
								console.log("member: " + member.memberID + "\nmember: " + member.memberName);
								$scope.inviteTeams[teamid].memberNames = [];
								$scope.inviteTeams[teamid].memberNames.push(resultName);
							})
							console.log("team.members: " + team.members + "\nteam.memberNames: " + team.memberNames);
						})
						console.log("leader name: " + team.teamLeaderName + "\ndone get team info by ID \n*************end************\n\n");
					})
				});
			});

		})
	}]);