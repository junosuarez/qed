var chai = require('should')

var qed = require('../index')

describe('qed', function () {
  it('exports a function', function () {
    qed.should.be.a('function')
  })
})