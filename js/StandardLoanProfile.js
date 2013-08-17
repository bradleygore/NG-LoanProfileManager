(function(w){
    //Object.cast convenience method
    if(!Object.cast){
        Object.cast = function(rawObject, baseConstructor){
            var newObj = new baseConstructor();
            return copyPropertiesBetweenObjects(rawObject, newObj);
        };
    }

    w.copyPropertiesBetweenObjects = function(fromObj, toObj){
        for(var prop in fromObj) {
            if(prop in toObj) {
                if(Object.prototype.toString.call(fromObj[prop]) === '[object Array]'){
                    toObj[prop] = fromObj[prop];
                } else if(typeof toObj[prop] === 'object'){
                    toObj[prop] = copyPropertiesBetweenObjects(fromObj[prop], toObj[prop]);
                } else {
                    toObj[prop] = fromObj[prop];
                }
            }
        }
        return toObj;
    };

    w.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    w.monthNamesAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    w.loanTermTypes = ["Months", "Years"];
    
    w.StandardLoanProfile = function(name, id) {
        this.id = id;
        this.name = name;
        this.description = "";
        this.loanScenario = {        
            loanAmt: 0.00,
            interestRate: 0.000,
            monthlyInterestRate: 0.000,
            scheduledMonthlyPayment: 0.00,
            loanTerm: 0,
            termMonths: 0,
            loanTermType: undefined,
            firstPaymentDate: undefined,
            fullyPopulated: function() {                
                //Note: the "this" keyword in the scope of this function is applied to the loanScenario object, not the StandardLoanProfile (parent) object

                //Here, we're not calling the getDate method, we're just seeing if it exists on the firsPaymentDate object
                //If it has a getDate attached to it, then it's a valid date object
                //The way we're doing this is to check for the value of "getDate" within the key of firstPaymentDate
                //If firstPaymentDate is a Date object (key), it will have a getDate value (property, method, etc..) attached to it.
                if(typeof this.firstPaymentDate === "string")
                    this.firstPaymentDate = new Date(this.firstPaymentDate); //When serializing back from JSON object, the date is a string...

                if("getDate" in this.firstPaymentDate) {
                    return (this.loanAmt > 0 && 
                            this.interestRate > 0 && this.interestRate < 90 && 
                            this.loanTerm > 0 && this.loanTerm < 50 &&
                            (this.loanTermType.toLowerCase() === "years" || this.loanTermType.toLowerCase() === "months"));
                }
                return false;
            }
        };
        this.years = [];
        this.extraPayments = {
            singleExtraPayments: [],
            recurringExtraPayments: []
        };
        this.finalPayment = 0;
    };

    w.StandardLoanProfile.prototype.buildSchedule = function() {
                
        var timeLog = new Date();
        console.log("Started BuildSchedule(): " + timeLog.getHours() + ":" + timeLog.getMinutes() + ":" + timeLog.getSeconds() + ":" + timeLog.getMilliseconds());

        if(!this.loanScenario.fullyPopulated())
            throw new Error("Entire Loan Scenario must be populated in order to generate a schedule.");

        //TODO: Implement logic for building loan schedules here
        this.loanScenario.monthlyInterestRate = this.loanScenario.interestRate / 100 / 12;
        this.loanScenario.termMonths = this.loanScenario.loanTerm * (this.loanScenario.loanTermType.toLowerCase() === "years" ? 12 : 1);

        this.loanScenario.scheduledMonthlyPayment = 
            this.loanScenario.loanAmt * 
                (this.loanScenario.monthlyInterestRate * 
                    Math.pow((1 + this.loanScenario.monthlyInterestRate), this.loanScenario.termMonths)) / 
                (Math.pow((1 + this.loanScenario.monthlyInterestRate), this.loanScenario.termMonths) - 1);

        var firstPayDate = new Date(this.loanScenario.firstPaymentDate),
            currentYear = firstPayDate.getFullYear(),
            currentMonth = firstPayDate.getMonth();//0 based month index

        //First, go through all existing years and remove any that are less than the (potentially new) current year
        if(this.years.length) {
            for (var i = this.years.length - 1; i >= 0; i--) {                
                if(this.years[i].year < currentYear)
                    this.years.splice(i, 1);

                if(this.years[i].year === currentYear){
                    for (var m = this.years[i].months.length - 1; m >= 0; m--) {
                        if(this.years[i].months[m].month < currentMonth)
                            this.years[i].months.splice(m, 1);
                    };
                }
            };
        }

        var currentBalance = this.loanScenario.loanAmt;
        while(this.loanScenario.scheduledMonthlyPayment < currentBalance) 
        {
            var year = null;
            for (var i = this.years.length - 1; i >= 0; i--) {                
                if(this.years[i].year == currentYear){
                    year = this.years[i];
                    break;
                }
            };

            if(!year) year = new Year(currentYear);

            for (;currentMonth < monthNames.length && parseFloat(this.loanScenario.scheduledMonthlyPayment) < currentBalance; currentMonth++) {
                var interestAmt, principalAmt, endingBal, extraPaymentAmt = 0;

                //NOTE: There can only be 1 single extra payment per year/month combo
                //      A single extra payment for a specific year/month combo overrides the value that
                //      would be applied from that year/month combo being included in a recurring extra payment
                if(this.extraPayments.singleExtraPayments.length){
                    for (var isxp = this.extraPayments.singleExtraPayments.length - 1; isxp >= 0; isxp--) {
                        var sxp = this.extraPayments.singleExtraPayments[isxp];
                        if(sxp.year === year.year && sxp.month === currentMonth) {
                            extraPaymentAmt = sxp.amount;
                            break;
                        }
                    };
                }
                if(this.extraPayments.recurringExtraPayments.length && !extraPaymentAmt){
                    for (var irxp = 0; irxp < this.extraPayments.recurringExtraPayments.length; irxp++) {
                        var rxp = this.extraPayments.recurringExtraPayments[irxp];

                        if(rxp.startYear < currentYear && rxp.endYear > currentYear ||
                            (rxp.startYear === currentYear && rxp.startMonth <= currentMonth) ||
                            (rxp.endYear === currentYear && rxp.endMonth >= currentMonth))                                    
                                    extraPaymentAmt += rxp.amount;
                    };
                }

                interestAmt = currentBalance * this.loanScenario.monthlyInterestRate;
                principalAmt = this.loanScenario.scheduledMonthlyPayment - interestAmt;
                endingBal = currentBalance - principalAmt - extraPaymentAmt;

                var month = null;
                for (var m = 0; m < year.months.length; m++) {
                    if(year.months[m].month === currentMonth){
                        month = year.months[m];
                        break;
                    }
                };

                if(!month) {
                    month = new Month(currentMonth);
                    year.months.push(month);
                }

                month.startBalance = currentBalance;
                month.principalPayment = principalAmt;
                month.interestPayment = interestAmt;
                month.endBalance = endingBal;
                month.extraPayment = extraPaymentAmt; 

                currentBalance = endingBal;
            };

            this.years.push(year);

            if(parseFloat(this.loanScenario.scheduledMonthlyPayment) < currentBalance){
                currentYear = currentYear + 1;
            }

            currentMonth = 0;
        };

        this.finalPayment = currentBalance;

        this.cleanUpYears(currentYear);

        timeLog = new Date();
        console.log("Ended BuildSchedule(): " + timeLog.getHours() + ":" + timeLog.getMinutes() + ":" + timeLog.getSeconds() + ":" + timeLog.getMilliseconds());
    };

    w.StandardLoanProfile.prototype.resetSchedule = function(){
        this.extraPayments.singleExtraPayments = [];
        this.extraPayments.recurringExtraPayments = [];
        this.buildSchedule();
    };

    w.StandardLoanProfile.prototype.cleanUpExtraPayments = function(){
        //Remove any single extra payments whose month/year combo doesn't exist
        //Adjust any recurring extra payments whose bounds are either before or after the current schedule

        var firstYear = this.years[0],
            lastYear = this.years[this.years.length - 1];
        
        for (var irxp = this.extraPayments.recurringExtraPayments.length - 1; irxp >= 0; irxp--) {
            var rxp = this.extraPayments.recurringExtraPayments[irxp];

            //Shouldn't ever happen, but best to cleanup
            if(rxp.startYear === rxp.endYear && rxp.endMonth <= rxp.startMonth){
                this.extraPayments.recurringExtraPayments.splice(irxp,1);
                break;
            }
            
            //If the entire span of years is not valid, then remove it altogether and move on to the next rxp
            if(rxp.endYear < firstYear.year || rxp.startYear > lastYear.year){
                this.extraPayments.recurringExtraPayments.splice(irxp, 1);
                break;
            }
            //Now, if the span is only partially incorrect, adjust the start/end year so that it's correct to the current schedule
            if(rxp.startYear >= firstYear.year && rxp.endYear > lastYear.year){
                rxp.endYear = lastYear.year;
            }
            if(rxp.endYear <= lastYear.year && rxp.startYear < firstYear.year){
                rxp.startYear = firstYear.year;
            }
            //Now, we have to adjust the months accordingly. To do this, we need to get the startYear and endYear represented in this span
            var startYear,
                endYear;
            for (var y = this.years.length - 1; y >= 0; y--) {
                if(this.years[y].year == rxp.startYear)
                    startYear = this.years[y];
                if(this.years[y].year == rxp.endYear)
                    endYear = this.years[y];
            };
            //If the startMonth value is < startYear.months[0].month, then move it up to that value (index from the months array)
            if(rxp.startMonth < startYear.months[0].month)
                rxp.startMonth = startYear.months[0].month;
            //If the endMonth value is > endYear.months[endYear.months.length - 1].month, then back it down to that value
            if(rxp.endMonth > endYear.months[endYear.months.length - 1].month)
                rxp.endMonth = endYear.months[endYear.months.length - 1].month;
       };

       //Now, we need to clean up any single extra payments that are a zero value but are not overriding a recurring amount
       for (var i = this.extraPayments.singleExtraPayments.length - 1; i >= 0; i--) {
           var sxp = this.extraPayments.singleExtraPayments[i];

           if(sxp.year < firstYear.year || sxp.year > lastYear.year || 
            (sxp.year === firstYear.year && sxp.month < firstYear.months[0].month) || 
            (sxp.year === lastYear.year && sxp.month > lastYear.months[lastYear.months.length-1].month)) 
           {

                this.extraPayments.singleExtraPayments.splice(i,1);                
                break;
           }

           if(sxp.amount === 0)
           {
                var isOverride = false;
                for (var j = this.extraPayments.recurringExtraPayments.length - 1; j >= 0; j--) {
                    var rxp = this.extraPayments.recurringExtraPayments[j];

                    if(sxp.year > rxp.startYear && sxp.year < rxp.endYear){
                        //Then it's well between the bounds of the rxp
                        isOverride = true;
                        break;
                    }

                    if((sxp.year === rxp.startYear && sxp.month >= rxp.startMonth) || (sxp.year === rxp.endYear && sxp.month <= rxp.endMonth)){
                        //Then it's within the bounds of the rxp's first or last year and months within
                        isOverride = true;
                        break;
                    }
                };

                if(!isOverride)
                    this.extraPayments.singleExtraPayments.splice(i, 1);//Removes elements starting at index i, and only 1 element
           }
       };
    };

    w.StandardLoanProfile.prototype.cleanUpYears = function(year){
        //Given the year that is now the final year in the schedule,
        //  remove all years beyond that.
        //  Also, the first month within the current year whose ending balance == final payment
        //      should be the last month existing in that year.  Remove all months afterwards.
        for (var y = this.years.length - 1; y >= 0; y--) {
            if(this.years[y].year == year){

                this.years.splice(y + 1, this.years.length - y + 1)

                for (var m = this.years[y].months.length - 1; m >= 0; m--) {
                    if(this.years[y].months[m].endBalance === this.finalPayment){
                        this.years[y].months.splice(m + 1, this.years[y].months.length - m + 1);
                        break;
                    }
                };
            }
        };

        this.cleanUpExtraPayments();
    };

    w.Year = function(year) {
        this.year = year;
        this.months = [];
    };

    w.Year.prototype.between = function(startYear, endYear){
        return (this.year >= startYear && this.year <= endYear);
    };

    w.Month = function(month) {
        this.month = month;
    };

})(window);