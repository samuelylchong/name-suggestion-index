var fs = require('fs');
var filter = require('./filter.json');
var raw = require('./topNames.json');
var canon = require('./canonical.json');
var correctNames = buildReverseIndex(canon);
var stringify = require('json-stable-stringify');

var out = {};
var defined = {};

// convert discardedNames to lowerCase as we compare against
// lowerCase later on and as changing case is locale specific
// converting in code will at least use the same locale
var len = filter.discardedNamesOverall.length;
for (var i = 0; i < len; i++) {
    filter.discardedNamesOverall[i] = filter.discardedNamesOverall[i].toLowerCase();
}

for (var fullName in raw) {
    filterValues(fullName);
}

function buildReverseIndex(canon) {
    var rIndex = {};
    for (var can in canon) {
        if (canon[can].matches) {
            for (var i = canon[can].matches.length - 1; i >= 0; i--) {
                var match = canon[can].matches[i];
                rIndex[match] = can;
            }
        }
    }
    return rIndex;
}

function filterValues(fullName) {
    var theName = fullName.split('|', 2);
    var tag = theName[0].split('/', 2);
    var key = tag[0];
    var value = tag[1];

    theName = theName[1];
    var theNameLower = theName.toLowerCase();
    if (filter.wanted[key] &&
        filter.wanted[key].indexOf(value) !== -1 &&
        filter.discardedNamesOverall.indexOf(theNameLower) == -1) {
        var len = filter.discardPatterns.length;
        for (var i = 0; i < len; i++) { // maybe this should use regexps
            if (theName.indexOf(filter.discardPatterns[i])>-1) return;
        }
        // discard any object specific names we don't want
        if (filter.discardedNames[key] && filter.discardedNames[key][value]) {
            var toDiscard = filter.discardedNames[key][value];
            len = toDiscard.length;
            for (var i = 0; i < len; i++) {
              if (theNameLower===toDiscard[i]) return;
            }
        }
        //
        if (correctNames[theName]) theName = correctNames[theName];
        set(key, value, theName, raw[fullName]);
    }
}

function set(k, v, name, count) {
    if (!out[k]) out[k] = {};
    if (!out[k][v]) out[k][v] = {};
    if (!out[k][v][name]) {
        if (canon[name] && canon[name].nix_value) {
            for (var i = 0; i < canon[name].nix_value.length; i++) {
                if (canon[name].nix_value[i] == v) return;
            }
        }

        if (defined[name]) {
            var string = name;
            for (var i = 0; i < defined[name].length; i++) {
                string += '\n\t in ' + defined[name][i] + ' - ';
                var kv = defined[name][i].split('/');
                string += out[kv[0]][kv[1]][name].count + ' times';
            }
            console.log(string + '\n\t and ' + k + '/' + v + ' - ' + count + ' times');
        }

        out[k][v][name] = {count: count};
        if (defined[name]) {
            defined[name].push(k + '/' + v);
        } else {
            defined[name] = [k + '/' + v];
        }
    } else {
        out[k][v][name].count += count;
    }

    if (canon[name]) {
        for (var tag in canon[name].tags) {
            if (!out[k][v][name].tags) out[k][v][name].tags = {};
            out[k][v][name].tags[tag] = canon[name].tags[tag];
        }
    }
}

fs.writeFileSync('name-suggestions.json', stringify(out, { space: '    '}));
fs.writeFileSync('name-suggestions.min.json', stringify(out));
