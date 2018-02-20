---
layout: post
title:  "Using Serverless to create reminders to check/change batteries in your smoke detectors"
subtitle: "How to print a QR code that once scanned, automatically created a to-do task with a reminder in your Wunderlist account"
date:   2018-02-18 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: serverless
cover:  "/img/posts/serverless_wunderlist/Serverless-wunderlist-MainImage.jpg"
---

## In this blog post, we will cover how to create a task with reminder for your [Wunderlist] task list by scanning a QR code.  The practical application will be to setup each smoke detector in my house with a QR code that, when scanned, creates a new reminder to check the batteries in my Wunderlist.  There are other means to do the same, but are they as much fun...

---

### The idea
Having a task list for 'house maintenance' stuff is nothing new.  I'm a big [Google Keep] user to help me remember every things.  However, typing is hard... so why don't try to automate the process of creating notes/tasks and having a bit of fun coding along the way.

### How are we going to do this?
QR code (or even bar code) can be created to store many kinds of information.  One of those is a url.  We will print QR code set to the url of a serverless function.  That url will include a task name and when should be reminded.

Something like: **https://somedomain.com/WunderlistTaskCreator?title=Check Smoke detector battery&remindMeIn=259200** *(259200 = 6 months x 30 days x 24 hours x 60 mins)*

That serverless function will connect to our [Wunderlist] and create a task with the right due date and reminder set.  Since I used [Wunderlist] on my Android phone, I'll get notifications right there.

> Why not use [Google Keep] instead of [Wunderlist] or any other to-do app?  To my great surprise, [Google Keep] does not have a public API to consume... If they have one, it's well hidden in Mordor or something.  Wunderlist API seemed fairly easy to consume.

So the serverless function must
- accept a title and a 'remind me in X mins" parameter
- Take those inputs, create a task and a reminder in [Wunderlist]
- Let us know that it worked

### Step 1: Create an application in [Wunderlist] 

### Step 2: Write the serverless function

In a previous post, I used [Auth0 Webtask] serverless functionality to watch a twitter feed.  After that, I wanted to experiment with `async/await` in *javascript* a bit.  It happens that [Auth0 Webtask] now supports `Node8` which has support for `async/await`.  You can refer to [this article](https://tomasz.janczuk.org/2017/09/auth0-webtasks-and-node-8.html) on how to enable `Node8` on Webtask.

Here is the code I used

```js
var { DateTime } = require('luxon');
const axios = require('axios');

const wListsUrl = 'https://a.wunderlist.com/api/v1/lists';
const wTaskCreateUrl = 'https://a.wunderlist.com/api/v1/tasks';
const wReminderCreateUrl = 'https://a.wunderlist.com/api/v1/reminders';

module.exports = async function(context, req, res) {
  if (req.query.authToken !== context.secrets.AUTHENTICATION_KEY) {
    res.writeHead(401);
    res.end('Invalid auth key');
    return;
  }

  const task = {
    title: req.query.title,
    reminderDate: DateTime.local()
      .setZone('America/New_York')
      .plus({ minutes: parseInt(req.query.frequencyInMins) }),
  };

  try {
    // Setting HTTP request headers for calls to Wunderlist API
    const wHeaders = {};
    wHeaders['X-Access-Token'] = context.secrets.WUNDERLIST_ACCESS_TOKEN;
    wHeaders['X-Client-ID'] = context.secrets.WUNDERLIST_CLIENT_ID;
    const wHeadersWithContentType = Object.assign({}, wHeaders);
    wHeadersWithContentType['Content-Type'] = 'application/json';

    // The payload
    const listId = await getListId('House Maintenance', wHeaders);
    const newTaskId = await createTask(task, listId, wHeadersWithContentType);
    await createReminder(task, newTaskId, wHeadersWithContentType);
  } catch (error) {
    console.log(`Error : ${error}`);
    res.writeHead(500, { 'Content-Type': 'text/html ' });
    res.end(`<h1>some error: ${error}</h1>`);
  }

  res.writeHead(200, { 'Content-Type': 'text/html ' });
  res.end(
    `<h1>WunderList note created and reminder set!</h1>
    <span>Title: ${task.title}</span>
    <br>
    <span>Due Date: ${task.reminderDate.toFormat('yyyy-MM-dd')}</span>`
  );
};

async function getListId(listName, wHeaders) {
  const wListsReponses = await axios.get(wListsUrl, { headers: wHeaders });
  const wLists = wListsReponses.data;

  const houseMaintenanceList = wLists.filter(
    list => list.title === listName
  )[0];
  return houseMaintenanceList.id;
}

async function createTask(task, listId, wHeadersWithContentType) {
  const wTaskCreateBody = {
    list_id: listId,
    title: task.title,
    due_date: task.reminderDate.toFormat('yyyy-MM-dd'),
    starred: false,
  };

  const wTaskResponse = await axios.post(wTaskCreateUrl, wTaskCreateBody, {
    headers: wHeadersWithContentType,
  });
  return wTaskResponse.data.id;
}

async function createReminder(task, taskId, wHeadersWithContentType) {
  const wTaskReminderCreateBody = {
    task_id: taskId,
    date: task.reminderDate.toUTC().toISO(),
  };

  await axios.post(wReminderCreateUrl, wTaskReminderCreateBody, {
    headers: wHeadersWithContentType,
  });
}
```

Let's break it down a bit...

The code assumes my [Wunderlist] has a list named `House Maintenance`, create a task in that list and sets a reminder in that task.  All of those are those are done through `https` calls.  You can see we just `await` those calls that need to be done sequentially. 

```js
    const listId = await getListId('House Maintenance', wHeaders);
    const newTaskId = await createTask(task, listId, wHeadersWithContentType);
    await createReminder(task, newTaskId, wHeadersWithContentType);
```

The `https` call are made using `Axios`, it's lends itself really well to api invocation since it auto-parse `JSON` response back and also automatically throws `Errors` on non 2xx response. Each call to the [Wunderlist] api needs proper authentication.  These are the `X-Access-Token` and `X-Client-ID` headers acquired from the previous above.

```js
    wHeaders['X-Access-Token'] = context.secrets.WUNDERLIST_ACCESS_TOKEN;
    wHeaders['X-Client-ID'] = context.secrets.WUNDERLIST_CLIENT_ID;
    ...
    const wListsReponses = await axios.get(wListsUrl, { headers: wHeaders });
```

> Notice that we are using the *Secret* feature of Webtask.  This is great way to keep those secrets safe and avoid checking them into github... you wouldn't your mom to see your secret wouldn't you ;)

Lastly, we need something of authorization for the function.  I don't want anyone to be able to add task to my [Wunderlist].  Although I'm not a huge fan of authentication key on the query string because those tend to be logged by web server and can be leaked, in this case since the QR code scanning can not add http `Headers` this will have to do for now... 

 ```js
 if (req.query.authToken !== context.secrets.AUTHENTICATION_KEY) {
    res.writeHead(401);
    res.end('Invalid auth key');
    return;
  }
 ```

### Step 3: Let it rip... I mean test it out ;)

### Conclusion / Lessons learned / What's next
`async/await` is great.  Feels better to me than callback *'hell'*

[Wunderlist]: https://www.wunderlist.com
[Google Keep]: https://keep.google.com
[Auth0 Webtask] : https://webtask.io