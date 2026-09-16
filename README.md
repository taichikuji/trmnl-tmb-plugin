# TMB Alerts for TRMNL

A TRMNL plugin for current Barcelona Metro service notices, with full, half and quadrant layouts for TRMNL OG, BWRY and TRMNL X.

Install it [here](https://trmnl.com/recipes/247650)!

## Features

- Catalan, Spanish and English
- TMB-inspired line cards with official route colors
- A scannable link to TMB's live metro status page
- Severity-first compact views with affected-line notice counts
- Responsive overflow for TRMNL X landscape and portrait views
- Palette-aware colors for grayscale and four-ink BWRY screens
- Separate all-clear and unavailable-data states

## Local development

Open `TRMNL/` with [TRMNLP](https://github.com/usetrmnl/trmnlp), add local values for the three custom fields, then preview all four layouts. Run the rendering checks with `bun test`.

## References

- [TMB Developer portal](https://developer.tmb.cat/docs/getting-started)
- [TMB UI API endpoint](https://www.tmb.cat/en/barcelona-transport/status-metro-network)
- [TRMNL screen templating](https://docs.trmnl.com/go/private-plugins/templates)
- [TRMNL X guide](https://trmnl.com/framework/docs/3.3/trmnl_x_guide)
- [TRMNL color palettes](https://trmnl.com/framework/docs/color_palettes)
- [TRMNL QR code filter](https://help.usetrmnl.com/en/articles/10347358-custom-plugin-filters)
