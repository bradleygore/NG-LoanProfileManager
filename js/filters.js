'use strict';

/* Filters */


//Filters are used in the declarative markup like 
//{{year.year for year in currentProfile.years | yearGreaterThan:recurringExtraPayment.startYear.year}}
//The "|" denotes we're going to use a filter, and putting a value after a colon means we're passing in another value as a parameter.
//The first parameter is always going to be the array that needs filtered, then subsequent parameters would follow
loanProfileApp.filter('yearGreaterThan', function(){
    return function(input, minVal){
        if(minVal){   
            //Should always be an array as we're dealing with RXPs specifically with this filter
            if(Object.prototype.toString.call(input) === '[object Array]'){         
                var returnArray = [];
                for (var i = 0; i < input.length; i++) {
                    if(input[i].year >= minVal) returnArray.push(input[i]);
                };
                return returnArray;
            }
        }
    }
});
