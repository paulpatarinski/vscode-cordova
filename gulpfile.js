// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

var child_process = require('child_process');
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var log = require('gulp-util').log;
var os = require('os');
var path = require('path');
var Q = require('q');
var typescript = require('typescript');

function executeCordovaCommand(cwd, command) {
    var deferred = Q.defer();
    var cordovaCmd = os.platform() === "darwin" ? "cordova" : "cordova.cmd";
    var commandToExecute = cordovaCmd + " " + command;
    var process = child_process.exec(commandToExecute, { cwd: cwd });
    process.on("error", function (err) {
        console.log("Executing cordova command failed with error: " + err);
        deferred.reject(err);
    });
    process.stdout.on("close", function (exitCode) {
        if (exitCode) {
            console.log("Cordova command failed with exit code " + exitCode);
            deferred.reject(exitCode);
        }
        else {
            deferred.resolve({});
        }
    });
    return deferred.promise;
}

var sources = [
    'src',
    'test/debugger',
    'typings',
    'debugger/adapter',
    'debugger/common',
    'debugger/test',
    'debugger/webkit',
].map(function(tsFolder) { return tsFolder + '/**/*.ts'; })
.concat(['test/*.ts']);

var projectConfig = {
    noImplicitAny: false,
    target: 'ES5',
    module: 'commonjs',
    declarationFiles: true,
    typescript: typescript
};

gulp.task('build', function () {
    return gulp.src(sources, { base: '.' })
        .pipe(sourcemaps.init())
        .pipe(ts(projectConfig))
        .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: __dirname }))
        .pipe(gulp.dest('out'));
});

gulp.task('watch', ['build'], function(cb) {
    log('Watching build sources...');
    return gulp.watch(sources, ['build']);
});

gulp.task('default', ['build']);

// Don't lint code from tsd or common, and whitelist my files under adapter
var lintSources = [
    'src/cordova.ts',
    'src/utils/cordovaCommandHelper.ts',
    'src/utils/cordovaProjectHelper.ts',
    'src/utils/tsdHelper.ts',
    'src/debugger',
    'test/debugger',
    'debugger/test',
    'debugger/test',
    'debugger/webkit',
].map(function(tsFolder) { return tsFolder + '/**/*.ts'; });
lintSources = lintSources.concat([
    'debugger/adapter/sourceMaps/sourceMapTransformer.ts',
    'debugger/adapter/adapterProxy.ts',
    'debugger/adapter/lineNumberTransformer.ts',
    'debugger/adapter/pathTransformer.ts',
]);

var tslint = require('gulp-tslint');
gulp.task('tslint', function(){
      return gulp.src(lintSources, { base: '.' })
        .pipe(tslint())
        .pipe(tslint.report('verbose'));
});

function test() {
    return gulp.src('out/debugger/test/**/*.test.js', { read: false })
        .pipe(mocha({ ui: 'tdd' }))
        .on('error', function(e) {
            log(e ? e.toString() : 'error in test task!');
            this.emit('end');
        });
}

gulp.task('build-test', ['build'], test);
gulp.task('test', test);

gulp.task('prepare-integration-tests', ['build'], function() {
    return executeCordovaCommand(path.resolve(__dirname, "test", "testProject"), "plugin add cordova-plugin-file");
});

gulp.task('watch-build-test', ['build', 'build-test'], function() {
    return gulp.watch(sources, ['build', 'build-test']);
});
