'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.

loanProfileApp.factory('LoanProfileService', function(){
    //This should get a single set of profiles to be used/modified by all other controllers.
    //There should never be a need to get all profiles again
    //  We'll be updating the model directly then saving that state back to localStorage/cache

    function supportsLocalStorage(){
        try{
            return 'localStorage' in window && window['localStorage'] !== null;
        }catch(e){
            return false;
        }
    }

    //This object will be passed around by all controllers.
    //  NOTE: If it were ever an issue where there would be a ton of profiles for any single person,
    //  we'd want to implement a smaller object model with just a portion of the properties for the high-level views,
    //  and then just get profile by ID for the lower level details/dat-viz/analysis... views
    return {
        loadProfiles: function(){
            var profiles = [];

            if(supportsLocalStorage())
                profiles = JSON.parse(localStorage.getItem('standardLoanProfiles')) || profiles;

            if(profiles.length < 1){
                var profile = new StandardLoanProfile('Test Profile', 0);
                profile.description = "This is a test profile to demonstrate the app.";
                profile.loanScenario.firstPaymentDate = new Date();
                profile.loanScenario.interestRate = 3.799;
                profile.loanScenario.loanTerm = 15;
                profile.loanScenario.loanTermType = "Years";
                profile.loanScenario.loanAmt = 125000;
                profile.buildSchedule();
                profiles.push(profile);
            } else {

                profiles.sort(function(p1, p2){
                    return p1.name < p2.name ? -1 : p1.name > p2.name ? 1 : 0;
                });

                for (var i = 0; i < profiles.length; i++) {
                    profiles[i] = Object.cast(profiles[i], StandardLoanProfile);
                };

                //Reset the IDs
                for (var i = 0; i < profiles.length; i++) {
                    profiles[i].id = i;
                };
            }        

            return profiles;
        },
        saveAllProfiles: function(allProfiles){
            if(supportsLocalStorage()){
                //Since each schedule can be rebuilt on the fly, 
                //don't want to waste storage capital by saving the entire schedule
                for (var p = allProfiles.length - 1; p >= 0; p--) {
                    allProfiles[p].years.length = 0;//This truncates the years array and clears all items
                };

                localStorage.setItem('standardLoanProfiles', JSON.stringify(allProfiles));
            }
        }
    };
});
