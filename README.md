# Subtitle Tools

Tools for managing subtitle files in command line.

## Usage:

1. Install using `npm install subtitle-tools`
2. Run commands using `subtitle-tools [command...]`

## Commands:

### merge

Merge two or more subtitle files. Set output using `--output` or `-o`. Styles from the first files will be overwritten by others.

```bash
# Example:
> subtitle-tools merge op.ass ep01.ass ed.ass -o ep01-final.ass
```

### list-fonts

List fonts used in one or more files.

```bash
# Example:
> subtitle-tools list-fonts op.ass ep01.ass ed.ass
Font A
Font B
Font C
```

## Notes:

Only ASS files are supported, as it uses [ass-parser](https://npmjs.com/package/ass-parser).
