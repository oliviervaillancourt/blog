---
layout: post
title:  "Serving a complete application from a Serverless function to create reminders to check batteries in your smoke detectors"
subtitle: "How to print a QR code that once scanned, will automatically created a to-do task with a reminder in your Wunderlist account"
date:   2018-02-18 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: serverless
cover:  "/img/posts/serverless_wunderlist/Serverless-wunderlist-MainImage.jpg"
---

## In this blog post, we will look at creating a *complete* application that will add a task to your [Wunderlist] account by scanning a QR code.  The practical application will be to setup each smoke detector in my house with a QR code that, when scanned, creates a new reminder to check the batteries in my Wunderlist.  There are other means to do the same, but are they as much fun...

---

### The idea
Having a task list for 'house maintenance' stuff is nothing new.  I'm a big [Google Keep] user to help me remember everyday things.  However, typing is hard... so why don't try to automate the process of creating notes/tasks and having a bit of fun coding along the way.

Also, [in a previous post]({{ site.baseurl }}{% post_url 2017-12-22-Freedome-discount-using-serverless %}) I used a serverless platform ([Auth0 Webtask]) to save money.  That was a great nodeJs learning opportunity for me but it left me with a desire to try `async/await` in nodeJs which looked for familiar to me coming from the c# stack.

So I started with an idea in mind and changed a little bit (ok I re-questionned life entirely as I often do) and ended up with a small but complete application written in a serverless function.  Why you may ask? I guess because I could.

### How are we going to do this?
I'm not going explain all of the code. The basic idea is to setup a QR Code (print it and stick in on things) that will invoke our serverless function when scanned, like so:

`https://somedomain.com/wunderlist/create?title=Check some detector batteries&remindMeIn=P6M`

That serverless function will connect to our [Wunderlist] using the *Oauth2* api and create a task with the right due date and reminder set.  Since I use [Wunderlist] on my Android phone, I'll get notifications there.

> Why not use [Google Keep] instead of [Wunderlist] or any other to-do app?  To my great surprise, [Google Keep] does not have a public API to consume... If they have one, it's well hidden in Mordor or something.  Wunderlist API seemed fairly easy to consume.

### Can I try it now... but of course you can

The application can be tried at [https://wt-0f16a844544dd4ff702a586cbdc7ac53-0.sandbox.auth0-extend.com/wunderlist](https://wt-0f16a844544dd4ff702a586cbdc7ac53-0.sandbox.auth0-extend.com/wunderlist).  You will need to sign in to your [Wunderlist] account and grant permission to it, but it should work.  

### Code Highlight 1: Using `Express` from Within a [Auth0 Webtask] function

From the template that Webtask provide, I could figure the basic way to `Express` to work within a webtask

TODO: Add more details here 

### Code Highlight 2:  Using `Async/Await`

In a previous post, I used [Auth0 Webtask] serverless functionality to watch a twitter feed.  After that, I wanted to experiment with `async/await` in *javascript* a bit.  It happens that [Auth0 Webtask] now supports `Node8` which has support for `async/await`.  You can refer to [this article](https://tomasz.janczuk.org/2017/09/auth0-webtasks-and-node-8.html) on how to enable `Node8` on Webtask.

Here is the code I used

```js
    const listId = await getListId('House Maintenance', wHeaders);
    const newTaskId = await createTask(task, listId, wHeadersWithContentType);
    await createReminder(task, newTaskId, wHeadersWithContentType);
```

### Step 3: Let it rip... I mean test it out ;)

### Conclusion / Lessons learned / What's next
`async/await` is great.  Feels better to me than callback *'hell'*

[Wunderlist]: https://www.wunderlist.com
[Google Keep]: https://keep.google.com
[Auth0 Webtask] : https://webtask.io