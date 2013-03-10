# qed
wire up express routes to promise-returning functions

## Stability

Unstable: Expect patches and features, possible api changes.

## Installation

    $ npm install qed

## Usage

Say you're in the context of an express (or express-like) app, and you've got some end points that look like this:

    app.get('/fruits/veggies/:quantity', function (req, res) {
      // do stuff
    })

Well, now try mixing this in where "do stuff" is a function which returns a Promise:

    app.get('/fruits/veggies/:quantity', function (req, res) {
      doStuff(req.params.quantity).then(function (val) {
        res.send(val)
      }, function(err) {
        res.send(500, err)
      })
    })

Well, with `qed` we can make this absurdly simple example a bit nicer with some opinionated defaults:

    var qed = require('qed')

    app.get('/fruits/veggies/:quantity',
      qed(doStuff, 'req.params.quantity'))

The less blood there is at the interface layer, the more you can focus on your application. `qed` handles mapping between your application-level functions and all the gooky HTTP stuff, so you can keep your implementation framework agnostic.

But, you say, you want to be more hands-on with the http response - maybe a special case status code?

    app.post('/fruits/order',
      qed(makeOrder, 'req.user', 'req.body')
        .response(202)) // HTTP 202 - Accepted

Or even more holy-cow-hands-on HTTP madness:

    app.post('/fruits/order',
      qed(makeOrder, 'req.user', 'req.body')
        .response(function(err, result) {
          if (err) { return this.send(500, err.message)}
          this.send(202, result)
        }))

And, if you want to handle your req-res stuff manually you may do so:

    // make sure your function has parameters of exactly `req, res`
    function boxes(req, res) {

    }

    // pass it to qed without specifying any accessors
    app.get('/boxes',
      qed(foxes))

Note, if you don't return a promise, then you're totally responsible for sending your own response.

The power is yours.

## API

### qed(promiser, params...)

`promiser` is a promise-returning function. `params` is 0 or more [accessor strings](https://github.com/agilediagnosis/dotmap#accessor-strings) corresponding (in order) to `promiser`'s parameters.

For example, if you had a `promiser` like:

    getBooksByAuthor(authorName, limit) {
      limit = limit || 25
      return promiseOfDbQuery()
    }

and you were hooking it up to a url like `/author/:author/books?limit=:limit`, you might have:

    qed(getBooksByAuthor, 'req.params.author', 'req.query.limit')

Accessor strings used to map params must start with `req` or `res`, but can access any property thereof. Go nuts with your middleware.

`qed` returns a function with the `(req, res)` signature that express is expecting in a route handler. When invoked, this function will map any params from the Request and Repsonse objects and call `promiser` with these arguments. If the promise is rejected, it will respond with an error. (See [Errors](#errors)) When the promise is resolved, it will send the response, by default as a 200.

### qed#response(statusCode)

Chain after a `qed` call to override the default response code when the promise is resolved to use `statusCode` instead of `200`.

### qed#response(handlerFunction) where handlerFunction(err, result) {}

Chain after a `qed` call to intercept the response. `handlerFunction` is invoked with arguments `err` (the reason if the promise is rejected) and `result` (the value if the promise is fulfilled). `this` is the Response object. No return value is expected.

### qed.on(event, listner)

Attach an event listener. Also suports standard node EventEmitter methods. `qed` emits an `error` event (see below).

## Errors

By default, if the promise is rejected, `qed` will respond with a 500 error and will send the Error#message property to the response. If the error thrown has a `statusCode` property in the 400 or 500 range, `qed` will use that for the response. Strongly consider using the `qed#response` handler to encapsulate your http-specific logic.

`qed` is also an event emitter, and it will emit an `error` event. (Note: normally node EventEmitters will throw any `error` events if there are no listeners. However, in this case, `qed` does not emit the `error` event if there are no listeners, so there shouldn't be any surprises)

## Running the tests

From the package root directory

    $ npm install
    $ npm test

## contributors

    jden <jason@denizac.org>

## license

MIT, (c) 2013 jden <jason@denizac.org>. See LICENSE.md

quod erat demonstrandum.