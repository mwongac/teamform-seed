angular.module('leader-app', ['firebase'])
    .controller('LeaderCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {


        //sth that should be include for navbar
        $scope.loggedIn = true;
        // Call Firebase initialization code defined in site.js
        initalizeFirebase();

        //eventid & teamid from url
        $scope.eventid = getURLParameter("eventid");
        $scope.teamid = getURLParameter("teamid");

        //team description, preference
        $scope.teamDescription = '';
        $scope.preference = [];
        $scope.addpreference = '';
        $scope.filtedUsers = [];
        $scope.displayName = '';
        $scope.nameToInvite = '';
        $scope.invitelist = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/invitelist'))
        $scope.requestMemberList = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/requestMemberList'))
        $scope.requestMemberList.$loaded()
            .then(function (data) {
                // console.log("data: ");
                // console.log(data);
                angular.forEach(data, function (oneMember, key) {
                    console.log("oneMember: ");
                    console.log(oneMember);
                    $scope.getUserNameByID(oneMember.memberID, function (resultFromCallback) {
                        oneMember.name = resultFromCallback;
                        $scope.$apply();
                        console.log("a member name: " + oneMember.name);
                    });
                });
            });

        $scope.members = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/members'))
        $scope.members.$loaded()
            .then(function (data) {
                // console.log("data: ");
                // console.log(data);
                angular.forEach(data, function (oneMember, key) {
                    console.log("oneMember: ");
                    console.log(oneMember);
                    $scope.getUserNameByID(oneMember.memberID, function (resultFromCallback) {
                        oneMember.name = resultFromCallback;
                        $scope.$apply();
                        console.log("a member name: " + oneMember.name);
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

        //accept request 
        $scope.acceptRequest = function (uid, u) {
            console.log('accoept clicked uid: ' + uid);
            console.log($scope.requestMemberList.indexOf(u));
            //delete from requestMemberList
            $scope.requestMemberList.splice($scope.requestMemberList.indexOf(u), 1);
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    teamData.requestMemberList = $scope.requestMemberList;
                    teamData.$save();
                });

            //update team members
            var newteamRef = firebase.database().ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamobject = $firebaseObject(newteamRef);
            $scope.members.$loaded()
                .then(function (data) {
                    $scope.test = teamobject.members;
                    $scope.test.push({ "memberID": uid });
                    teamobject.members = $scope.test;
                    teamobject.$save();
                    console.log(teamobject);

                    angular.forEach(data, function (oneMember, key) {
                        console.log("oneMember: ");
                        console.log(oneMember);
                        $scope.getUserNameByID(oneMember.memberID, function (resultFromCallback) {
                            oneMember.name = resultFromCallback;
                            console.log("a member name: " + oneMember.name);
                            $scope.$apply();
                        });
                    });
                });
             
            //update user state
            var currentUser = uid;
            var currentUsersRef = firebase.database().ref('users/' + currentUser + '/teams/' + $scope.eventid);
            var userNewTeamObject = $firebaseObject(currentUsersRef);
            userNewTeamObject.$loaded()
                .then(function (data) {
                    if (userNewTeamObject.role != 'admin' && userNewTeamObject.role != 'leader') {
                        userNewTeamObject.role = 'member';
                        userNewTeamObject.teamid = $scope.teamid;
                        userNewTeamObject.$save();
                    }
                    console.log(userNewTeamObject);
                });

        }

        //change teamName
        $scope.changeTeamName = function () {
            console.log('clicked changeTeamName');
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    teamData.teamName = $scope.displayName;
                    teamData.$save()
                        .then(function (s) {
                            console.log('saved');
                        })
                        .catch(e => console.log(e));
                })
                .catch(e => console.log(e));
        }

        //inviteUser
        $scope.inviteUser = function (uid, u) {
            console.log('invite clicked uid: ' + uid);
            console.log($scope.filtedUsers.indexOf(u));
            $scope.filtedUsers.splice($scope.filtedUsers.indexOf(u), 1);
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid + '/invitelist/' + uid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    var userRef = db.ref('users/' + uid);
                    var userO = $firebaseObject(userRef);
                    userO.$loaded()
                        .then(function () {
                            teamData.name = userO.name;
                            teamData.language = userO.language;
                            teamData.$save();
                        });
                    var userInviteListRef = db.ref('users/' + uid + '/invitelist/' + $scope.eventid + '/' + $scope.teamid);
                    var userInviteList = $firebaseObject(userInviteListRef);
                    userInviteList.$loaded()
                        .then(function (data) {
                            console.log(data);
                            userInviteList.teamName = $scope.displayName;
                            userInviteList.$save();
                        });

                })
                .catch(e => console.log(e));
        }

        //change description
        $scope.changeDescription = function () {
            console.log('click change')
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    console.log($scope.teamDescription);
                    teamData.description = $scope.teamDescription;
                    teamData.$save()
                        .then(function (s) {
                            console.log('saved');
                        })
                        .catch(e => console.log(e));
                })
                .catch(e => console.log(e));
        }

        //create team function
        //  $scope.createTeam = function(){
        //      console.log('creating team');
        //      var ref = firebase.database().ref("events/"+$scope.eventid+"/teams");
        //      console.log(ref);
        //      var teamkey = ref.push().key;
        //      console.log(teamkey);
        //     var event = $firebaseObject(ref);
        //     event.$loaded()
        //         .then(function(data){
        //             console.log(data);
        //             var newteamRef = firebase.database().ref('events/'+$scope.eventid+'/teams/'+teamkey);
        //             var teamobject = $firebaseObject(newteamRef);
        //             teamobject.teamName = "test name";
        //             teamobject.$save();
        //         });
        // }

        //$scope.users is an array of users in firebase
        var usersRef = firebase.database().ref('users');
        $scope.users = $firebaseArray(usersRef);

        //addpreference
        $scope.addPre = function () {
            console.log('addPre pressed');
            $scope.preference.push($scope.addpreference);
            $scope.preference.sort();
            $scope.addpreference = '';
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    teamData.preference = $scope.preference;
                    teamData.$save()
                        .then(function (s) {
                            console.log('saved');
                        })
                        .catch(e => console.log(e));
                })
                .catch(e => console.log(e));
        }
        //filter by preference
        $scope.filterPre = function () {
            $scope.filtedUsers = [];
            console.log('filterPre pressed');
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);

            var ref = firebase.database().ref('users');
            var u = $firebaseArray(ref);

            u.$loaded()
                .then(function (data) {
                    console.log(u);
                    angular.forEach(u, function (user) {
                        var haveAllPre = true;
                        for (var i = teamData.preference.length - 1; i >= 0; i--) {
                            var haveThisPre = false;
                            for (var j = user.language.length - 1; j >= 0; j--) {
                                if (teamData.preference[i] == user.language[j]) {
                                    haveThisPre = true;
                                }
                            }
                            if (!haveThisPre) {
                                haveAllPre = false;
                            }
                        }
                        if (haveAllPre) {
                            var userR = firebase.database().ref('users/' + user.$id + '/teams/' + $scope.eventid);
                            var uEvent = $firebaseObject(userR);
                            uEvent.$loaded()
                                .then(function (data) {
                                    console.log(uEvent.role);
                                    if (uEvent.role == null || uEvent.role == "null") {
                                        console.log($scope.invitelist);
                                        console.log($scope.invitelist.$getRecord(user.$id));
                                        if ($scope.invitelist.$getRecord(user.$id) == null) {
                                            $scope.filtedUsers.push(user);
                                        }
                                    }
                                })
                                .catch(e => console.log(e));
                        }
                    });
                });


        }

        // filter by name
        $scope.filterName = function () {

            $scope.filtedUsers = [];
            console.log('filterName pressed');
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);

            var ref = firebase.database().ref('users');
            var u = $firebaseArray(ref);

            u.$loaded()
                .then(function (data) {
                    console.log(u);
                    angular.forEach(u, function (user) {
                        if ($scope.nameToInvite == user.name) {
                            var userR = firebase.database().ref('users/' + user.$id + '/teams/' + $scope.eventid);
                            var uEvent = $firebaseObject(userR);
                            uEvent.$loaded()
                                .then(function (data) {
                                    console.log(uEvent.role);
                                    if (uEvent.role == null || uEvent.role == "null") {
                                        console.log($scope.invitelist);
                                        console.log($scope.invitelist.$getRecord(user.$id));
                                        if ($scope.invitelist.$getRecord(user.$id) == null) {
                                            $scope.filtedUsers.push(user);
                                        }
                                    }
                                })
                                .catch(e => console.log(e));
                        }
                    });
                });

        }




        //removepreference
        $scope.removePre = function (target) {
            console.log('remove clicked');
            console.log($scope.preference.indexOf(target));
            $scope.preference.splice($scope.preference.indexOf(target), 1);
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    teamData.preference = $scope.preference;
                    teamData.$save()
                        .then(function (s) {
                            console.log('saved');
                        })
                        .catch(e => console.log(e));
                })
                .catch(e => console.log(e));

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
                    });
            } else {
                console.log('not log in');
                $window.location.href = '/index.html';
            }
        })
    }]);

