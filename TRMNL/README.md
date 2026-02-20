# TRMNL TMB Plugin

A TRMNL plugin to display TMB ( Barcelona Metro ) service status and outages.

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

- **full.liquid**: Default view clear view of Metro Line, destination name, description and status of outage.
- **half_horizontal**.liquid and **half_vertical.liquid**: Compact variants of the full view.
- **quadrant.liquid**: Minimal view. Displays the most most grave status.
