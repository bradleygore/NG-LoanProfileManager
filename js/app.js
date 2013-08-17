'use strict';


// Declare app level module (Second parameter would be any dependencies, still pass in empty array if no dependencies)
var loanProfileApp = angular.module('loanProfileApp', []);

//Sets up the router for the app
loanProfileApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/new', {templateUrl: 'partials/new.html', controller: 'NewLoanProfileController'});
    $routeProvider.when('/profile-list', {templateUrl: 'partials/profile-list.html', controller: 'MainController'});
    $routeProvider.when('/profile-details/:id', {templateUrl: 'partials/profile-details.html', controller: 'ProfileDetailsController'});
    $routeProvider.when('/home', {templateUrl: 'partials/home.html'});
    $routeProvider.otherwise({redirectTo: '/home'});
}]);
