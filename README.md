# Subtitle Tools

Tools for managing subtitle files in command line.

## Usage:

1. Install using `npm install -g subtitle-tools`
2. Run commands using `subtitle-tools [command...]`

## Commands:

### merge

Merge two or more subtitle files. Set output using `--output` or `-o`.

```bash
# Example:
> subtitle-tools merge ep01.ass op.ass ed.ass -o ep01-final.ass
```

Those are the line collision handling modes:

- `Overlap` (default) just disables checking, leave the renderer to handle it.
- `KeepFirst` keep lines from first files on collisions, remove the rest.
- `ChangeAlignment` move overlapping lines above, remove if they were already there.
- `ChangeStyle` changes style to `${style}_overlap` on collisions, remove if the style does not exist.

Those are the style collision handling modes:

- `Rename` (default) renames styles on collisions
- `KeepFirst` keep the first style on collisions.
- `KeepLast` keep the last style on collisions

Those are the layer handling modes:

- `Unchanged` (default) layers are not changed on collisions.
- `FirstAbove` keep the first line above on collisions.
- `LastAbove` keep the last line above on collisions.

Metadata sections such as Script Info and Aegisub Project Garbage are not merged by default. You can enable it with `--merge-metadata`.

If subtitle files have different resolutions all subtitles will be resampled to use the first subtitle resolution.

### list-fonts

List fonts and their variants used in one or more files.

```bash
# Example:
> subtitle-tools list-fonts op.ass ep01.ass ed.ass
Font A
Font A:bold
Font B
Font B:italic
Font C:bold:italic
```

## Notes:

- Only ASS v4.00+ files are supported, as it uses [ass-parser](https://npmjs.com/package/ass-parser).
- You can use `--help` do get more info about each command arguments.
- For programmatic use check functions defined in lib/utils.js.
- Subtitle resampling code was loosely translated from C++ using [arch1t3cht/Aegisub's code](https://github.com/arch1t3cht/Aegisub/blob/9591ce216f8ab14be7b1b32c27b98e6cde6a557f/src/resolution_resampler.cpp) as reference.
