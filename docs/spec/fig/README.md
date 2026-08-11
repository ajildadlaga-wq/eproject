# Diagram sizing

Every figure is placed at 640 px wide in the document, which is 480 pt — the
full width of an A4 text column. A diagram's text therefore lands on the page
at `font_size / canvas_width * 480` points.

Below about 8 pt nobody can read it. So a hand-drawn SVG diagram wants a
canvas around **740 px wide with 13–14 px text**, and a Graphviz diagram wants
to stay under **1100 px** of natural width.

A diagram that will not fit that budget is too wide, not too small: lay it out
vertically, or split it in two.
