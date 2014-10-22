// ==UserScript==
// @name        InstaSynchP ModSpy
// @namespace   InstaSynchP
// @description Log mod actions into the chat (kick, ban, remove videos, ...)

// @version     1
// @author      Zod-
// @source      https://github.com/Zod-/InstaSynchP-Modspy
// @license     GPL-3.0

// @include     http://*.instasynch.com/*
// @include     http://instasynch.com/*
// @include     http://*.instasync.com/*
// @include     http://instasync.com/*
// @grant       none
// @run-at      document-start

// @require     https://greasyfork.org/scripts/5647-instasynchp-library/code/InstaSynchP%20Library.js
// ==/UserScript==

function ModSpy(version) {
    "use strict";
    this.version = version;
    this.filterList = [
        /^Resynch request(?:ed)? ?(?:sent)?\.?\.$/,
        /cleaned the playlist/,
        /^play(?:ing)?$/,
        /Using HTML5 player is not recomended\./,
        /^load start$/,
        /^paused$/,
        /^stalled$/,
        /^activate$/
    ];
}

ModSpy.prototype.executeOnce = function () {
    "use strict";
    var th = this,
        oldLog = window.console.log,
        lastRemovedVideo,
        lastMovedVideoInfo,
        lastSkipPercentage,
        actionTaker,
        lastAction,
        bumpCheck;

    window.console.log = function (message) {
        var i,
            filter,
            match;
        //only check for strings
        if (typeof message !== 'string') {
            oldLog.apply(window.console, arguments);
            return;
        }

        //add as error message and then return
        if (message.startsWith("Error:")) {
            addErrorMessage(message);
            oldLog.apply(window.console, arguments);
            return;
        }

        filter = false;
        for (i = 0; i < th.filterList.length; i += 1) {
            if (message.match(th.filterList[i])) {
                filter = true;
                break;
            }
        }
        //return if setting is off or message is filtered
        if (filter) {
            oldLog.apply(window.console, arguments);
            return;
        }
        //prepare the message for each log
        if ((match = message.match(/([^\s]+) moved a video\./))) {
            message = '{0} {1} a <a href="{2}" target="_blank">video</a>'.format(match[1], bumpCheck ? 'bumped' : 'moved', urlParser.create(lastMovedVideoInfo));
            bumpCheck = false;
        } else if ((match = message.match(/([^\s]+) has banned a user\./))) {
            lastAction = 'banned';
            actiontaker = match[1];
        } else if ((match = message.match(/([^\s]+) has kicked a user\./))) {
            lastAction = 'kicked';
            actiontaker = match[1];
        } else if ((match = message.match(/([^\s]+) removed a video\./))) {
            message = '{0} removed a <a href="{1}" target="_blank">video</a> via {2}.'.format(match[1], urlParser.create(lastRemovedVideo.info), lastRemovedVideo.addedby);
        } else if ((match = message.match(/([^\s]+) modified skip ratio\./))) {
            message = '{0} set skip to {1}%'.format(match[1], lastSkipPercentage);
        }

        //add the message to the chat if we don't have to wait for the event to happen
        //user removed events gets fired after the log
        if (!lastAction) {
            addSystemMessage(message);
        }

        oldLog.apply(window.console, arguments);
    };

    events.on(th, 'RemoveUser', function (id, user) {
        //print the kick/ban log
        if (lastAction && (lastAction === 'banned' || lastAction === 'kicked')) {
            addSystemMessage('{0} has {1} {2}'.format(actiontaker, lastAction, user.username));
            lastAction = undefined;
            actiontaker = undefined;
        }
    });

    events.on(th, 'MoveVideo', function (vidinfo, position, oldPosition) {
        //save the vidinfo for the log
        lastMovedVideoInfo = vidinfo;
        //check if the video got bumped
        if (Math.abs(activeVideoIndex() - position) <= 10 && Math.abs(oldPosition - position) > 10) { // "It's a bump ! " - Amiral Ackbar
            bumpCheck = true;
        }
    });

    events.on(th, 'RemoveVideo', function (vidinfo, video, indexOfVid) {
        //save the video for the log
        lastRemovedVideo = video;
    });

    events.on(th, 'Skips', function (skips, skipsNeeded, percent) {
        //save the percentage for the log
        lastSkipPercentage = Math.round(percent * 100) / 100;
    });
};

window.plugins = window.plugins || {};
window.plugins.modSpy = new ModSpy("1");