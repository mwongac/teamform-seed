angular.module('member-app', ['firebase'])
    .controller('MemberCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {


        //sth that should be include for navbar
        $scope.loggedIn = true;
        // Call Firebase initialization code defined in site.js
        initalizeFirebase();

        //eventid & teamid from url
        $scope.eventid = getURLParameter("eventid");
        $scope.teamid = getURLParameter("teamid");

        //function for display edit
        $scope.edit_leader_visibility = false;
        $scope.filtered_result_visibility = false;
        $scope.currentTeamSize = 1;

        // this part is for announcements (readAnn.html)
        var refPath = "events/" + $scope.eventid + "/announcements";
        $scope.announcements = [];
        $scope.announcements = $firebaseArray(firebase.database().ref(refPath));

        // this part is for Evet description (description.html)
        var refPath = "events/" + $scope.eventid + "/admin";
        retrieveOnceFirebase(firebase, refPath, function (data) {
            console.log(data.child("param").val());
            if (data.child("param").val() != null) {
                $scope.param = data.child("param").val();
                //console.log($scope.param.minTeamSize);
                $scope.deadline = Date.parse($scope.param.deadline);
                $scope.today = new Date();
                //console.log($scope.today);
                $scope.param.admin = $scope.param.admin;
                adminRefPath = "users/" + $scope.param.admin;
                retrieveOnceFirebase(firebase, adminRefPath, function (adminData) {
                    //	console.log(adminData.child("name").val());
                    if (adminData.child("name").val() != null) {
                        $scope.adminName = adminData.child("name").val();
                        //$scope.adminName = $scope.adminData.name;
                        $scope.$apply(); // force to refresh
                    }
                });
                $scope.$apply(); // force to refresh
            }
        });

        //team description, preference
        $scope.teamDescription = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/description'))
        $scope.preference = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/preference'))
        $scope.displayName = '';







        //teamleader
        $scope.teamLeader = $firebaseObject(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/teamLeader'))
        $scope.teamLeader.$loaded()
            .then(function (data2) {
                var load_screen = document.getElementById("load_screen");
                document.body.removeChild(load_screen);
                var users = $firebaseArray(firebase.database().ref('users'));
                users.$loaded()
                    .then(function (data) {
                        console.log($scope.teamLeader);
                        for (var i = users.length - 1; i >= 0; i--) {
                            if ($scope.teamLeader.$value == users[i].$id) {
                                $scope.leaderName = users[i].name;
                            }
                        }
                    });
            });


        $scope.members = [];
        var users = $firebaseArray(firebase.database().ref('users'));
        $scope.memberIds = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/members/'));
        $scope.memberIds.$loaded()
            .then(function (data) {
                users.$loaded()
                    .then(function (data2) {
                        for (var i = $scope.memberIds.length - 1; i >= 0; i--) {
                            for (var j = users.length - 1; j >= 0; j--) {
                                if ($scope.memberIds[i].memberID == users[j].$id) {
                                    $scope.members.push(users[j]);
                                    console.log(j);
                                }
                            }
                        }
                        $scope.currentTeamSize = $scope.members.length + 1;
                    })
            })

        $scope.getUserNameByID = function (currentUserId, callback) {
            var RefPath = "users/" + currentUserId;
            retrieveOnceFirebase(firebase, RefPath, function (currentUserData) {
                //console.log(currentUserData.child("name").val());
                if (currentUserData.child("name").val() != null) {
                    callback(currentUserData.child("name").val());
                }
            });
        }

        $scope.quitTeam = function () {
            //delete from memberlist
            for (var i = $scope.members.length - 1; i >= 0; i--) {
                if ($scope.uid == $scope.members[i].memberID) {
                    $scope.members.splice(i, 1);
                    break;
                }
            }
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    teamData.members = $scope.members;
                    teamData.$save();
                });

            //update user state
            var currentUser = $scope.uid;
            var currentUsersRef = firebase.database().ref('users/' + currentUser + '/teams/' + $scope.eventid);
            var userNewTeamObject = $firebaseObject(currentUsersRef);
            userNewTeamObject.$loaded()
                .then(function (data) {
                    if (userNewTeamObject.role != 'admin' && userNewTeamObject.role != 'leader') {
                        userNewTeamObject.role = null;
                        userNewTeamObject.teamid = null;
                        userNewTeamObject.$save();
                    }
                    console.log(userNewTeamObject);
                });
            var url = "event.html?q=" + $scope.eventid;
            window.location.href = url;
        }


        //logout function
        $scope.logout = function () {
            firebase.auth().signOut();
        }

        //monitor if the user is logged in or not
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log('leader.js')
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
                //teamData
                var teamRef = database.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
                var teamData = $firebaseObject(teamRef);
                teamData.$loaded()
                    .then(function (data) {
                        console.log(data);
                        console.log('teamData loaded');
                        console.log(teamData.description);
                        if (teamData.preference == null) {
                            $scope.preference = [];
                        } else {
                            $scope.preference = teamData.preference;
                        }
                        if (teamData.description == null) {
                            $scope.teamDescription = '';
                        } else {
                            $scope.teamDescription = teamData.description;
                        }
                        $scope.displayName = teamData.teamName;
                        $scope.preferredTeamSize = teamData.preferredTeamSize;
                    });
            } else {
                console.log('not log in');
                $window.location.href = '/index.html';
            }
        })
    }]);

