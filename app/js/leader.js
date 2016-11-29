angular.module('leader-app', ['firebase'])
    .controller('LeaderCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {


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
                var load_screen = document.getElementById("load_screen");
                document.body.removeChild(load_screen);
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
                        $scope.currentTeamSize = $scope.members.length;

                        //update waitlist
                        var waitlist = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/waitlist/'))
                        waitlist.$loaded()
                            .then(function (data2){
                                for (var i = waitlist.length - 1; i >= 0; i--){
                                    for (var j = $scope.members.length - 1; j >=0; j--){
                                        if ($scope.members[j].$id == waitlist[i].uid){
                                            console.log('update wait list: ' + waitlist[i].uid)
                                            waitlist.splice(waitlist.indexOf(waitlist[i].uid), 1);
                                            waitlist.$save();
                                        }
                                    }
                                }
                            })
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


        $scope.waitListUsers = [];
        var users = $firebaseArray(firebase.database().ref('users'));
        $scope.waitList = $firebaseArray(firebase.database().ref('events/' + $scope.eventid + '/waitlist/'));
        users.$loaded()
            .then(function (data) {
                $scope.waitList.$loaded()
                    .then(function (data2) {
                        for (var i = $scope.waitList.length - 1; i >= 0; i--) {
                            for (var j = users.length - 1; j >= 0; j--) {
                                if ($scope.waitList[i].uid == users[j].$id) {
                                    $scope.waitListUsers.push(users[j]);
                                }
                            }
                        }
                    });
            });

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
            teamData.$loaded()
                .then(function (test) {
                    console.log("push" + uid);
                    if (teamData.members == null) {
                        teamData.members = [];
                        teamData.members.push({ memberID: uid });
                    } else {
                        teamData.members.push({ memberID: uid });
                    }
                    teamData.$save()
                        .then(function (eee) {
                            angular.forEach(teamData.members, function (oneMember, key) {
                                console.log("oneMember: ");
                                console.log(oneMember);
                                $scope.getUserNameByID(oneMember.memberID, function (resultFromCallback) {
                                    oneMember.name = resultFromCallback;
                                    console.log("a member name: " + oneMember.name);
                                });
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

            //  location.reload();

        }

        //kick member
        $scope.kickMember = function (member, memberId) {
            //delete from memberlist
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);
            teamData.$loaded()
                .then(function (data) {
                    $scope.members.splice($scope.members.indexOf(member), 1);
                    teamData.members = $scope.members;
                    teamData.$save()
                        .then(function (eee) {
                            angular.forEach(teamData.members, function (oneMember, key) {
                                console.log("oneMember: ");
                                console.log(oneMember);
                                $scope.getUserNameByID(oneMember.memberID, function (resultFromCallback) {
                                    oneMember.name = resultFromCallback;
                                    console.log("a member name: " + oneMember.name);
                                });
                            });
                        });
                });

            //update user state
            var currentUser = memberId;
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
            //location.reload();
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
                    teamData.teamDescription = $scope.teamDescription;
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


            var u = $scope.waitListUsers;

            teamData.$loaded()
                .then(function (data) {
                    for (var k = u.length - 1; k >= 0; k--) {
                        var haveAllPre = true;
                        for (var i = teamData.preference.length - 1; i >= 0; i--) {
                            var haveThisPre = false;
                            for (var j = u[k].language.length - 1; j >= 0; j--) {
                                if (teamData.preference[i] == u[k].language[j]) {
                                    haveThisPre = true;
                                }
                            }
                            if (!haveThisPre) {
                                haveAllPre = false;
                            }
                        }
                        if (haveAllPre && $scope.invitelist.$getRecord(u[k].$id) == null) {

                            $scope.filtedUsers.push(u[k]);


                            $scope.filtered_result_visibility = true;

                        }
                    }

                })
        }

        // filter by name
        $scope.filterName = function () {

            $scope.filtedUsers = [];
            console.log('filterName pressed');
            var db = firebase.database();
            var teamRef = db.ref('events/' + $scope.eventid + '/teams/' + $scope.teamid);
            var teamData = $firebaseObject(teamRef);

            $scope.u = $scope.waitListUsers;
            console.log($scope.u[1].$id)
            console.log($scope.nameToInvite);



            teamData.$loaded()
                .then(function (data) {
                    for (var i = $scope.u.length - 1; i >= 0; i--) {
                        if ($scope.nameToInvite == $scope.u[i].name) {
                            if ($scope.invitelist.$getRecord($scope.u[i].$id) == null) {
                                $scope.filtedUsers.push($scope.u[i]);
                            }
                        }
                    }
                })
            $scope.filtered_result_visibility = true;
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

        $scope.edit_click = function () {
            $scope.edit_leader_visibility = true;
        };
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
                        console.log(teamData.teamDescription);
                        if (teamData.preference == null) {
                            $scope.preference = [];
                        } else {
                            $scope.preference = teamData.preference;
                        }
                        if (teamData.teamDescription == null) {
                            $scope.teamDescription = '';
                        } else {
                            $scope.teamDescription = teamData.teamDescription;
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

