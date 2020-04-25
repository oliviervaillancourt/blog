This is where I keep the source for my blog which is hosted at [https://oliviervaillancourt.com](https://oliviervaillancourt.com).

## how to run locally using docker

```
git clone

cd blog

docker run --rm --volume="${PWD}:/srv/jekyll" -p:4000:4000 -it jekyll/jekyll:3.8 jekyll serve --force_polling
```

Look for updated version (`3.8` in example above) tag the docker container 

## Attribution
For theming, I'm using the 'Centrarium' Jekyll theme from https://github.com/bencentra/centrarium.  