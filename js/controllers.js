
'use strict';

/* Controllers */


//MAIN CONTROLLER
loanProfileApp.controller('MainController', function($scope, $rootScope, $location, LoanProfileService){
    $scope.profiles = $scope.profiles || LoanProfileService.loadProfiles();
    //$scope.$route = $scope.$route || $route;
    $scope.$location = $scope.$location || $location;
    //This is strictly for copyright, keeps year current
    $scope.currentYear = $scope.currentYear || (new Date()).getFullYear();
    //Will use this for the cancel button on the "New Profile" form.  
    //If I have a last path, then I'll nav to it with history.back(), if not I'll just go home, 
    //as I can't be sure their last path was my site
    $scope.lastURL = {path:undefined};

    //Miantains state on my nav items so that I can have active classes automatically
    $scope.navItems = {
        home: false,
        newProfile: false,
        yourProfiles: false,
        update: function(activeItemName){
            for(var prop in this){
                if(prop === activeItemName)
                    this[prop] = true;
                else if(typeof this[prop] !== 'object' && typeof this[prop] !== 'function')//Don't want to overwrite objects or functions
                    this[prop] = false;
            }
        }
    };

    //Both Home and Profile-List use the MainController controller. 
    //Need to set the navItems appropriately.
    //Fortunately, it's super easy to test this with the RegExp objects.
    //We just need to add a watcher for the $route changing event, however add it to the $rootScope so it fires for all controllers.
    $rootScope.$on('$locationChangeStart', function(ngEvent, nextPath, currentPath){
        $scope.lastURL.path = currentPath;

        if(/home/.test(nextPath))
            $scope.navItems.update('home');
        if(/profile-list/.test(nextPath))
            $scope.navItems.update('yourProfiles');
        if(/new/.test(nextPath))
            $scope.navItems.update('newProfile');
    });

    //Model of Loan Term Types, initially declared in the StandardLoanProfile script
    $scope.loanTermTypes = $scope.loanTermTypes || loanTermTypes;

    $scope.viewProfileDetails = function(profileId){
        $scope.$location.path('/profile-details/' + profileId);
    };

    $scope.getProfileById = function(profileId){
        if(!$scope.profiles)
            $scope.profiles = LoanProfileService.loadProfiles();


        for (var i = $scope.profiles.length - 1; i >= 0; i--) {
            if($scope.profiles[i].id === parseInt(profileId)){
                //If we were to just slice the array, we'd get reference values
                //this means that changes in the product object affect the source object.
                //I don't want this, so I'm using the cast method to turn the values from the source object
                //into a brand new StandardLoanProfile
                return Object.cast($scope.profiles[i], StandardLoanProfile);
            }
        };
        return undefined;
    };

    $scope.deleteProfile = function(profileID){
        for (var i = $scope.profiles.length - 1; i >= 0; i--) {
            if($scope.profiles[i].id === profileID){
                $scope.profiles.splice(i,1);
                LoanProfileService.saveAllProfiles($scope.profiles);
            }
        };
    };
});

//NEW PROFILE CONTROLLER
loanProfileApp.controller('NewLoanProfileController', function($scope, $route, LoanProfileService){
    /*
        The controller will interact with creating of Loan Profiles
    */
    var newProfileID = $scope.profiles.sort(function(p1,p2)
                        {
                            return p1.id - p2.id;
                        })[$scope.profiles.length-1].id + 1;//Get max ID and add 1 to it
    //ViewModel to easily interact with the View.  Will have to convert this to a new instance of a StandardLoanProfile.    
    $scope.newLoanProfile = {
        name: "",
        description: "",
        loanAmount: "",
        interestRate: "",
        loanTerm: 30,
        loanTermType: "Years",
        firstPaymentDate: new Date()
    }

    $scope.createProfile = function(){
        var model = $scope.newLoanProfile,
            newProfile = new StandardLoanProfile(model.name, newProfileID);

        newProfile.description = model.description;
        newProfile.loanScenario.loanAmt = parseFloat(model.loanAmount).toFixed(2);
        newProfile.loanScenario.interestRate = parseFloat(model.interestRate).toFixed(3);
        newProfile.loanScenario.loanTerm = parseInt(model.loanTerm);
        newProfile.loanScenario.loanTermType = model.loanTermType;
        newProfile.loanScenario.firstPaymentDate = new Date(model.firstPaymentDate);

        try{            
            newProfile.buildSchedule();
            $scope.profiles.push(newProfile);
            LoanProfileService.saveAllProfiles($scope.profiles);
            $scope.$location.path('/profile-details/' + newProfileID);
        } catch (error) {
            alert(error.message);
        }        
    };

    $scope.cancelCreateProfile = function(){
        //Just want to go back to the prior page if we have a lastURL logged that isn't the New Profile page, otherwise go home
        if($scope.lastURL.path && !/new/.test($scope.lastURL.path))
            history.back();
        else
            $scope.$location.path('/');
    };
});

