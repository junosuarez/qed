var chai = require('chai')
chai.should()
chai.use(require('chai-interface'))
var expect = chai.expect
var sinon = require('sinon')
chai.use(require('sinon-chai'))
var Q = require('q')

var qed = require('../index')

describe('qed', function () {
  it('has interface', function () {
    qed.should.be.a('function')
    qed.should.have.interface({
      on: Function,
      addListener: Function,
      removeListener: Function
    })
  })

  it('requires a function', function () {
    expect(function () {
      qed()
    }).to.throw()

    expect(function () {
      qed(123)
    }).to.throw()

    expect(function () {
      qed(function() {})
    }).not.to.throw()
  })

  it('returns a function', function () {
    var promiser = function () {}
    var fn = qed(promiser)
    fn.should.be.a('function')
    fn.length.should.equal(2)
  })

  it('invokes the promiser', function () {
    var promiser = sinon.spy()
    var fn = qed(promiser)

    fn()

    promiser.should.have.been.calledOnce
  })

  it('throws if params start with other than req. or res.', function () {
    expect(function () {
      qed(qed, 'request.foo')
    }).to.throw()
    expect(function () {
      qed(qed, 'req.foo')
    }).not.to.throw()
  })

  it('maps args and invokes promiser therewith', function () {
    var req = {a: 1, b: 2, c: 'three'}
    var promiser = sinon.spy()
    var fn = qed(promiser, 'req.a', 'req.c')

    fn(req)

    promiser.should.have.been.calledWithExactly(1, 'three')
  })

  it('sends the result', function (done) {
    var promiser = function () { return Q.resolve(5) }
    var fn = qed(promiser)
    var res = {send: function (status, result) {
      status.should.equal(200)
      result.should.equal(5)
      done()
    }}

    fn({}, res)
  })

  it('sends a 500 with Error#message on promise rejected', function (done) {
    var promiser = function () { return Q.reject(new Error('foo')) }
    var fn = qed(promiser)
    var res = {send: function (status, result) {
      status.should.equal(500)
      result.should.equal('foo')
      done()
    }}

    fn({}, res)
  })

  describe('qed#response', function () {
    it('exists on a qed-constructed function', function () {
      qed(qed).should.have.interface({
        response: Function
      })
    })

    it('requires a responseCode or handler', function () {
      expect(function () {
        qed(qed).response()
      }).to.throw()

      expect(function () {
        qed(qed).response('foo')
      }).to.throw()

      expect(function () {
        qed(qed).response(9000)
      }).to.throw()

      expect(function () {
        qed(qed).response(202)
      }).not.to.throw()

      expect(function () {
        qed(qed).response(function () {})
      }).not.to.throw()
    })

    it('returns an express function', function () {
      var fn = qed(qed).response(200)
      fn.should.be.a('function')
      fn.length.should.equal(2)
    })

    it('can override the response code for successful responses', function (done) {
      var promiser = function () { return Q.resolve(5) }

      var fn = qed(promiser).response(222)

      var res = {send: function (status, result) {
        status.should.equal(222)
        result.should.equal(5)
        done()
      }}

      fn({}, res)
    })

    it('can override the entire responseHandler for success', function (done) {
      var promiser = function () { return Q.resolve(5) }

      var fn = qed(promiser).response(function (err, result) {
        result.should.equal(5)
        expect(err).to.equal(null)
        done()
      })

      fn()
    })

    it('can override the entire responseHandler for error', function (done) {
      var Err = new Error('scallywags')
      var promiser = function () { return Q.reject(Err) }

      var fn = qed(promiser).response(function (err, result) {
        expect(result).to.equal(undefined)
        expect(err).to.equal(Err)
        done()
      })

      fn()
    })


  })

  it('emits errors', function (done) {
    var Req = {}
    var Res = {send: function ()  {}}
    var Err = new Error('bazo')
    qed.once('error', function (err, req, res) {
      err.should.equal(Err)
      req.should.equal(Req)
      res.should.equal(Res)
      done()
    })
    var promiser = function () { return Q.reject(Err)}
    var fn = qed(promiser)
    fn(Req, Res)
  })

})