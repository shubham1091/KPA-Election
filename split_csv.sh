#!/bin/bash

# Check if input file is provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 <input_file.csv>"
  exit 1
fi

input_file="$1"
lines_per_file=500  # You can change this number if needed

# Extract header
header=$(head -n 1 "$input_file")

# Remove header and split the remaining lines
tail -n +2 "$input_file" | split -l "$lines_per_file" - "${input_file%.csv}_part_"

# Add header to each split file
count=1
for f in ${input_file%.csv}_part_*; do
  echo "$header" > "output_part_${count}.csv"
  cat "$f" >> "output_part_${count}.csv"
  rm "$f"  # remove temporary file
  ((count++))
done

echo "✅ Done! Split into $((count - 1)) files."
