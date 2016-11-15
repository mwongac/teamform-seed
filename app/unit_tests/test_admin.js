describe('Admin app', function() {

    var $scope, $controller, $window, $firebaseArray, $firebaseObject;

    beforeEach(function(){
        // angular.mock.module('teamform-admin-app','firebase');
        module('teamform-admin-app');
    });
   
   describe('admin ctrl: only common function without firebase Coverage Test', function() {
       var controller;
        beforeEach(function(){
            inject(function(_$controller_, _$firebaseObject_, _$firebaseArray_){
            // inject(function(_$controller_){
                $firebaseObject=_$firebaseObject_;
                $firebaseArray=_$firebaseArray_;
                $controller=_$controller_;
            })
        });

        it('1', function(){
            $scope = {};
            controller = 
                $controller('AdminCtrl',{$scope: $scope, $firebaseObject: $firebaseObject, $firebaseArray: $firebaseArray});
                
            expect(typeof $scope.new_announcement_click).toBe('function');
            expect(typeof $scope.getUserNameByID).toBe('function');
            
        })

        it('editable',function(){
            $scope.new_announcement_click();
            expect($scope.writingAnnouncement).toBe(true);
        })

        it('maxTeamSize', function(){
            $scope.param.maxTeamSize = 10;
            $scope.param.minTeamSize = 3;
            $scope.changeMinTeamSize(2);
            expect($scope.param.minTeamSize).toEqual(5);
            $scope.param.maxTeamSize = 4;
            $scope.param.minTeamSize = 3;
            $scope.changeMinTeamSize(2);
            expect($scope.param.minTeamSize).toEqual(3);
            //Peter: won't change min if new value exceed max
        })

        it('minTeamSize',function(){
            $scope.param.maxTeamSize = 10;
            $scope.param.minTeamSize = 3;
            $scope.changeMaxTeamSize(-2);
            expect($scope.param.maxTeamSize).toEqual(8);
            
            $scope.param.maxTeamSize = 10;
            $scope.param.minTeamSize = 9;
            $scope.changeMaxTeamSize(-2);
            expect($scope.param.maxTeamSize).toEqual(10);
            //Peter: won't change max if new vaule below min
        })

        it('isEventExist of admin (it will skip the event object with same event id)', function() {
            eventid="NFAOEIRMOWIFJAWOI";
            $scope.isEventExist("jfklasdjf", function(result) {
                expect(result).toBe(false);
            });
            $scope.isEventExist("abc", function(result) {
                expect(result).toBe(true);
            });
        });

   });


});