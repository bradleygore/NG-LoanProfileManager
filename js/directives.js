'use strict';

/* Directives */


loanProfileApp.directive('inputFloat', function(){
    return {
        restrict: 'A', //Restrict so that this directive can only be used on attributes
        require: "ngModel",        
        link: function($scope, element, attributes, controller){
            //We want to provide some custom validation of inputs that must be floats
            var FLOAT_REGX = /^\-?\d+((\.|\,)\d+)?$/;

            //Linking function will add the behaviour to the item with this directive
            
            //if a value supplied to the directive, use it as our decimal places
            var decimalPlaces = parseInt(attributes.inputFloat); //If no value provided, this will be NaN

            element.bind("blur change", function(){
                $scope.$apply(validate);
            });
            //validate();//initialize
            function validate() {
                var viewValue = element.val();

                //If length === 0 then the required attribute will take care of it
                if(viewValue.length === 0){
                    controller.$setValidity('float', true);
                    return;
                }

                if(FLOAT_REGX.test(viewValue)){
                    controller.$setValidity('float', true);
                    var value = parseFloat(viewValue.replace(',', '.'));
                    //NOTE: So, the value type NaN (Not a Number) cannot be compared to directly.
                    //If you try to say NaN === NaN in the console, you'll get a false result.
                    //However, if you say NaN.toString() === NaN.toString(), then you'll get true.
                    //Same with variables that are NaN - if you .toString() them and .toString() NaN, you can compare....
                    if(decimalPlaces.toString() !== NaN.toString() && value.toString() !== NaN.toString()) {
                        value = value.toFixed(decimalPlaces);                        
                    }

                    if(value.toString() !== NaN.toString()){
                        controller.$setViewValue(value);//Update the view in case we rounded anything in our toFixed(decimalNumber)
                        element.val(value);
                    }                    
                } else {
                    controller.$setValidity('float', false);                    
                }
            }
        }
    };        
});

loanProfileApp.directive('minNum', function(){
    return {
        restrict: 'A',
        require: '?ngModel',
        link: function($scope, element, attributes, controller){
            var minNum = parseInt(attributes.minNum);

            element.bind("blur change", function(){
                $scope.$apply(validate);
            });

            function validate(){
                var viewValue = element.val();

                if(viewValue.length){
                    if(parseInt(viewValue) >= minNum){
                        controller.$setValidity('minNum', true);
                    } else{
                        controller.$setValidity('minNum', false);
                    }
                }
            }
        }
    };
});

loanProfileApp.directive('inputDate', function(){
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function($scope, element, attributes, controller){
            element.bind("blur change", function(){
                $scope.$apply(validate);
            });
            validate();//Initialize

            function validate() {
                var viewValue = element.val();

                if(new Date(viewValue).toString() === 'Invalid Date') {
                    controller.$setValidity('date', false);
                } else {
                    controller.$setValidity('date', true);
                    element.val(new Date(viewValue).toLocaleDateString());
                }
            }
        }
    };
});