//PROFILE EDIT/DETAILS CONTROLLER
loanProfileApp.controller('ProfileDetailsController', function($scope, $routeParams, $timeout, LoanProfileService){
    //NOTE: DO NOT do binding in angular with primitive types.  It doesn't like this - it likes using actual objects.
    //For instnace, I could've said $scope.editMode and $scope.addRXPMode individually, but having them as primitive "bool" types causes flaky behaviour.
    //See http://stackoverflow.com/questions/15133561/angular-two-way-binding-with-sub-elements
    $scope.crudModes = {
        editScenarioMode: false,//To do with profile as a whole
        addRXPMode: false//To do with adding a new RXP
    };
    $scope.recurringExtraPayment = {startYear:undefined, startMonth:undefined, endYear:undefined, endMonth:undefined, amount:undefined};//Model for adding new RXP
    $scope.startMonthNames = [];
    $scope.endMonthNames = [];
    $scope.scheduleYear = {year:0,months:[]};
    $scope.editSXP = {editMonth:undefined,editMonthYear:undefined,editMonthSXP:0};
    $scope.detailedError = {visible:false,message:undefined};
    //INITIALIZATION STUFF
    var profileId = profileId || $routeParams["id"];
    
    if(profileId){
        if($scope.currentProfile && $scope.currentProfile.id !== parseInt(profileId)) 
            $scope.currentProfile = undefined;

        $scope.currentProfile = $scope.currentProfile || $scope.getProfileById(profileId);
        
        if(!$scope.currentProfile){
            alert("A Profile with the ID '" + profileId + "' doesn't exist");
            $scope.$location.path('/profile-list/');
        }

        $scope.currentProfile.buildSchedule();
        $scope.scheduleYear.year = $scope.currentProfile.years[0].year;
        $scope.scheduleYear.months = $scope.currentProfile.years[0].months.slice(0);       
    }
    else{
        $scope.$location.path('/profile-list/');
    }
    //END INITIALIZATION

    //////REGARDING EDITING PROFILE SCENARIOS
    $scope.toggleEdit = function(){
        $scope.crudModes.editScenarioMode = !$scope.crudModes.editScenarioMode;
        
        if(!$scope.crudModes.editScenarioMode){//Meaning we just left edit mode and could've possibly made changes
            $scope.currentProfile = $scope.getProfileById(profileId);
            $scope.currentProfile.buildSchedule();
        }
    };

    $scope.updateProfile = function(){

        //Due to numeric values coming back from the view as strings with quotes, change them to float or int
        $scope.currentProfile.loanScenario.loanAmt = parseFloat($scope.currentProfile.loanScenario.loanAmt);
        $scope.currentProfile.loanScenario.interestRate = parseFloat($scope.currentProfile.loanScenario.interestRate);
        $scope.currentProfile.loanScenario.loanTerm = parseInt($scope.currentProfile.loanScenario.loanTerm);

        for (var i = 0; i < $scope.profiles.length; i++) {
            if($scope.profiles[i].id === $scope.currentProfile.id){
                $scope.profiles[i] = $scope.currentProfile;
                LoanProfileService.saveAllProfiles($scope.profiles);                                                
                break;
            }
        };

        $scope.currentProfile.buildSchedule();

        //Want to update the year selected for the payment schedule
        for (var i = 0; i < $scope.currentProfile.years.length; i++) {
            if($scope.scheduleYear.year === $scope.currentProfile.years[i].year){
                $scope.scheduleYear.months = $scope.currentProfile.years[i].months;
                break;
            }
        };

        $scope.crudModes.editScenarioMode = false;
        //Updates the data displayed for the payment schedule
        $scope.updateScheduleYear();
    };

    //////REGARDING DISPLAYING/ADDING/DELETING RECURRING EXTRA PAYMENTS
    $scope.rxpLabel = function(rxp){
        return $scope.getMonthName(rxp.startMonth) + ' ' + rxp.startYear + ' - ' + $scope.getMonthName(rxp.endMonth) + ' ' + rxp.endYear;
    };

    $scope.getMonthName = function(monthNum){
        var winWidth = $(window).width();

        return winWidth >= 600 ? monthNames[monthNum] : monthNamesAbbr[monthNum];
    };

    $scope.updateSelectedYear = function(yearType){
        if(yearType === 'start'){
            $scope.startMonthNames.length = 0;//Truncate the array
            for (var i = 0; i < $scope.recurringExtraPayment.startYear.months.length; i++) {
                $scope.startMonthNames.push(monthNames[$scope.recurringExtraPayment.startYear.months[i].month]);
            };
            
        } else if (yearType === 'end'){
            $scope.endMonthNames.length = 0;//Truncate the array
            for (var i = 0; i < $scope.recurringExtraPayment.endYear.months.length; i++) {
                $scope.endMonthNames.push(monthNames[$scope.recurringExtraPayment.endYear.months[i].month]);
            };

        } else {
            alert('YearType:' + yearType);
        }
    };


    $scope.addRecurringExtraPayment = function(){
        var newRXP = {};
        newRXP.startYear = $scope.recurringExtraPayment.startYear.year;
        newRXP.startMonth = monthNames.indexOf($scope.recurringExtraPayment.startMonth);
        newRXP.endYear = $scope.recurringExtraPayment.endYear.year;
        newRXP.endMonth = monthNames.indexOf($scope.recurringExtraPayment.endMonth);
        newRXP.amount = parseFloat($scope.recurringExtraPayment.amount);

        //Recurring extra payments must cover a span of 3 months
        var validRXP = (newRXP.startYear < newRXP.endYear || 
                    (newRXP.endMonth - newRXP.startMonth >= 3));

        if(validRXP){
            $scope.currentProfile.extraPayments.recurringExtraPayments.push(newRXP);

            $scope.updateProfile();
            $scope.crudModes.addRXPMode = false;
            //Reset Model for adding new RXP
            $scope.recurringExtraPayment.startYear = undefined; 
            $scope.recurringExtraPayment.startMonth = undefined; 
            $scope.recurringExtraPayment.endYear = undefined;
            $scope.recurringExtraPayment.endMonth = undefined;
            $scope.recurringExtraPayment.amount = undefined;
        } else {
            $scope.detailedError.visible = true;
            $scope.detailedError.message = "Recurring Extra Payments must cover a span of at least 3 months.";
            //Set it to clear the message in 30 seconds
            $timeout(function(){
                $scope.detailedError.visible = false;
            $scope.detailedError.message = undefined;
            }, 3000);
        }
        
    };

    $scope.deleteRecurringExtraPayment = function(rxp){
        for (var i = 0; i < $scope.currentProfile.extraPayments.recurringExtraPayments.length; i++) {
            //Angular adds on a $$hash property, so I can't just compare each object to this one
            //  small enough number of properties that it's not a big deal though
            var _rxp = $scope.currentProfile.extraPayments.recurringExtraPayments[i];
            if(_rxp.startYear === rxp.startYear 
                && _rxp.startMonth === rxp.startMonth 
                && _rxp.endYear === rxp.endYear 
                && _rxp.endMonth === rxp.endMonth
                && _rxp.amount === rxp.amount){
                $scope.currentProfile.extraPayments.recurringExtraPayments.splice(i, 1);
                $scope.updateProfile();
            }
        };
    };

    //REGARDING THE PAYMENT SCHEDULE FOR ANY YEAR
    $scope.updateScheduleYear = function(){
        if($scope.scheduleYear.year < $scope.currentProfile.years[0].year ||
            $scope.scheduleYear.year > $scope.currentProfile.years[$scope.currentProfile.years.length-1].year)
                $scope.scheduleYear.year = $scope.currentProfile.years[0].year;        


        for (var i = 0; i < $scope.currentProfile.years.length; i++) {
            if($scope.currentProfile.years[i].year === $scope.scheduleYear.year){
                $scope.scheduleYear.months = $scope.currentProfile.years[i].months.slice(0);        
            }
        };     

        //Also want to clear the editMonth and editYear properties
        $scope.cancelMonthSXP();
    };

    //REGARDING EDITING ANY SINGLE MONTH'S EXTRA PAYMENT
    $scope.setEditMonth = function(monthObj, yearNum){            
        $scope.editSXP.editMonth = monthObj.month;
        $scope.editSXP.editMonthYear = yearNum;
        $scope.editSXP.editMonthSXP = monthObj.extraPayment;
    };

    $scope.updateMonthSXP = function(oldMonthSXP){
        if(parseFloat(oldMonthSXP) !== parseFloat($scope.editSXP.editMonthSXP)){
            var profileSXPExists = false;

            for (var i = 0; i < $scope.currentProfile.extraPayments.singleExtraPayments.length; i++) {
                var sxp = $scope.currentProfile.extraPayments.singleExtraPayments[i];
                if(sxp.year === $scope.editSXP.editMonthYear && sxp.month === $scope.editSXP.editMonth){
                    sxp.amount = parseFloat($scope.editSXP.editMonthSXP);
                    profileSXPExists = true;
                    break;
                }
            };

            if(!profileSXPExists){
                $scope.currentProfile.extraPayments.singleExtraPayments.push({
                    month:$scope.editSXP.editMonth,
                    year:$scope.editSXP.editMonthYear,
                    amount:parseFloat($scope.editSXP.editMonthSXP)
                });
            }

            $scope.updateProfile();
        }
    };

    $scope.cancelMonthSXP = function(){
        //Clear the editMonth and editYear properties
        $scope.editSXP.editMonth = undefined;
        $scope.editSXP.editMonthYear = undefined;
        $scope.editSXP.editMonthSXP = 0;   
    };

});
