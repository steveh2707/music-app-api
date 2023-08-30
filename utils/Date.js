/**
 * Function to return string in format 'yyyymmdd' from Date
 * @returns {String} in format 'yyyymmdd'
 */
Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('/');
};

/**
 * Function to return string in format 'yyyymmddhhmmss' from Date
 * @returns {String} in format 'yyyymmddhhmmss'
 */
Date.prototype.yyyymmddhhmmss = function () {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();
  var hh = this.getHours();
  var MM = this.getMinutes();
  var ss = this.getSeconds();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd,
  (hh > 9 ? '' : '0') + hh,
  (MM > 9 ? '' : '0') + MM,
  (ss > 9 ? '' : '0') + ss,
  ].join('/');
};

/**
 * Function to add number of days to a date.
 * @param {Int} days 
 * @returns {Date} the new date
 */
Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

module.exports = Date