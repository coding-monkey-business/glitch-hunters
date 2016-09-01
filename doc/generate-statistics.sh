#!/bin/bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/.."
ignore_sleep=$1

if [ -n "$(git status --porcelain)" ]; then
  echo "There are changes in your working tree, STOPPING.";
  exit 1;
else
  echo -e "I detected no changes in your working tree.\nIn 5 seconds, Imma start doing statistics by messing up your git.\nCTRL-C me, if you want this to stop.";
  sleep 5
fi

log=$(git log --oneline)

function append_csv()
{
  if [ ! -z "$5" ]; then
    printf "%-7s | %-8s | %-60s | %s\n" "$1" "$2" "$3" "$4"
  fi

  printf "%-7s | %-8s | %-60s | %s\n" "$1" "$2" "$3" "$4" >> doc/stats.csv
}

function grunt_size_in_git_commit()
{
  echo "DIRTY - git is dirty, DON'T STOP ME NOW!"

  git checkout $1 src Gruntfile.js

  # Some sed magic to get right info into the .csv file
  gruntline=$(./grunt build:advzip | tail -n 3 | head -n 1)
  size=$(echo $gruntline | sed "s/[^0-9]*//")
  size=$(echo $size | sed "s/[^(]*(\([0-9]*\).*/\1/")
  size=$(echo $size | cut -c1-8)
  out=$(echo $gruntline | cut -c1-60)
  message=$(echo $2 | cut -c1-60)
  commit=$1

  append_csv "$commit" "$size" "$message" "$out" true

  git reset -q HEAD src Gruntfile.js
  git checkout src Gruntfile.js
  git clean -qf src

  echo "CLEAN - git is clean again for 1 sec, CTRL-C me now to stop w/ clean repo state."

  # If ignore_sleep, then we wait.
  if [ -z "$ignore_sleep" ]; then
    sleep 1
  fi
}

append_csv "COMMIT" "BYTESIZE" "COMMIT" "MESSAGE" "OUTPUT"

while read -r first line; do
  grunt_size_in_git_commit "$first" "$line"
done <<< "$log"
