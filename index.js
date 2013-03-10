var EventEmitter = require('events').EventEmitter
var dot = require('dotmap')
var Q = require('q')
var fninfo = require('fninfo')

var msg = dot.safe('message')

function qed(promiser, params) {
  if (typeof promiser !== 'function') {
    throw new Error('Promiser must be a function')
  }

  var params = Array.prototype.slice.call(arguments, 1)
  if (!params.every(function (param) {
    return startsWith(param, 'req.') || startsWith(param, 'res.')
  })) {
    throw new Error('Accessor strings must start with `req.` or `res.`')
  }
  if (!params.length) {
    var info = fninfo(promiser)
    if (info.length === 2 && info[0] === 'req' && info[1] === 'res') {
      params = ['req','res']      
    }
  }
  params = params.map(dot.safe)

  var requestHandler = function (req, res) {
    var o = {req: req, res: res}
    var args = params.map(function (accessor) {
      return(accessor(o))
    })

    return promiser.apply(null, args)

  }

  var defaultResponseHandler = function (req, res, promise) {
    return promise.then(function (result) {
      res.send(handler.responseCode || 200, result)
    }).then(null, function (err) {
      if (res.error) res.error(err)
      else if (res.send) res.send(500, msg(err))

      throw err
    })
  }

  var handler = function (req, res) {
    var promise = requestHandler(req, res)

    if (promise && promise.then) {
      promise.then(null, function (err) {
        qed.emit('error', err, req, res)
      })

      if (!handler.responseHandler) {
        promise = defaultResponseHandler(req, res, promise)
      } else {
        promise = handler.responseHandler(res, res, promise)
      }
    }

  }

  handler.response = response.bind(handler)

  return handler
}

function response(code) {
  if (typeof code === 'function') {
    var handler = code;
    this.responseHandler = function (req, res, promise) {
      return promise.then(
        function (result) {
          handler.call(res, null, result)
        },
        function(err) {
          handler.call(res, err)
        })
    }
  }
  else if (typeof code !== 'number' || code > 599 || code < 200) {
    throw new ArgumentError('responseCode must be an HTTP response code')
  }
  this.responseCode = code
  return this
}

function startsWith (str, prefix) {
  return str.substr(0, prefix.length) === prefix
}

// EE
for (var prop in EventEmitter.prototype) {
  var fn = EventEmitter.prototype[prop];
  if (typeof fn !== 'function') return;
  qed[prop] = fn.bind(qed)
}

module.exports = qed;