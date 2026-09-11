#!/bin/bash
OUT="western-texas-holdem.html"

cat > "$OUT" << 'HEADER'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>荒野大镖客 · 德州扑克</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700;900&family=Noto+Serif+SC:wght@400;500;700;900&family=Rye&display=swap" rel="stylesheet">
  <style>
HEADER

cat css/style.css >> "$OUT"

cat >> "$OUT" << 'STYLEEND'
  </style>
</head>
<body>
STYLEEND

# body content from index.html (between <body> and first <script>)
sed -n '/<body>/,/<script src/p' index.html | head -n -1 >> "$OUT"

# inline all JS in order
cat >> "$OUT" << 'JSSTART'
  <script>
JSSTART

for f in js/deck.js js/handEvaluator.js js/ai.js js/game.js js/ui.js js/effects.js; do
  echo "// ===== $f =====" >> "$OUT"
  cat "$f" >> "$OUT"
  echo "" >> "$OUT"
done

cat >> "$OUT" << 'FOOTER'
  </script>
  <script>
    const ui = new UI();
    const game = new PokerGame(ui);
    window.addEventListener('DOMContentLoaded', () => {
      game.init();
      initDustParticles();
    });
  </script>
</body>
</html>
FOOTER

echo "Built: $OUT ($(wc -c < "$OUT") bytes)"
