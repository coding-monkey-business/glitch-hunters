#!/bin/bash

if [ -n "$(git status --porcelain)" ]; then
  echo "There are changes in your working tree, STOPPING.";
  exit 1;
else
  echo "I detected no changes in your working tree, in 5 seconds, imma start doing statistics by messing up your git, CTRL-C me, if you want this to stop.";
  sleep 5
fi

log=$(git log --oneline)
# log=$(git log --oneline | tac)

function grunt_size_in_git_commit()
{
  git checkout $1 src Gruntfile.js
  gruntline=$(./grunt build:advzip | tail -n 3 | head -n 1)
  # Remove color escapes with sed, if needed.
  # size=$(echo $gruntline | sed -r "s/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]//" )
  echo $gruntline
  size=$(echo $gruntline | sed "s/[^0-9]*//")
  size=$(echo $size | sed "s/[^(]*(\([0-9]*\).*/\1/")
  out=$(echo $gruntline | cut -c1-50)

  echo "$1; $size; $2; $out"
  echo "$1; $size; $2; $out;" >> stats.csv
  git reset -q HEAD src Gruntfile.js
  git checkout src Gruntfile.js
  git clean -qf src
}

echo "COMMIT; BYTESIZE; OUTPUT;" >> stats.csv

while read -r first line; do
  grunt_size_in_git_commit "$first" "$line"
done <<< "$log"
