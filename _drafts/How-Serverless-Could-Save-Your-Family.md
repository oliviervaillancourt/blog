---
layout: post
title:  "Using Serverless to create reminders to check/change batteries in your smoke detectors"
subtitle: "How to print a QR code that once scanned, automatically created a to-do task with a reminder in your Wunderlist account"
date:   2018-02-18 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: serverless
cover:  "/img/posts/serverless_wunderlist/Serverless-wunderlist-MainImage.jpg"
---

## In this blog post, we will cover how to use automatically create a task with reminder for your [Wunderlist] task list when scanning a QR code.  The practical application will be to setup each smoke detector in the my house to have it's own QR code and when scanned, a new reminder to check the batteries will appear in my Wunderlist.  There are other means to do the same, but are they as much fun...

---

### The idea
Having a task list for 'house maintenance' stuff is nothing new.  I'm a big [Google Keep] user to remember every things.  However, typing is hard... so why don't try to automate the process of creating notes/tasks and having a bit of fun coding along the way

### How are we going to do this?
QR code (or even bar code) can be created to store many kinds of information.  One of those is a url.  We will print QR code set with a serverless function invocation that includes some information like a task name and when should be reminded.

Something like: **https://somedomain.com/WunderlistTaskCreator?title=Check Smoke detector battery&remindMeIn=259200** *(259200 = 6 months x 30 days x 24 hours x 60 mins)*

That serverless function will connect to our [Wunderlist] and create a task with the right due date and reminder set.  Since I used [Wunderlist] on my Android phone, I'll get notifications right there

> Why not use [Google Keep] instead of [Wunderlist] or any other to-do app?  To my great surprise, [Google Keep] does not have a public API to consume... If they have one, it's well hidden in Mordor or something.  Wunderlist API seemed fairly easy to consume.

So the serverless function must
- accept a title and 'remind me in X mins" parameters
- Take those inputs, create a task and a reminder in [Wunderlist]
- Let us know that it worked

### Step 1: Create an application in [Wunderlist] 

### Step 2: Write the serverless function

### Step 3: Let it rip... I mean test it out ;)

[Wunderlist]: https://www.wunderlist.com
[Google Keep]: https://keep.google.com