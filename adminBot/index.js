//modules i.e libraries
const fs = require('fs');
const dateFormat = require('dateformat');
const Discord = require('discord.js');
const client = new Discord.Client(); //client as bot

const prefix = '-'; //prefix for syntax command
const disboardPrefix = '!'; //prefix for disboard bot
const dynoPrefix = '?'; //prefix for dyno bot
var underLastBump = false; //false if bump interval duration is overdue, true if still under that duration
var bumpInterval = 7200000; //2 hours
var postTwoHourInterval = 1200000; //20 minutes for after 2 hours are up (for bumping)
var bumpAttempt = false; //false by default, true when "!d bump" is posted
var bumperUsername = ''; //username of whoever bumped disboard
var bumpReminderOn = true; //bump reminder switch; either on (reminding active) or off
var debateCommandArg = 'test'; //will be either a time stamp hh:mm or 'skip'
var debateMessage = []; //daily debate topics list
var dailyDebateInterval = 5000; //daily debate announcement interval
var dailyDebateTimer; //interval variable for daily debate announcements
var now; //time now.
var announcementDate; //time of the announcement
var today; //true if specified daily topic announcement date is today, false if tomorrow
var defaultAnnouncementHour = 12; //default daily topic announcement hour
var defaultAnnouncementMin = 00; //default daily topic announcement minute
var bumpDueDate = new Date(); //date of when a bump will be ready.


