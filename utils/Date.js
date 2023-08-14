Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('/');
};

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

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

module.exports = Date