#!/bin/bash

HTML_FILE="index.html"

# Store the array items passed as arguments
items=("$@")

# --- Generate HTML Snippets ---
# Generate the <li> elements to be added to ul#shop
SHOP_ITEMS=""
for item in "${items[@]}"; do
  lowercased_item=$(echo "$item" | tr '[:upper:]' '[:lower:]')
  SHOP_ITEMS+="<li><ul id=\"s-${lowercased_item}\"></ul></li>"
done
SHOP_ITEMS+="<li><ul id=\"s-other\"></ul></li>"

# Generate the <li> elements to be added to ul#stock
STOCK_ITEMS=""
for item in "${items[@]}"; do
  lowercased_item=$(echo "$item" | tr '[:upper:]' '[:lower:]')
  STOCK_ITEMS+="<li><ul id=\"v-${lowercased_item}\"></ul></li>"
done
STOCK_ITEMS+="<li><ul id=\"v-other\"></ul></li>"

# --- AWK Script for HTML Modification ---
awk_script='
{
    # Create a mutable copy of the current line to work with
    modified_line = $0;

    # --- Handle ul#shop ---
    # Check if the current line contains the opening <ul id="shop"> tag
    if (modified_line ~ /<ul id="shop">/) {
        # Check if the closing </ul> tag is also on the same line
        if (modified_line ~ /<\/ul>/) {
            # If both tags are on the same line (e.g., <ul id="shop"></ul>),
            sub(/<ul id="shop"><\/ul>/, "<ul id=\"shop\">" shop_items "</ul>", modified_line);
            print modified_line; # Print the modified line
            next; # Move to the next line, skipping further processing for this one
        } else {
            # If only the opening <ul> tag is on this line (multi-line scenario),
            # print the current line (the opening tag) and then print the SHOP_ITEMS.
            print modified_line;
            print shop_items;
            next; # Move to the next line, skipping further processing for this one
        }
    }

    # --- Handle ul#stock ---
    # Check if the current line contains the opening <ul id="stock"> tag
    if (modified_line ~ /<ul id="stock">/) {
        # Check if the closing </ul> tag is also on the same line
        if (modified_line ~ /<\/ul>/) {
            # If both tags are on the same line, insert STOCK_ITEMS directly
            sub(/<ul id="stock"><\/ul>/, "<ul id=\"stock\">" stock_items "</ul>", modified_line);
            print modified_line; # Print the modified line
            next; # Move to the next line
        } else {
            # If only the opening <ul> tag is on this line,
            # print the current line and then print the STOCK_ITEMS.
            print modified_line;
            print stock_items;
            next; # Move to the next line
        }
    }

    # For all other lines (not the target <ul> lines), just print them as they are
    print;
}
'

# --- Execute AWK and Update File ---
# Create a temporary file to store the modified HTML content
TEMP_FILE=$(mktemp)

# Execute the AWK script:
# -v shop_items="$SHOP_ITEMS": Passes the generated SHOP_ITEMS into the AWK script as a variable.
# -v stock_items="$STOCK_ITEMS": Passes the generated STOCK_ITEMS into the AWK script as a variable.
# "$awk_script": Provides the AWK script content to awk.
# "$HTML_FILE": Specifies the input HTML file.
# > "$TEMP_FILE": Redirects the output of AWK to the temporary file.
awk -v shop_items="$SHOP_ITEMS" -v stock_items="$STOCK_ITEMS" "$awk_script" "$HTML_FILE" > "$TEMP_FILE"

# Check if the AWK command executed successfully
if [ $? -eq 0 ]; then
  echo "$TEMP_FILE"

