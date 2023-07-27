var assert = require('assert');
const moment = require('moment-timezone');

describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});

it("replaceAll", () => {
    assert.equal("ab_c".replaceAll("_", "\\_"), "ab\\_c")
})

it("timezone convert", () => {
    let baseTime = moment.tz("07:00", "HH:mm", "Asia/Tokyo").date(15)
    let theirTime = baseTime.tz("America/New_York");//.format("HH:mm z")
    let dayOffset = theirTime.date() - 15;
    console.log(theirTime.format("hh: mm A ") + (dayOffset>0?"\\(+":"\\(") + dayOffset + " day\\)");
})

it("timezone", () => {
    if (moment.tz.zone("Asia/Tokyo") == null) {
        throw new Error("fuck")
    }
})