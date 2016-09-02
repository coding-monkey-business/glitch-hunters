#!/bin/bash

# Navigate to project root folder.
BASEDIR=$(dirname "$0")
cd "$BASEDIR/.."

# Set force option based on input params.
force=$1

function prepend_csv()
{
  line=$(printf "%-7s | %+8s | %+8s | %-60s | %s" "$1" "$2" "$3" "$4" "$5")

  if [ ! -z "$6" ]; then
    echo $line
  fi

  # Some shell magic to prepend files.
  echo -e "$line\n$(cat doc/statistics.csv)" > doc/statistics.csv
}

function grunt_size_in_git_commit()
{
  echo "START - $1"

  if grep -Fq "$1" doc/statistics.csv; then
    echo "EXIT  - commit ($1) already processed"
    return
  fi

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
  diff=$(expr $size - $last_size 2> /dev/null)

  prepend_csv "$commit" "$size" "$diff" "$message" "$out" true

  last_size=$size

  git reset -q HEAD src Gruntfile.js
  git checkout src Gruntfile.js
  git clean -qf src

  echo "CLEAN - git is clean again for 1 sec, CTRL-C me now to stop w/ clean repo state."

  # If force, then no wait.
  if [ -z "$force" ]; then
    sleep 1
  fi
}

function main()
{
  # Check if git is okay.
  if [ -z "$force" ]; then
    if [ -n "$(git status --porcelain)" ]; then
      echo "There are changes in your working tree, STOPPING.";
      exit 1;
    else
      echo -e "I detected no changes in your working tree.\nIn 3 seconds, Imma start doing statistics by messing up your git.\nCTRL-C me, if you want this to stop.";
      sleep 3
    fi
  fi

  # Remove header.
  sed -i '/COMMIT.*/d' doc/statistics.csv

  # Try to load last size.
  last_size=$(head -n 1 doc/statistics.csv | awk '{print $3}')

  if [ -z "$last_size" ]; then
    last_size=0
  fi

  # Get commit hashes reversed.
  log=$(git log --oneline | tac)

  while read -r first line; do
    grunt_size_in_git_commit "$first" "$line"
  done <<< "$log"

  prepend_csv "COMMIT" "SIZE" "DIFF" "MESSAGE" "OUTPUT"
}

main
