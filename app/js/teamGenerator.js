$(document).ready(function () {

    $('#team_generator_controller').hide();
    $('#text_event_name').text("Error: Invalid event id ");
    var eventid = getURLParameter("q");
    if (eventid != null && eventid !== '') {
        $('#text_event_name').text("Event ID: " + eventid);
    }
});

angular.module('teamform-admin-app', ['firebase'])
    .controller('teamformCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {

        // Initialize $scope.param as an empty JSON object
        $scope.param = {}; //event.{eventid}.admin.param
        $scope.loggedIn = true;

        // Call Firebase initialization code defined in site.js
        initalizeFirebase();

        console.log("get into controller");

        var refPath, ref, eventid; //ref for sqecified event

        eventid = getURLParameter("q");
        console.log("event id : " + eventid)

        // Link and sync a firebase object
        $scope.param = $firebaseObject(firebase.database().ref("events/" + eventid + "/admin/param"));
        $scope.param.$loaded()
            .then(function (data) {
                $scope.param.eventName = data.eventName;
                console.log("loaded: " + $scope.param.eventName);
                console.log("loaded: " + $scope.param);
                $scope.deadline = new Date($scope.param.deadline);
                console.log(new Date($scope.param.deadline));
                $scope.today = new Date();//convert string to date object

                //get waitList
                $scope.waitList = $firebaseArray(firebase.database().ref('events/' + eventid + '/waitlist'));
                $scope.waitList.$loaded().then(function () {
                    //waitListItem key = random, uid
                    //load user data into it
                    $scope.users.$loaded().then(function () {
                        angular.forEach($scope.waitList, function (waitingMember, index) {
                            setTimeout($scope.getUserDatabyID(waitingMember), 0);
                        });
                        $scope.waitList = $scope.waitList;
                        $scope.generate();
                        // Enable the UI when the data is successfully loaded and synchornized
                        $('#team_generator_controller').show();
                    })
                })//end of $loaded of $scope.users
                //end of $loaded of waitList
            })
            .catch(function (error) {
                // Database connection error handling...
                //console.error("Error:", error);
            });

        refPath = "events/" + eventid + "/teams";
        $scope.teams = $firebaseObject(firebase.database().ref(refPath));

        refPath = "events/" + eventid + "/waitlist";
        $scope.waitList = [];
        $scope.waitList = $firebaseArray(firebase.database().ref(refPath));

        //$scope.users is an array of users in firebase
        var usersRef = firebase.database().ref('users');
        $scope.users = $firebaseArray(usersRef);


        $scope.getUserNameInTeam = function (team) {
            var resultName;
            $scope.getUserNameByID(team.teamLeader, function (resultFromCallback) {
                resultName = resultFromCallback;
                // console.log("Leader: getMemberNameByID: " + resultName);
                team.teamLeaderName = resultName;
            })
            angular.forEach(team.members, function (member, key) {
                $scope.getUserNameByID(member.memberID, function (resultFromCallback) {
                    resultName = resultFromCallback;
                    //console.log("Member: getMemberNameByID: "+ resultName);
                    member.memberName = resultName;
                    // console.log("member: " + member.memberID + "\nmember: " + member.memberName);
                    team.memberNames = [];
                    team.memberNames.push(resultName);
                })
                // console.log("team.members: " + team.members+"\nteam.memberNames: " + team.memberNames);
            })
        }

        $scope.getUserDatabyID = function (user) {
            user.name = $scope.users.$getRecord(user.uid).name;
            user.preference = $scope.users.$getRecord(user.uid).language;
            user.team = $scope.users.$getRecord(user.uid).teams[eventid];
            console.log("getUserDatabyID\nname: " + user.name + "\npreference: " + user.preference + "\nteams: " + user.team);
            if (user.team.isJoin && typeof user.role=="undefined") {
                user.role = "waiting";
            } else {
                user.role = user.team.role;
            }
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

        $scope.isValid = function (total, min, max) {
            // check if the number of member is possible to generate team
            // cond0 : if (total /minTeamSize) > minTeamSize > won't fial 
            // cond1 : if (total % maxTeamSize ) + (total / maxTeamSize) * (max-min) < min fail
            // cond1 can cover cond0 (provided by math, if total/min>min then ((total % max ) + (total / max) * (max-min) ) > min
            console.log("isValid: total, min, max: " + total + min + max + "\n" + ((total % max) + (total / max) * (max - min)));
            if (((total % max) + (total / max) * (max - min) < min) && ((total % max) != 0)) {
                return false;
            } else {
                return true;
            }
        }

        $scope.isRangeValid = function (total_min, total_max, min, max) {
            // check if the number of member in range is possible to generate team
            // cond0 : if (total /minTeamSize) > minTeamSize > won't fial 
            // cond1 : if (total % maxTeamSize ) + (total / maxTeamSize) * (max-min) < min fail
            // cond1 can cover cond0 (provided by math, if total/min>min then ((total % max ) + (total / max) * (max-min) ) > min
            if (total_min < 0) { total_min = 0; };
            console.log("range valid\ntotal_min: " + total_min + "\ntotal_max: " + total_max + "\nmin: " + min + "\nmax: " + max);
            console.log("range valid: " + ((total_min % max) + (total_min / max) * (max - min) + (total_max - total_min)));
            if (((total_min % max) + (total_min / max) * (max - min) + (total_max - total_min) < min) &&
                ((total_min % max) != 0)) {
                return false;
            } else {
                return true;
            }
        }

        $scope.generate = function () {
            //let admin to view the generated list and choose to accept or not
            var max = $scope.param.maxTeamSize;
            var min = $scope.param.minTeamSize;

            //get teams and classify to 3 type 1. full 2. Fenough member 3. not enough member
            $scope.teamsFull = {}; numberOfFull = 0;
            $scope.teamsEnough = {}; numberOfEnough = 0;
            $scope.teamsNotEnough = {}; numberOfNotEnough = 0;
            $scope.teams.$loaded().then(function (teamsData) {
                angular.forEach($scope.teams, function (team, index) {
                    var numberOfMemberInTeam = team.members.length + 1;
                    console.log("numberOfMemberInTeam: " + numberOfMemberInTeam);
                    if ((numberOfMemberInTeam) == max) {//plus Leader
                        $scope.teamsFull[index] = team;
                        numberOfFull += numberOfMemberInTeam;
                    } else if (numberOfMemberInTeam >= min) {
                        $scope.teamsEnough[index] = team;
                        numberOfEnough += numberOfMemberInTeam;
                    } else {
                        console.log("index= " + index);
                        // $scope.teamsNotEnough.push({ index: team });
                        $scope.teamsNotEnough[index] = team;
                        numberOfNotEnough += numberOfMemberInTeam;
                    }
                })
                var total = $scope.waitList.length + numberOfFull + numberOfEnough + numberOfNotEnough;
                console.log("total = " + total + "\nwaitlist: " + $scope.waitList.length + "\nnumber of full=" + numberOfFull
                    + "\nnummberofenough: " + numberOfEnough + "\nnumber of not enough: " + numberOfNotEnough);
                if (!$scope.isValid(total, min, max)) {
                    //case 1: It is not possible generate team
                    //e.g.: 3 waitlist, 2team total 5 member, min = 9 
                    console.log("It is not possible to generate team. You may need to modify team size or add/kick some member.");
                    $('#success').hide();
                } else {
                    console.log("It is possible to generate team");
                    if ($scope.waitList.length < ($scope.teamsNotEnough.length * min - numberOfNotEnough)) {
                        console.log("combine team (not done, skipped for now)")
                        // combine teams with not enough member ; name= team1.name + "&"+team2.name
                        // combine big teams first  -preference.size.teamid
                    }
                    // numberOfMemberNeed = $scope.teamsNotEnough * min - numberOfNotEnough = # of member need to fil remaining team
                    // $scope.waitList.length - ($scope.teamsNotEnough * max - numberOfNotEnough) = # of member can be add to remaining team
                    while ($scope.waitList.length < ($scope.teamsNotEnough.length * min - numberOfNotEnough) ||//waiting member is not enough to fill all teams without enough member
                        (($scope.waitList.length > $scope.teamsNotEnough.length * max - numberOfNotEnough + $scope.teamsEnough.length * max - numberOfEnough) && //waitlist is more than space in teams enough + teams not enough
                            !$scope.isRangeValid($scope.waitList.length - ($scope.teamsNotEnough.length * max - numberOfNotEnough) - ($scope.teamsEnough * max - numberOfEnough), //check if the exceed waitlist member can group a teams 
                                $scope.waitList.length - $scope.teamsNotEnough.length * min - numberOfNotEnough, min, max))) {
                        console.log("need to dismiss some teams.")
                        // case 2.2: need to dismiss some team without enough member
                        // TODO: test
                        // dismiss team with less member and check if valid again
                        // if min team size = 1, i.e. only teamleader, dismiss them directly
                        if ($scope.teamsNotEnough.length != 0) {
                            var tmpMinLength = min;
                            angular.forEach($scope.teamsNotEnough, function (team, index) {
                                if (team.length < tmpMinLength) {
                                    tmpMinLength = team.length;
                                }
                            })
                            var keepGoing = true;
                            angular.forEach($scope.teamsNotEnough, function (team, index) {
                                if (tmpMinLength != 1 && keepGoing) {
                                    if (team.length == tmpMinLength) {
                                        $scope.dismissTeam(team, true);//move dismissed member to waitlist
                                        keepGoing = false;
                                        numberOfNotEnough -= tmpMinLength;
                                    }
                                }
                            })
                        } else if ($scope.teamsEnough.length != 0) {//all of team without enough member is dismissed but still cannot generated, need to dismiss some team with enough member 
                            var tmpMinLength = min;
                            angular.forEach($scope.teamsEnough, function (team, index) {
                                if (team.length < tmpMinLength) {
                                    tmpMinLength = team.length;
                                }
                            })
                            var keepGoing = true;
                            angular.forEach($scope.teamsEnough, function (team, index) {
                                if (keepGoing) {
                                    if (team.length == tmpMinLength) {
                                        $scope.dismissTeam(team, true);//move dismissed member to waitlist
                                        keepGoing = false;
                                        numberOfNotEnough -= tmpMinLength;
                                    }
                                }
                            })
                        } else {//all of team that is not full is dismissed but still cannot generate teams
                            var tmpMinLength = min;
                            angular.forEach($scope.teamsFull, function (team, index) {
                                if (team.length < tmpMinLength) {
                                    tmpMinLength = team.length;
                                }
                            })
                            var keepGoing = true;
                            angular.forEach($scope.teamsFull, function (team, index) {
                                if (keepGoing) {
                                    if (team.length == tmpMinLength) {
                                        $scope.dismissTeam(team, true);//move dismissed member to waitlist
                                        keepGoing = false;
                                        numberOfNotEnough -= tmpMinLength;
                                    }
                                }
                            })
                        }
                        console.log("remain teams with not enough member: " + $scope.teamsNotEnough.length);
                    }
                    console.log("generated by fill waiting member to current teams");
                    // e.g. min = 4, max = 4, waitlist = 3, 2 team with 2, 1 member, total 8
                    console.log("make teamsNotEnough to be enough");
                    angular.forEach($scope.teamsNotEnough, function (team, teamid) {
                        if (team.members.length + 1 != min) {
                            //find the best fit index
                            var bestFit = 0;
                            angular.forEach($scope.waitList, function (ppl, uid) {
                                if ($scope.matchPreference(ppl.preference, team.preference) > bestFit) {
                                    bestFit = $scope.matchPreference(ppl.preference, team.preference);
                                }
                            })
                            angular.forEach($scope.waitList, function (ppl, uid) {
                                //console.log("forEach: " + ppl + "\n uid:" + ppl.$id + "\n preference: " + ppl.preference + "\nteam id: " + teamid + "\n preference: " + team.preference);
                                if (team.members.length + 1 != min) {
                                    if ($scope.matchPreference(ppl.preference, team.preference) == bestFit) {
                                        $scope.putMemberToTeams(ppl, team, teamid);
                                    }
                                }
                            })
                        }
                        team.change = "add enough members"
                        $scope.teamsEnough[teamid] = team;
                        delete $scope.teamsNotEnough[teamid];
                    })
                    //$scope.teamsnoteneough is uesless in below code
                    console.log("all current teams have enough member\nwaitlist length: " + $scope.waitList.length + "\nadd remaining waiting ppl to team until the remaining can form team their own");
                    while (!$scope.isValid($scope.waitList.length, min, max)) {
                        //number of waitlist cannot form team by their own, fill some waitlist member to teamsEnough(but not full)
                        console.log("add " + $scope.waitList[0].name + " to best fit team");
                        var bestFit = 0;
                        angular.forEach($scope.teamsEnough, function (team, teamid) {
                            if ($scope.matchPreference(team.preference, $scope.waitList[0].preference) > bestFit) {
                                bestFit = $scope.matchPreference(team.preference, $scope.waitList[0].preference);
                            }
                        })
                        var keepGoing = true;
                        angular.forEach($scope.teamsEnough, function (team, teamid) {
                            if (keepGoing) {
                                if ($scope.matchPreference(team.preference, $scope.waitList[0].preference) == bestFit) {
                                    $scope.putMemberToTeams($scope.waitList[0], team, teamid);
                                    keepGoing = false;
                                    if (team.members.length + 1 == max) {
                                        $scope.teamsFull[teamid] = team;
                                        delete $scope.teamsEnough[teamid];
                                        // $scope.teamsEnough[teamid].remove();
                                        // $scope.teamsEnough.splice(teamid,1);
                                    }
                                }
                            }
                        })
                    }
                    //TODO: form new teams
                    //leader: the one with highest GPA
                    //show the result in list: stated of how team changed
                    //state 0: unchange
                    //state 1: new formed
                    //state 2: dismiss
                    //state 3: add member
                    //state 4: be filled to enough
                    //state 5: combine
                    $('#fail').hide();
                    // admin can view the list and confirm
                }
            })
        }

        $scope.matchPreference = function (pre1, pre2) {
            value = 0;
            angular.forEach(pre1, function (pre11) {
                angular.forEach(pre2, function (pre22) {
                    if (pre11 == pre22)
                    { value += 1; }
                })
            })
            return value;
        }

        $scope.putMemberToTeams = function (ppl, team, teamid) {
            console.log("put member " + ppl.uid + " to team " + team.teamName+"\nteamid: "+teamid);
            team.members.push({ "memberID": ppl.uid });

            ppl.role = "member";
            ppl.team = teamid;
            console.log("member role: " + ppl.role + "\nteamid: " + ppl.team);
            $scope.users.$getRecord(ppl.uid).teams[eventid].role = "member";
            $scope.users.$getRecord(ppl.uid).teams[eventid].team = teamid;
            console.log("member team: " + $scope.users.$getRecord(ppl.uid).teams[eventid].team + "\nteamid: " + teamid);

            //remove ppl in waitlist
            console.log("waitlist ppl $id: " + ppl.$id + "\n" + $scope.waitList.$getRecord(ppl.$id).uid);//uid=uid; $id=index in firebase array
            delete ppl;
            $scope.waitList.splice(ppl.$id, 1);
            $scope.getUserNameInTeam(team);
            console.log("waitlist: " + $scope.waitList + "\nlenght: " + $scope.waitList.length);
            team.change = "add new member(s)";
            //not confirmed so not saved into userRef
        }

        $scope.confirm = function () {
            //admin click confirm -> save this data to firebase
            //teams in event
            angular.forEach($scope.teamsEnough, function (team, teamid) {
                $scope.teams[teamid] = team;
            })
            angular.forEach($scope.teamsFull, function (team, teamid) {
                $scope.teams[teamid] = team;
            })
            angular.forEach($scope.teamsDelete, function (team, teamid) {
                $scope.teams[teamid] = team;
            })
            $scope.teams.$save();
            //save teams and roles in users
            $scope.users.$save();
            angular.forEach($scope.users, function (user, uid) {
                $scope.users.$save(uid);
            })
            //delete waitlist
            $firebaseObject(firebase.database().ref("events/" + eventid + "/waitlist")).$remove();
            var url = "admin.html?q=" + eventid;
            window.location.href = url;
        }

        $scope.dismissTeam = function (teams, team, moveToWaitList) {
            var teamName = team.teamName;
            var teamid = team.$id;
            //not confirmed, won't remove role in here
            //if moveToWaitList is true, save to events/eventid/waitList
            if (moveToWaitList) {
                //waitList should be already loaded
                $scope.waitList.add({ "uid": team.teamLeader });
                angular.forEach(team.members, function (member, index) {
                    $scope.waitList.add({ "uid": member.memberID });
                })
            }
            //second, del all data of this team
            team.change = "deleted";
            $scope.teamsDelete[team.$id] = team;
            $teams.splice(team.$id, 1);
            console.log("team " + teamName + " is dismiss. ")
        }

        $scope.return = function () {
            var url = "admin.html?q=" + eventid;
            window.location.href = url;
        }

        $scope.scrollToTop = function () {
            $window.scrollTo(0, 0);
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
                eventid = getURLParameter("q");
                refPath = "events/" + eventid + "/admin/param";
                ref = firebase.database().ref(refPath);
                $scope.param = $firebaseObject(ref);
                $scope.param.$loaded().then(function (data) {
                    if ($scope.param.admin != user.uid) {//check if user is admin of this event
                        console.log('admin: ' + $scope.param.admin + ', user: ' + user.uid);
                        console.log('not admin');
                        $window.alert("Permission Denied. \n You are not admin of this event")
                        $window.location.href = '/index.html';
                    }
                })

            } else {
                console.log('not log in');
                $window.location.href = '/index.html';
            }
        })
    }]);