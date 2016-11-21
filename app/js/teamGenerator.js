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
                // // Fill in some initial values when the DB entry doesn't exist
                $scope.param.eventName = data.eventName;
                console.log("loaded: " + $scope.param.eventName);
                console.log("loaded: " + $scope.param);
                $scope.deadline = new Date($scope.param.deadline);
                console.log(new Date($scope.param.deadline));
                $scope.today = new Date();
                $scope.generate();
                // Enable the UI when the data is successfully loaded and synchornized
                $('#team_generator_controller').show();
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
        //$scope.waitList.$loaded();

        //$scope.users is an array of users in firebase
        var usersRef = firebase.database().ref('users');
        $scope.users = $firebaseArray(usersRef);


        $scope.getUserNameInTeam = function (team) {
            var resultName;
            console.log("getUserNameInTeam for team" + team);
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
                console.log("team.members: " + team.members);
                console.log("team.memberNames: " + team.memberNames);
            })
        }

        $scope.getUserDatabyID = function (user) {
            var userRef = firebase.database().ref('users/' + user.uid);
            var userData = $firebaseObject(userRef);
            userData.$loaded()
                .then(function (data) {
                    user.name = data.name;
                    user.preference = data.preference;
                    var teamRef = firebase.database().ref('users/' + user.uid + '/teams/' + eventid)
                    user.team = $firebaseObject(teamRef);
                    user.team.$loaded().then(function (eventData) {
                        if (eventData.isJoin) {
                            user.role = "waiting";
                        } else {
                            user.role = eventData.role;
                        }
                    })
                })
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
            console.log("isValid: total, min, max: " + total + min + max);
            if (((total % max) + (total / max) * (max - min) < min) && (((total % max) + (total / max) * (max - min)) > 0)) {
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
                (((total_min % max) + (total_min / max) * (max - min)) > 0)) {
                return false;
            } else {
                return true;
            }
        }

        $scope.generate = function () {
            //TODO: let admin to view the generated list and choose to accept or not
            var max = $scope.param.maxTeamSize;
            var min = $scope.param.minTeamSize;
            //get waitList
            $scope.waitList = $firebaseArray(firebase.database().ref('events/' + eventid + '/waitlist'));
            $scope.waitList.$loaded().then(function () {
                //waitListItem key = random, uid
                //load user data into it
                angular.forEach($scope.waitList, function (waitingMember, index) {
                    $scope.getUserDatabyID(waitingMember);
                })
            })
            //get teams and classify to 3 type 1. full 2. Fenough member 3. not enough member
            $scope.teamsFull = {}; numberOfFull = 0;
            $scope.teamsEnough = {}; numberOfEnough = 0;
            $scope.teamsNotEnough = {}; numberOfNotEnough = 0;
            $scope.teams.$loaded().then(function (teamsData) {
                angular.forEach($scope.teams, function (team, index) {
                    var numberOfMemberInTeam = team.members.length + 1;
                    if ((numberOfMemberInTeam) == $scope.param.maxTeamSize) {//plus Leader
                        $scope.teamsFull.push({ index: team });

                        numberOfFull += numberOfMemberInTeam;
                    } else if (numberOfMemberInTeam > min) {
                        $scope.teamsEnough.push({ index: team });
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
                    // dismiss team with no member and put to waitlist
                    // combine teams with not enough member ; name= team1.name + "&"+team2.name
                    // combine big teams first  -preference.size.teamid


                    console.log("It is possible to generate team");
                    if ($scope.isValid($scope.waitList.length + numberOfNotEnough, min, max)) {
                        console.log("case2: generate teams without dismiss any teams with enough members.");
                        //case 2: Can generate team just by waitList and team that have not enough member
                        //numberOfMemberNeed = $scope.teamsNotEnough * min - numberOfNotEnough = # of member need to fil remaining team
                        //$scope.waitList.length - ($scope.teamsNotEnough * max - numberOfNotEnough) = # of member can be add to remaining team
                        while ($scope.waitList.length < ($scope.teamsNotEnough.length * min - numberOfNotEnough) ||//waiting member is not enough to fill all teams without enough member
                            (($scope.waitList.length > $scope.teamsNotEnough.length * max - numberOfNotEnough + $scope.teamsEnough.length * max - numberOfEnough) && //waitlist is more than space in teams enough + teams not enough
                                !$scope.isRangeValid($scope.waitList.length - ($scope.teamsNotEnough.length * max - numberOfNotEnough) - ($scope.teamsEnough * max - numberOfEnough), //check if the exceed waitlist member can group a teams 
                                    $scope.waitList.length - $scope.teamsNotEnough.length * min - numberOfNotEnough, min, max))) {
                            console.log("need to dismiss some teams.")
                            // case 2.2: need to dismiss some team without enough member
                            // TODO:
                            // dismiss team with less member and check if valid again
                            // if min team size =1, i.e. only teamleader, dismiss them directly 
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
                                        $scope.dissmissTeam(team, true);//move dismissed member to waitlist
                                        keepGoing = false;
                                        numberOfNotEnough -= tmpMinLength;
                                    }
                                }
                            })
                            console.log("remain teams with not enough member: " + $scope.teamsNotEnough.length);
                        }
                        console.log("case 2.1: generated by fill waiting member to current teams");
                        // e.g. min = 4, max = 4, waitlist = 3, 2 team with 2, 1 member, total 8
                        $scope.putMemberToTeams($scope.waitList, $scope.teamsNotEnough, min);
                        // case 2.1: don't need to dismiss any team (or 2.2->dismiss some team to waitlist and success)
                    } else if ($scope.isValid($scope.waitList.length + numberOfEnough + numberOfNotEnough, min, max)) {
                        console.log("case 3");
                        // do it need to dismiss some team?
                    } else {
                        console.log("case 4")
                        //must dismiss some full team 
                    }
                    $('#fail').hide();

                    //case 2: have to dimiss some of full team
                    //case 2: have to dimiss some of enough team
                }

            })

            //last case: have to dimiss some of full team
            // } else if (total2) {//type 3 + waitlist enought to can generate new team 

            // } else if (total3) {
            //question: who be the leader in new team? -> GPA!
            //case2 : no ppl in waitlist
            //case3 : don't need to dismiss current team

            //find team that member less than minTeamSize
            //put user without team who have responding preference into above team
            //random put remaining user into teams

            //jump to new page for confirm
            //view list : stated how the team changed, e.g. add new member, new team 
            // }
        }


        $scope.dismissTeam = function (teams, team, moveToWaitList) {
            var teamName = team.teamName;
            var teamid = team.$id;
            //not comfirmed, won't remove role in here
            //if moveToWaitList is true, save to events/eventid/waitList
            if (moveToWaitList) {
                //waitList should be already loaded
                $scope.waitList.$add({ "uid": team.teamLeader });
                angular.forEach(team.members, function (member, index) {
                    $scope.waitList.$add({ "uid": member.memberID });
                })
            }
            //second, del all data of this team
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