var $q = require('bluebird');
$q.onPossiblyUnhandledRejection(function(error){});
var log = require('better-console');
var inspect = require('eyes').inspector({styles: {all: 'magenta'}});

// Context Trap - you will never have external access to the result of the promise

var result = $q.resolve('resolved!');
inspect(result);

// ------------------
// Resolution Caching
//   - Promises are only settled once
//   - the result of the settlement is cached for subsequent use

var deferred = $q.defer();
var promise1 = deferred.promise;

var promise2 = promise1.then(function (value) {
    log.warn('first value', value);
    var deferred = $q.defer();
    setTimeout(function () {deferred.resolve('finished!')}, 5000);
    return deferred.promise;
});

promise2.then(function (value) {
    log.warn('second value', value);
});

//   - nothing happens, the first promise was never resolved

deferred.resolve('deferred value');

//   - see what happens now.

promise2.then(function (value) {
    log.warn('second value', value);
});

//   - you can always re-create the promise

var promise2 = promise1.then(function (value) {
    log.warn('first value', value);
    var deferred = $q.defer();
    setTimeout(function () {deferred.resolve('finished!')}, 5000);
    return deferred.promise;
});

promise2.then(function (value) {
    log.warn('second value', value);
});


// ------------------
// How to properly bind callbacks
//   - you can pass resolved and rejected callbacks to *then*

$q.resolve('resolved').then(function (successValue) {
    log.warn('success!', successValue);
}, function (errorValue) {
    log.error('ERROR!', errorValue);
});

$q.reject('resolved').then(function (successValue) {
    log.warn('success!', successValue);
}, function (errorValue) {
    log.error('ERROR!', errorValue);
});


//   - but the rejection callback is only bound to the original promise

$q.resolve('resolved').then(function (successValue) {
    successValue.propertyThatDoesntExist();
    log.warn('success!', successValue);
}, function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - using *catch* will handle all failures

$q.resolve('resolved').then(function (successValue) {
    successValue.propertyThatDoesntExist();
    log.warn('success!', successValue);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - this code doesn't work

$q.resolve('resolved').then(function (successValue) {
    $q.reject('I want to reject');
    log.warn('success!', successValue);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - remember that promises are monadic structures
//   - you need to return the value that should be propagated

$q.resolve('resolved').then(function (successValue) {
    return $q.reject('I want to reject');
    log.warn('success!', successValue);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - you can also return resolutions

$q.resolve('resolved').then(function (successValue) {
    return $q.resolve('new value');
}).then(function (newSuccess) {
    log.warn(newSuccess);
});

//   - and return actual values, rather than promises
//   - they will propagate down the promise chain

$q.resolve('resolved').then(function (successValue) {
    return 'new value';
}).then(function () {
    return 'another value';
}).then(function (result) {
    log.warn(result);
});

//   - sometimes it's useful to handle an inner promise prior to propagating

$q.resolve('resolved').then(function (successValue) {
    return $q.reject('I want to reject').catch(function () {
        return 'its resolved!';
    });
}).then(function (result) {
    log.warn(result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});



// ------------------
// Deferred Anti-pattern
//   - this function resolves based on the settlement of firstPromise

function doSomethingCrazy(firstPromise) {
    var deferred = $q.defer();
    var promise = deferred.promise;

    firstPromise.then(function (result) {
        deferred.resolve(result);
    }).catch(function (error) {
        deferred.reject(error);
    });

    return promise;
}

doSomethingCrazy($q.resolve('some value')).then(function (result) {
    log.warn('resolved:', result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

doSomethingCrazy($q.reject('some problem')).then(function (result) {
    log.warn(result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - there is no need to defer when you are already dealing with promises
//   - this is equivalent:

function doSomethingSmart(firstPromise) {
    return firstPromise;
}

doSomethingSmart($q.resolve('some value')).then(function (result) {
    log.warn('resolved:', result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

doSomethingSmart($q.reject('some problem')).then(function (result) {
    log.warn(result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - that was a contrived example
//   - you will probably want to do something after the first promise
//   - still, instead of

function doSomethingElse(firstPromise) {
    var deferred = $q.defer();
    var promise = deferred.promise;

    firstPromise.then(function (result) {
        console.log('doing something');
        deferred.resolve(result);
    }).catch(function (error) {
        deferred.reject(error);
    });

    return promise;
}

doSomethingElse($q.resolve('some value')).then(function (result) {
    log.warn('resolved:', result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});

//   - favour:

function doSomethingElse(firstPromise) {
    return firstPromise.then(function (result) {
        console.log('doing something');
        return result;
    });
}

doSomethingElse($q.resolve('some value')).then(function (result) {
    log.warn('resolved:', result);
}).catch(function (errorValue) {
    log.error('ERROR!', errorValue);
});



// ------------------
// Mocking promises

for(var i = 0; i < 100; i++) {
    log.error("just don't do it!");
}

//   - you might be inclined to write a mock like this

var promiseMock = function (result) {
    return {
        then: function (callback) {
            callback(result);
        }
    }
}

promiseMock('myValue').then(function (result) {
    log.warn(result);
});

//   - it will likely get you into trouble

promiseMock('myValue').then(function (result) {
    log.warn(result);
    return 'second value';
}).then(function (result) {
    log.warn(result);
});