//daily debate announcement function
function dailyDebateAnnouncementFunc () 
{
    let skip = false;

    if (debateMessage.length > 0) 
    {
        client.channels.cache.get('703956480486932510').send('@everyone\n' + '**Today\'s Topic is:**\n\n' +
            debateMessage[0] + '\n<#719634952236302376>'); //daily debate announcement channel id
        
        skip = true;
    }
    else 
    {
        client.channels.cache.get('705358639296413779').send('Daily debate topics list is empty.\nNext announcement is default time.'); // staff chat channel id
    }

    debateMessage.shift();
    
    announcementTimeSetter(defaultAnnouncementHour, defaultAnnouncementMin, skip);    

    console.log('Daily Topic Announced at: ' + dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss'));
}

//sets announcement time function
function announcementTimeSetter (annHour, annMin, skip) 
{
    now = new Date();
    announcementDate = new Date();
    today = false;

    if (((now.getHours() === annHour &&
        now.getMinutes() < annMin) || 
        (now.getHours() < annHour)) &&
        !skip)
    {
        today = true;
    }

    if (today) //today
    { 
        announcementDate.setHours(annHour, annMin, 0, 0);
    }
    else //tomorrow
    { 
        announcementDate.setDate(now.getDate() + 1);
        announcementDate.setHours(annHour, annMin, 0, 0);
    }

    dailyDebateInterval = announcementDate.getTime() - now.getTime();
    
    clearInterval(dailyDebateTimer);
    dailyDebateTimer = setInterval(dailyDebateAnnouncementFunc, dailyDebateInterval);
                
}





//------------------------READY events-------------------------
//READY events
client.once('ready', () => 
{
    console.log('bumper is online!');
    underLastBump = false;
});

client.on('ready', () => 
{
    announcementTimeSetter(defaultAnnouncementHour, defaultAnnouncementMin, false);
});






//--------------------MESSAGE events----------------------------
client.on('message', message => 
{
    /*
        ignore trigger:
        -if bot (except disboard), OR
        -if does not start with ! or - or is empty
    */    
    if (message.author.bot && 
        (message.author.id.toString() !== '302050872383242240') && //disboard bot id
        (message.author.id.toString() !== '155149108183695360') //dyno bot id
        || 
        (!(message.content.startsWith(disboardPrefix)) && 
        !(message.content.startsWith(prefix)) && 
        !(message.content.startsWith(dynoPrefix)) &&(message.content.length !== 0))) 
    {     
        return;
    }



    /*
        Consider bump attempt:
        -not under interval duration, AND
        -message is "!d bump"
    */
    if (!underLastBump && message.content.toLowerCase().startsWith('!d bump')) 
    {
        bumpAttempt = true;
        bumperUsername = message.author.username;
    }
    /*
        Fixes Muted role perms in Gulag channel.
    */
    if (message.content.toLowerCase().startsWith('?mute')) 
    {
        setTimeout(() => 
        {
            let channel = message.guild.channels.cache.get('707533614841069679'); // gulag channel id
            let mutedRole = message.guild.roles.cache.get('704035549136027839'); // muted role id
    
            channel.updateOverwrite(mutedRole, {VIEW_CHANNEL: true, SEND_MESSAGES: true});
        }, 3000);
    }

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    /* 
        Disboard bump reminder:
        -if disboard bot posts, AND 
        -it's been less than the interval duration

        remind after disboard bumping interval (2 hours) of a bump,
        after that posts interval reminders until bumped again
    */
    if (message.author.bot 
        && message.author.id.toString() === '302050872383242240' //disboard bot id
        && !underLastBump
        && bumpAttempt) 
    { 
        bumpAttempt = false;
        underLastBump = true;
        console.log('BUMPED at ' + dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss') + '\n  by: ' + bumperUsername);
        bumperUsername = '';
        bumpDueDate = new Date();
        bumpDueDate.setTime(bumpDueDate.getTime() + bumpInterval);

        setTimeout(() => {
            underLastBump = false;
            if (bumpReminderOn)
            {
                client.channels.cache.get('733400573285761089').send('Disboard ready for a bump, mates.\nBump command is: !d bump'); //shared general channel id
            }
            console.log('BUMP REMINDER sent at: ' + dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss'));
            var reminderIntervals = setInterval (() => {
                if (underLastBump) {
                    clearInterval(reminderIntervals);
                }
                else {
                    if (bumpReminderOn)
                    {
                        client.channels.cache.get('733400573285761089').send('Disboard still waiting for that bump guys.\nBump Command is: !d bump'); //shared general channel id
                    }
                    console.log('BUMP REMINDER sent at: ' + dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss'));
                }
            }, postTwoHourInterval);
        }, bumpInterval);
    }
    /*
        Commands for bump details:
        -bump //gets time when I can bump
        -bump switch //switches reminder messages on and off
    */
    else if (command.toLowerCase() === 'bump') 
    {
        let now = new Date();
        
        if (args[0] === undefined)
        {
            if (now.getTime() > bumpDueDate.getTime())
            {
                message.channel.send('You can actually bump on Disboard now.');
            }
            else
            {
                message.channel.send('Current time is ' + dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss Z'));
                message.channel.send('Next Disboard bump due at ' + dateFormat(bumpDueDate, 'yyyy-mm-dd HH:MM:ss Z'));
            }
        }
        else if (args[0].toLowerCase() === 'switch')
        {
            bumpReminderOn = !bumpReminderOn;
            message.channel.send('Disboard bump reminder is now: ');
            if (bumpReminderOn)
            {
                message.channel.send('On.');
                console.log('BUMP REMINDER has been switched ON at ' + dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss') + ' by ' + message.author.username);
            }
            else
            {
                message.channel.send('Off.');
                console.log('BUMP REMINDER has been switched OFF at ' + dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss') + ' by ' + message.author.username);
            }
        }
    }
    /*
        nuking command:
        -if user has permission, AND
        -if channel exists, AND
        -if there is a channel tag passed, AND
        -if the argument passed is an actual channel tag (using regex)

        deletes channel and creates a new one with the same name and under same category
    */
    else if (command.toLowerCase() === 'nuke' && 
        (message.member.roles.cache.some(x => (x.name === 'President')) ||
        message.member.roles.cache.some(x => (x.name === 'Administrator')) ||
        message.member.roles.cache.some(x => (x.name === 'Moderator'))) &&
        args[0] !== undefined &&
        args[0].match(/(<#)(\d)+>/)) 
    {
        let channelSnowFlake = args[0];
        let channelID = channelSnowFlake.slice(2, channelSnowFlake.length - 1);

        let channelName = client.channels.cache.get(channelID).name;
        let channelParentID = client.channels.cache.get(channelID).parentID;

        client.channels.cache.get(channelID).delete();
        message.guild.channels.create(channelName, {type: 'text', parent: channelParentID});
        console.log('--' + channelName + ' CHANNEL NUKED at ' + dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss') + '\n  by: ' + message.author.username);
    }
    /*
        DAILY DEBATE ANNOUNCEMENT:

        -debate [HH:MM] //sets time, or return invalid time message

        -debate time //returns announcement time

        -debate clear //clear queue and returns confirmation message

        -debate skip //skips to default time
        //returns message with new announcement time

        -debate list //returns list of topics queued

        -debate queue [message] //queues up a topic

        -debate edit [message] //replace last topic with new topic

        -debate default [HH:MM] //replace default time

    */
    else if (command.toLowerCase() === 'debate' &&
        (message.member.roles.cache.some(x => (x.name === 'President')) ||
        message.member.roles.cache.some(x => (x.name === 'Administrator')) ||
        message.member.roles.cache.some(x => (x.name === 'Moderator')))) 
    {
        if (args.length > 0) 
        {
            debateCommandArg = args[0];

            if (debateCommandArg.match(/^[\d]{1,2}:[\d]{1,2}$/)) 
            {
                let time = debateCommandArg.split(':');
                let announcementHour = parseInt(time[0]);
                let announcementMin = parseInt(time[1]);
                
                if (announcementHour >= 0 && announcementHour < 24 &&
                    announcementMin >= 0 && announcementMin < 60) 
                {
                    announcementTimeSetter(announcementHour, announcementMin, false);
                }
                else 
                {
                    message.channel.send('The time you entered is invalid, idiot. Try again.');
                }
            }
            else if (debateCommandArg.toLowerCase() === 'time') 
            {
                message.channel.send('Current time is ' + dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss Z'));
                message.channel.send('Next daily topic announcement will be at: ' + dateFormat(announcementDate, 'yyyy-mm-dd HH:MM:ss Z'));
            }
            else if (debateCommandArg.toLowerCase() === 'list') 
            {
                if (debateMessage.length > 0) 
                {
                    message.channel.send('The queued lists of topics are as follows:\n');

                    for (let i = 0; i < debateMessage.length; i++) {
                        message.channel.send(debateMessage[i].toString());
                    }
                }
                else 
                {
                    message.channel.send('Topics\' list is empty');
                }

            }
            else if (debateCommandArg.toLowerCase() === 'clear') 
            {
                if (debateMessage.length > 0) 
                {
                    for (let i = 0; i < debateMessage.length; i++) {
                        debateMessage.pop();
                    }
                    debateMessage.pop();
                    message.channel.send('Topics\' list is cleared up (how many: ' + debateMessage.length + ')');
                }
                else 
                {
                    message.channel.send('Topics\' list is already empty (how many: ' + debateMessage.length + ')');
                }
            }
            else if (debateCommandArg.toLowerCase() === 'skip') 
            {
                announcementTimeSetter(defaultAnnouncementHour, defaultAnnouncementMin, true);

                message.channel.send(dateFormat('New Announcement time is: ' + announcementDate, 'yyyy-mm-dd HH:MM:ss'));
            }
            else if (args.length > 1 && debateCommandArg.toLowerCase() === 'queue') 
            {
                debateMessage.push('test');
                debateMessage[debateMessage.length - 1] = '';

                for (let i = 1; i < args.length; i++) 
                {
                    debateMessage[debateMessage.length - 1] += args[i] + ' ';
                }

                message.channel.send('The following topic has been queued:\n' + debateMessage[debateMessage.length - 1]);
            }
            else if (args.length > 1 && debateCommandArg.toLowerCase() === 'edit') 
            {
                if (debateMessage.length > 0) 
                {

                    message.channel.send('The following topic:\n' + debateMessage[debateMessage.length - 1]);
                    debateMessage[debateMessage.length - 1] = '';

                    for (let i = 1; i < args.length; i++) 
                    {
                        debateMessage[debateMessage.length - 1] += args[i] + ' ';
                    }

                    message.channel.send('\nHas been changed into the following:\n' + debateMessage[debateMessage.length - 1]);
                }
                else 
                {
                    message.channel.send('Nothing to edit you moron. The list is empty smh.');
                }
            }
            else if (args.length > 1 && debateCommandArg.toLowerCase() === 'default') 
            {
                if (args[1].match(/^[\d]{1,2}:[\d]{1,2}$/))
                {
                    let time = args[1].split(':');
                    defaultAnnouncementHour = parseInt(time[0]);
                    defaultAnnouncementMin = parseInt(time[1]);
                }
            }
        }
    }
});
//---------------------------------------------------------------
const key = fs.readFile('./key.txt', 'utf8');
client.login(key);