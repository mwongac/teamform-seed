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
            user.gpa = $scope.users.$getRecord(user.uid).gpa;
            console.log("getUserDatabyID\nname: " + user.name + "\npreference: " + user.preference + "\nteams: " + user.team);
            if (user.team.isJoin && typeof user.role == "undefined") {
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
            $scope.teamsDelete = {};//dismissed team
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
                    console.log("check dismiss\nwaitList.length: " + $scope.waitList.length +
                        "\nteamsnotenough.length: " + $scope.teamsNotEnough.length + "\nnumber of not enough: " + numberOfNotEnough +
                        "\nneed: " + ($scope.teamsNotEnough.length * min - numberOfNotEnough) +
                        "\nobject.key" + Object.keys($scope.teamsNotEnough).length);
                    while ($scope.waitList.length < (Object.keys($scope.teamsNotEnough).length * min - numberOfNotEnough) ||//waiting member is not enough to fill all teams without enough member
                        (($scope.waitList.length > Object.keys($scope.teamsNotEnough).length * max - numberOfNotEnough + Object.keys($scope.teamsEnough).length * max - numberOfEnough) && //waitlist is more than space in teams enough + teams not enough
                            !$scope.isRangeValid($scope.waitList.length - (Object.keys($scope.teamsNotEnough).length * max - numberOfNotEnough) - (Object.keys($scope.teamsEnough).length * max - numberOfEnough), //check if the exceed waitlist member can group a teams 
                                $scope.waitList.length - Object.keys($scope.teamsNotEnough).length * min - numberOfNotEnough, min, max))) {
                        console.log("need to dismiss some teams.");
                        // case 2.2: need to dismiss some team without enough member
                        // dismiss team with less member and check if valid again
                        // if min team size = 1, i.e. only teamleader, dismiss them directly
                        if (Object.keys($scope.teamsNotEnough).length != 0) {
                            var tmpMinLength = min;
                            angular.forEach($scope.teamsNotEnough, function (team, index) {
                                if (team.members.length + 1 < tmpMinLength) {
                                    tmpMinLength = team.members.length + 1;
                                }
                            })
                            var keepGoing = true;
                            angular.forEach($scope.teamsNotEnough, function (team, index) {
                                if (tmpMinLength != 1 && keepGoing) {
                                    if (team.members.length + 1 == tmpMinLength) {
                                        $scope.dismissTeam($scope.teamsNotEnough, team, index, true);//move dismissed member to waitlist
                                        keepGoing = false;
                                        numberOfNotEnough -= tmpMinLength;
                                    }
                                }
                            })
                        } else if (Object.keys($scope.teamsEnough).length != 0) {//all of team without enough member is dismissed but still cannot generated, need to dismiss some team with enough member 
                            var tmpMinLength = max;
                            angular.forEach($scope.teamsEnough, function (team, index) {
                                if (team.members.length + 1 < tmpMinLength) {
                                    tmpMinLength = team.members.length + 1;
                                }
                            })
                            var keepGoing = true;
                            angular.forEach($scope.teamsEnough, function (team, index) {
                                if (keepGoing) {
                                    if (team.members.length + 1 == tmpMinLength) {
                                        $scope.dismissTeam($scope.teamsEnough, team, index, true);//move dismissed member to waitlist
                                        keepGoing = false;
                                        numberOfNotEnough -= tmpMinLength;
                                    }
                                }
                            })
                        } else {//all of team that is not full is dismissed but still cannot generate teams
                            var keepGoing = true;
                            angular.forEach($scope.teamsFull, function (team, index) {
                                if (keepGoing) {
                                    numberOfNotEnough -= (team.members.length + 1);
                                    $scope.dismissTeam($scope.teamsFull, team, index, true);//move dismissed member to waitlist
                                    keepGoing = false;
                                }
                            })
                        }
                        console.log("remain teams with not enough member: " + $scope.teamsNotEnough.length);
                    }//end of dismiss team
                    $scope.newMemberList = $scope.waitList;//for later check if new member and show in html TODO
                    console.log("generated by fill waiting member to current teams\nmake teamsNotEnough to be enough");
                    // e.g. min = 4, max = 4, waitlist = 3, 2 team with 2, 1 member, total 8
                    angular.forEach($scope.teamsNotEnough, function (team, teamid) {
                        while (team.members.length + 1 < min) {
                            //find the best fit index
                            var bestFit = 0;
                            angular.forEach($scope.waitList, function (ppl, uid) {
                                if ($scope.matchPreference(ppl.preference, team.preference) > bestFit) {
                                    bestFit = $scope.matchPreference(ppl.preference, team.preference);
                                }
                            })
                            for (i = 0; i < $scope.waitList.length;) {
                                //console.log("forEach: " + ppl + "\n uid:" + ppl.$id + "\n preference: " + ppl.preference + "\nteam id: " + teamid + "\n preference: " + team.preference);
                                ppl = $scope.waitList[i];
                                if (team.members.length + 1 < min) {
                                    if ($scope.matchPreference(ppl.preference, team.preference) == bestFit) {
                                        $scope.putMemberToTeams(ppl, team, teamid);
                                    } else {
                                        i += 1;
                                    }
                                } else {
                                    break;
                                }
                            }
                            // angular.forEach($scope.waitList, function (ppl, uid) {
                            //     //console.log("forEach: " + ppl + "\n uid:" + ppl.$id + "\n preference: " + ppl.preference + "\nteam id: " + teamid + "\n preference: " + team.preference);
                            //     if (team.members.length + 1 < min) {
                            //         if ($scope.matchPreference(ppl.preference, team.preference) == bestFit) {
                            //             $scope.putMemberToTeams(ppl, team, teamid);
                            //         }
                            //     }
                            // })
                        }
                        team.change = "add enough members"
                        if (team.members.length + 1 < max) {
                            $scope.teamsEnough[teamid] = team;
                        } else {
                            $scope.teamsFull[teamid] = team;
                        }
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
                                    }
                                }
                            }
                        })
                    }//end of adding member to existed teams
                    console.log("create new teams\n$scope.waitList.length: " + $scope.waitList.length);
                    //form new teams
                    while ($scope.waitList.length != 0 && $scope.waitList.length >= min) {
                        console.log("create team");
                        //     //form one team with most popular preference with min members
                        //     //search best fit preference
                        var preferenceMatch = {};
                        angular.forEach($scope.waitList, function (ppl, index) {
                            angular.forEach(ppl.preference, function (pre, preIndex) {
                                if (typeof preferenceMatch[pre] == "undefined") {
                                    preferenceMatch[pre] = 1;
                                } else {
                                    preferenceMatch[pre] += 1;
                                }
                            })
                        })
                        var maxCount = 0; var bestFit = "";
                        angular.forEach(preferenceMatch, function (count, pre) {
                            if (count > maxCount) {
                                maxCount = count;
                                bestFit = pre;
                            }
                        })
                        //create empty new team
                        var newTeamid = firebase.database().ref("events/" + eventid + "/teams/").push().key;
                        var teamObject = {};
                        teamObject.teamName = "team of " + bestFit;
                        teamObject.members = [];
                        teamObject.preference = [bestFit];
                        var highestGpa = 0;
                        //move everyone to member
                        {
                            for (index = 0; index < $scope.waitList.length;) {
                                //don't use forEach since item in waitlist will be removed and the lenght will be decreased but the pointer won't decrease 
                                ppl = $scope.waitList[index];
                                // console.log("in for loop,  uid: " + ppl.uid + "\nlenght: " + $scope.waitList.length + "\nindex: " + index);
                                if (teamObject.members.length < min && $scope.matchPreference(ppl.preference, [bestFit])) {
                                    if (ppl.gpa > highestGpa) {
                                        highestGpa = ppl.gpa;
                                    }
                                    $scope.putMemberToTeams(ppl, teamObject, newTeamid);
                                } else {
                                    index = index + 1;
                                }
                            }
                        }
                        while (teamObject.members.length < min) {
                            //i.e. member with same preference is not enough to fill this team
                            //then add member without check preference
                            for (index = 0; index < $scope.waitList.length;) {
                                //don't use forEach since item in waitlist will be removed and the lenght will be decreased but the pointer won't decrease 
                                ppl = $scope.waitList[index];
                                // console.log("in for loop,  uid: " + ppl.uid + "\nlenght: " + $scope.waitList.length + "\nindex: " + index);
                                if (teamObject.members.length < min) {
                                    if (ppl.gpa > highestGpa) {
                                        highestGpa = ppl.gpa;
                                    }
                                    $scope.putMemberToTeams(ppl, teamObject, newTeamid);
                                } else {
                                    break;//enough member
                                }
                            }
                        }
                        //find the member with highest GPA and become leader 
                        var keepGoing = true;
                        angular.forEach(teamObject.members, function (member, index) {
                            console.log("test: \n member uid: " + member.memberID + "\ngpa: " + member.gpa);
                            if (keepGoing && member.gpa == highestGpa) {
                                console.log(member.uid + " become leader");
                                teamObject.teamLeader = member.memberID;
                                teamObject.teamLeaderName = member.memberName;

                                $scope.users.$getRecord(teamObject.teamLeader).teams[eventid].role = "leader";

                                console.log(teamObject.teamLeader);
                                teamObject.members.splice(index, 1);
                                keepGoing = false;
                            }
                        })
                        teamObject.change = "new form";
                        console.log("teamObject: " + teamObject.teamName);
                        $scope.teamsEnough[newTeamid] = teamObject;
                        console.log("craete new team " + $scope.teamsEnough[newTeamid].teamName);
                        if (teamObject.members.length + 1 == max) {
                            $scope.teamsFull[newTeamid] = team;
                            delete $scope.teamsEnough[newTeamid];
                        }
                    }//end of create new enough team
                    //put remaining ppl into teams
                    while ($scope.waitList.length != 0) {
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
                                    }
                                }
                            }
                        })
                    }//end of adding remaining waitlist member to existed teams

                    //show the result in list: stated of how team changed
                    //state 0: unchange
                    //state 1: new formed
                    //state 2: dismiss
                    //state 3: add member
                    //state 4: be filled to enough
                    //state 5: combine
                    $('#fail').hide();
                    var load_screen = document.getElementById("load_screen");
                    document.body.removeChild(load_screen);
                    // admin can view the list and confirm
                }//end of possible to generate team
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
            console.log("put member " + ppl.uid + " to team " + team.teamName + "\nteamid: " + teamid);
            team.members.push({ "memberID": ppl.uid, "gpa": ppl.gpa, "memberName": ppl.name , "newAdded" :true});

            ppl.role = "member";
            ppl.team = teamid;
            // console.log("member role: " + ppl.role + "\nteamid: " + ppl.team);
            $scope.users.$getRecord(ppl.uid).teams[eventid].role = "member";
            $scope.users.$getRecord(ppl.uid).teams[eventid].teamid = teamid;
            // console.log("member team: " + $scope.users.$getRecord(ppl.uid).teams[eventid].team + "\nteamid: " + teamid);

            //remove ppl in waitlist
            // console.log("waitlist ppl $id: " + ppl.$id + "\n" + $scope.waitList.$getRecord(ppl.$id).uid);//uid=uid; $id=index in firebase array
            delete ppl;
            $scope.waitList.splice(ppl.$id, 1);
            $scope.getUserNameInTeam(team);
            // console.log("waitlist: " + $scope.waitList + "\nlenght: " + $scope.waitList.length);
            if (typeof team.change == "undefined" || team.change == "unchanged") {
                team.change = "add new member(s)";
            }
            //not confirmed so not saved into userRef
        }

        $scope.confirm = function () {
            //admin click confirm -> save this data to firebase
            console.log("start of confirm\n");

            try {
                //save teams in event
                angular.forEach($scope.teamsEnough, function (team, teamid) {
                    angular.forEach(team.members, function (member, index) {
                        delete member.gpa;
                        delete member.name;
                        delete member.preference;
                        delete member.newAdded;
                    })
                    $scope.teams[teamid] = team;
                    $scope.teams[teamid].members = team.members;
                    $scope.teams.$save(teamid).then(function (ref) {
                        console.log(team.teamName + "Saved !");

                    }, function (error) {
                        console.log(team.teamName + "Error:", error);
                    });
                })
                angular.forEach($scope.teamsFull, function (team, teamid) {
                    angular.forEach(team.members, function (member, index) {
                        delete member.gpa;
                        delete member.name;
                        delete member.preference;
                        delete member.newAdded;
                    })
                    $scope.teams[teamid] = team;
                    $scope.teams[teamid].members = team.members;
                    $scope.teams.$save(teamid).then(function (ref) {
                        console.log(team.teamName + "Saved !");

                    }, function (error) {
                        console.log(team.teamName + "Error:", error);
                    });
                })
                $scope.teams.$save();
                angular.forEach($scope.teamsDelete, function (team, teamid) {
                    // delete $scope.teams[teamid];
                    $firebaseObject(firebase.database().ref("events/" + eventid + "/teams/" + teamid)).$remove();
                })
            } catch (err) {
                console.log(err.message);
            }

            //save teams and roles in users
            $scope.users.$save();
            angular.forEach($scope.users, function (user, uid) {
                $scope.users.$save(uid);
            })

            //delete waitlist
            $firebaseObject(firebase.database().ref("events/" + eventid + "/waitlist")).$remove().then(function (data) {
                var url = "admin.html?q=" + eventid;
                if (confirm("Result of smart generator is saved. Do you want to jump to admin page?")) {
                    window.location.href = url;
                } else {
                    window.location.href = "index.html";
                }
                console.log("confimed, saved.");
            })
        }

        $scope.dismissTeam = function (teams, team, teamid, moveToWaitList) {
            var teamName = team.teamName;
            // var teamid = team.$id;
            //not confirmed, won't remove role in here
            //if moveToWaitList is true, save to events/eventid/waitList
            if (moveToWaitList) {
                //waitList should be already loaded
                var leaderKey = $scope.waitList.push({ "uid": team.teamLeader }).key;
                $scope.waitList[leaderKey] = { "uid": team.teamLeader };
                setTimeout($scope.getUserDatabyID($scope.waitList[leaderKey]), 0);
                // $scope.waitList.add({ "uid": team.teamLeader });
                angular.forEach(team.members, function (member, index) {
                    var memberKey = $scope.waitList.push({ "uid": member.memberID }).key;
                    setTimeout($scope.getUserDatabyID($scope.waitList[memberKey]), 0);
                })
            }
            //second, del all data of this team
            team.change = "dismiss";
            $scope.teamsDelete[teamid] = team;
            // teams.splice(teamid, 1);
            delete teams[teamid];
            console.log("team " + teamName + " is dismiss. ")
        }

        $scope.return = function () {
            var url = "admin.html?q=" + eventid;
            window.location.href = url;
            // console.log("Object.keys(teamsDelete).length: "+Object.keys($scope.teamsDelete).length);
        }

        $scope.isTeamObjectEmpty = function (teams) {
            if (typeof teams == "undefined") {
                return true;
            }
            if (Object.keys(teams).length == 0) {
                return true;
            } else {
                return false;
            }
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