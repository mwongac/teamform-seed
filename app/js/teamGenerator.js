$(document).ready(function () {

    $('#team_generator_controller').hide();
    $('#text_event_name').text("Error: Invalid event id ");
    var eventid = getURLParameter("q");
    if (eventid != null && eventid !== '') {
        $('#text_event_name').text("Event ID: " + eventid);
    }
});

angular.module('teamform-admin-app', ['firebase'])
    .controller('AdminCtrl', ['$scope', '$firebaseObject', '$firebaseArray', '$window', function ($scope, $firebaseObject, $firebaseArray, $window) {

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
                console.log("loaded: " + $scope.param.eventName);
                console.log("loaded: " + $scope.param);
                $scope.deadline = new Date($scope.param.deadline);
                console.log(new Date($scope.param.deadline));
                $scope.today = new Date();
                // Enable the UI when the data is successfully loaded and synchornized
                $('#team_generator_controller').show();
            })
            .catch(function (error) {
                // Database connection error handling...
                //console.error("Error:", error);
            });

        refPath = "events/" + eventid + "/teams";
        $scope.teams = [];
        $scope.teams = $firebaseArray(firebase.database().ref(refPath));

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
            // var resultName;
            // console.log("getUserDatabyID for " + user);
            // $scope.getUserNameByID(user.uid, function (resultFromCallback) {
            //     user.name = resultFromCallback;
            //     console.log("Leader: getMemberNameByID: " + user.name);
            // })
            // var userPreference = $firebaseObject(firebase.database().ref('users/' + user.uid + '/language'));
            // userPreference.$loaded()
            //     .then(function (data) {
            //         user.preference = userPreference;
            //         console.log("user.preference" + user.preference);
            //     })
            // var userPreference = $firebaseObject(firebase.database().ref('users/' + user.uid + '/language'));
            // userPreference.$loaded()
            //     .then(function (data) {
            //         user.preference = userPreference;
            //         console.log("user.preference" + user.preference);
            //         angular.forEach(user.preference, function (p) {
            //             console.log("preference?" + p);
            //         })
            //     })
            var userRef = firebase.database().ref('users/' + userid);
            var userData = $firebaseObject(userRef);
            userData.$loaded()
                .then(function (data) {
                    user.name = data.name;
                    user.preference = data.preference;
                    user.team = data.teams.eventid.teamName;
                    if (user.isJoin) { user.role = "waiting" } else {
                        user.role = data.role;
                    }
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

        $scope.generate = function () {//TODO: let admin to view the generated list and choose to accept or not
            //jump to generateTeam page since The view can be complate depend on number of members and team size
            //get waitList
            //get teams and classify to 3 type 1. full 2. Fenough member 3. not enough member
            //total = total number of ppl include inside teams and outside teams
            //total2 = total number of type 3 + waitlist
            //total3 = total number of type 2 + 3 + waitlist
            $scope.teams.$loaded().then(function (teamsData) {
                angular.forEach($scope.teams, function (team, index) {
                    if (team.member.length ==){

                    }
                })
            })


            //last case: have to dimiss some of full team
            //case1 : cannot generate
            if ((total % maxTeamSize) + (total / maxTeamSize) * (maxTeamSize - minTeamSize) < minTeamSize) {
                //cond0 : if (total /minTeamSize) > minTeamSize > won't fial 
                //cond1 : if (total % maxTeamSize ) + (total / maxTeamSize) * (max-min) < min fail
                // cond1 can cover cond0 (provided by calculation, if total/min>min then ((total % max ) + (total / max) * (max-min) ) > min
                $window.alert("It is not possible to generate team. You may need to modify team size or add/kick some member.")
            } else if (total2 .....){//type 3 + waitlist enought to can generate new team 

}else if (total3)
    //question: who be the leader in new team? -> GPA!
    //case2 : no ppl in waitlist
    //case3 : don't need to dismiss current team

    //find team that member less than minTeamSize
    //put user without team who have responding preference into above team
    //random put remaining user into teams
    $window.alert("TODO: waiting for teams ");
            //jump to new page for confirm
            //view list : stated how the team changed, e.g. add new member, new team 
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