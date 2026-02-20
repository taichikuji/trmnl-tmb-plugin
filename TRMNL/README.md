# TRMNL Frank Energie Plugin

A TRMNL plugin to display Frank Energie electricity and gas prices.

## Icon

The plugin icon is stored in the TRMNL bundle and referenced from settings.yml.

<div align="center">
	<img src="media/icon.svg" alt="Plugin Icon" width="90">
</div>

## Previews

| Full View | Half Horizontal View |
|------------|----------------------|
| ![Full View](media/preview_full.webp) | ![Half Horizontal View](media/preview_half_horizontal.webp) |

| Half Vertical View | Quadrant View |
|-------------------|----------------|
| ![Half Vertical View](media/preview_half_vertical.webp) | ![Quadrant View](media/preview_quadrant.webp) |

## Templates

- **full.liquid**: Default view with current price, daily average, and 24h chart.
- **half_horizontal**.liquid and **half_vertical.liquid**: Compact variants of the full view.
- **quadrant.liquid**: Minimal view without the chart for tighter layouts.
