#!/bin/bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "There are changes in your working tree, STOPPING.";
  exit 1;
else
  echo -e "I detected no changes in your working tree.\nIn 5 seconds, Imma start doing statistics by messing up your git.\nCTRL-C me, if you want this to stop.";
  sleep 5
fi

log=$(git log --oneline)

function grunt_size_in_git_commit()
{
  echo "DIRTY - git is dirty, DON'T STOP ME NOW!"

  git checkout $1 src Gruntfile.js

  # Some sed magic to get right info into the .csv file
  gruntline=$(./grunt build:advzip | tail -n 3 | head -n 1)
  size=$(echo $gruntline | sed "s/[^0-9]*//")
  size=$(echo $size | sed "s/[^(]*(\([0-9]*\).*/\1/")
  out=$(echo $gruntline | cut -c1-50)

  echo "$1; $size; $2; $out"
  echo "$1; $size; $2; $out;" >> doc/stats.csv
  git reset -q HEAD src Gruntfile.js
  git checkout src Gruntfile.js
  git clean -qf src

  echo "CLEAN - git is clean again for 1 sec, CTRL-C me now to stop w/ clean repo state."
  sleep 1
}

echo "COMMIT; BYTESIZE; OUTPUT;" >> doc/stats.csv

while read -r first line; do
  grunt_size_in_git_commit "$first" "$line"
done <<< "$log"
