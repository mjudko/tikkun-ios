#!/usr/bin/env python3
"""Build experimental width masters from the bundled Stam face.

The prototype changes only Hebrew letter glyphs. It uses a smooth horizontal
warp whose derivative is 1 at the outside edges, which keeps the outside
vertical strokes closer to their original weight than a plain scaleX. Combining
marks are left untouched; their OpenType attachment anchors are moved through
the same warp as their base glyph.

The outputs are renamed derivatives and retain the source font's embedded
copyright and license records.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Mapping

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


BASE_LETTERS = {
    "alef", "bet", "gimel", "dalet", "he", "vav", "zayin", "het", "tet",
    "yod", "finalkaf", "kaf", "lamed", "finalmem", "mem", "finalnun", "nun",
    "samekh", "ayin", "finalpe", "pe", "finaltsadi", "tsadi", "qof", "resh",
    "shin", "tav",
}

# The face's ccmp feature substitutes these for base letters when dagesh,
# shin/sin dots, rafe, or certain vowels are present. They need matching width
# masters so the pointed and unpointed pages continue to share metrics.
LETTER_VARIANTS = {
    "vavdbl", "vavyod", "yoddbl", "invertednun", "yodhiriq", "yodpatahdbl",
    "altayin", "shinshindot", "shinsindot", "shindageshshindot",
    "shindageshsindot", "alefpatah", "alefqamats", "alefmapiq", "betdagesh",
    "gimeldagesh", "daletdagesh", "hedagesh", "vavdagesh", "zayindagesh",
    "tetdagesh", "yoddagesh", "finalkafdagesh", "kafdagesh", "lameddagesh",
    "memdagesh", "nundagesh", "samekhdagesh", "finalpedagesh", "pedagesh",
    "tsadidagesh", "qofdagesh", "reshdagesh", "shindagesh", "tavdagesh",
    "vavholam", "betrafe", "kafrafe", "perafe", "aleflamed",
    "finalkafsheva", "finalkafqamats", "holamvav", "vavshindot", "lamedholam",
    "lameddageshholam", "gimelrafe", "daletrafe", "herafe", "tavrafe",
    "hiriqmem",
}

LAMED_GLYPHS = {"lamed", "lameddagesh", "lamedholam", "lameddageshholam"}

# These broad-roofed forms are the safest secondary candidates for a restrained
# handwritten-style extension. Final kaf is deliberately excluded: historical
# examples exist, but its extreme elongation is halakhically controversial.
ROOF_GLYPHS = {
    "bet", "betdagesh", "betrafe", "dalet", "daletdagesh", "daletrafe",
    "he", "hedagesh", "herafe", "het", "kaf", "kafdagesh", "kafrafe",
    "mem", "memdagesh", "finalmem", "resh", "reshdagesh", "tav",
    "tavdagesh", "tavrafe",
}


def smoothstep(value: float) -> float:
    return value * value * (3 - 2 * value)


def warp_x(value: float, x_min: float, x_max: float, factor: float) -> int:
    width = x_max - x_min
    if width <= 0:
        return round(value)
    position = max(0.0, min(1.0, (value - x_min) / width))
    return round(value + width * (factor - 1) * smoothstep(position))


def transformed_glyph(glyph_set, glyph_name: str, x_min: int, x_max: int, factor: float):
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[glyph_name].draw(recording)
    output = TTGlyphPen(None)

    for operation, points in recording.value:
        if operation in {"moveTo", "lineTo", "curveTo", "qCurveTo"}:
            warped = tuple(
                None if point is None else (warp_x(point[0], x_min, x_max, factor), point[1])
                for point in points
            )
            getattr(output, operation)(*warped)
        else:
            getattr(output, operation)()
    return output.glyph()


def update_attachment_anchors(
    font: TTFont,
    bounds: dict[str, tuple[int, int]],
    factors: Mapping[str, float],
) -> None:
    if "GPOS" not in font:
        return
    seen: set[int] = set()

    def update(anchor, glyph_name: str) -> None:
        if anchor is None or glyph_name not in bounds or not hasattr(anchor, "XCoordinate"):
            return
        x_min, x_max = bounds[glyph_name]
        anchor.XCoordinate = warp_x(anchor.XCoordinate, x_min, x_max, factors[glyph_name])

    def visit(value) -> None:
        if value is None or isinstance(value, (str, bytes, int, float, bool)):
            return
        identifier = id(value)
        if identifier in seen:
            return
        seen.add(identifier)

        coverage = getattr(value, "BaseCoverage", None)
        base_array = getattr(value, "BaseArray", None)
        if coverage is not None and base_array is not None:
            for glyph_name, record in zip(coverage.glyphs, base_array.BaseRecord):
                for anchor in record.BaseAnchor:
                    update(anchor, glyph_name)

        ligature_coverage = getattr(value, "LigatureCoverage", None)
        ligature_array = getattr(value, "LigatureArray", None)
        if ligature_coverage is not None and ligature_array is not None:
            for glyph_name, attach in zip(ligature_coverage.glyphs, ligature_array.LigatureAttach):
                for component in attach.ComponentRecord:
                    for anchor in component.LigatureAnchor:
                        update(anchor, glyph_name)

        if isinstance(value, (list, tuple)):
            for item in value:
                visit(item)
            return
        if isinstance(value, dict):
            for item in value.values():
                visit(item)
            return
        try:
            children = vars(value).values()
        except TypeError:
            return
        for child in children:
            visit(child)

    visit(font["GPOS"].table)


def rename_font(font: TTFont, family: str, postscript_name: str, recipe: str) -> None:
    name = font["name"]
    values = {
        1: family,
        2: "Regular",
        3: f"{postscript_name}; prototype 0.2; {recipe}",
        4: family,
        5: "Version 0.2; 2026; experimental width derivative",
        6: postscript_name,
        16: family,
        17: "Regular",
    }
    for record in list(name.names):
        if record.nameID not in values:
            continue
        name.setName(values[record.nameID], record.nameID, record.platformID, record.platEncID, record.langID)


def refresh_horizontal_header(font: TTFont) -> None:
    glyf = font["glyf"]
    metrics = font["hmtx"].metrics
    widths: list[tuple[int, int, int]] = []
    for glyph_name in font.getGlyphOrder():
        glyph = glyf[glyph_name]
        glyph.recalcBounds(glyf)
        advance, left_side_bearing = metrics[glyph_name]
        outline_width = max(0, getattr(glyph, "xMax", 0) - getattr(glyph, "xMin", 0))
        widths.append((advance, left_side_bearing, outline_width))

    hhea = font["hhea"]
    hhea.advanceWidthMax = max(advance for advance, _, _ in widths)
    hhea.minLeftSideBearing = min(left for _, left, _ in widths)
    hhea.minRightSideBearing = min(advance - left - width for advance, left, width in widths)
    hhea.xMaxExtent = max(left + width for _, left, width in widths)

    head = font["head"]
    head.xMin = min(getattr(glyf[name], "xMin", 0) for name in font.getGlyphOrder())
    head.xMax = max(getattr(glyf[name], "xMax", 0) for name in font.getGlyphOrder())


def build_variant(
    source: Path,
    destination: Path,
    default_factor: float,
    label: str,
    overrides: Mapping[str, float] | None = None,
) -> None:
    font = TTFont(source)
    glyph_set = font.getGlyphSet()
    glyf = font["glyf"]
    metrics = font["hmtx"].metrics
    targets = (BASE_LETTERS | LETTER_VARIANTS) & set(font.getGlyphOrder())
    overrides = overrides or {}
    factors = {glyph_name: overrides.get(glyph_name, default_factor) for glyph_name in targets}
    bounds = {
        glyph_name: (getattr(glyf[glyph_name], "xMin", 0), getattr(glyf[glyph_name], "xMax", 0))
        for glyph_name in targets
    }

    transformed = {
        glyph_name: transformed_glyph(glyph_set, glyph_name, *bounds[glyph_name], factors[glyph_name])
        for glyph_name in targets
    }
    for glyph_name, glyph in transformed.items():
        x_min, x_max = bounds[glyph_name]
        original_advance, original_lsb = metrics[glyph_name]
        width_delta = round((x_max - x_min) * (factors[glyph_name] - 1))
        glyf[glyph_name] = glyph
        metrics[glyph_name] = (max(0, original_advance + width_delta), original_lsb)

    update_attachment_anchors(font, bounds, factors)
    recipe = f"base {default_factor:.3f}"
    if overrides:
        recipe += "; staged scribal extensions"
    rename_font(font, f"Tikkun Stam Prototype {label}", f"TikkunStamProto-{label}", recipe)
    refresh_horizontal_header(font)
    font.recalcBBoxes = True
    destination.parent.mkdir(parents=True, exist_ok=True)
    font.save(destination)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("public/fonts/ShlomosemiStam.ttf"))
    parser.add_argument("--output", type=Path, default=Path("public/fonts"))
    args = parser.parse_args()
    build_variant(args.source, args.output / "TikkunStamProto-Narrow.ttf", 0.94, "Narrow")
    build_variant(args.source, args.output / "TikkunStamProto-Wide.ttf", 1.08, "Wide")
    stages = [
        ("Scribe1", 1.28, 1.15),
        ("Scribe2", 1.62, 1.24),
        ("Scribe3", 2.05, 1.36),
    ]
    for label, lamed_factor, roof_factor in stages:
        factors = {glyph_name: lamed_factor for glyph_name in LAMED_GLYPHS}
        factors.update({glyph_name: roof_factor for glyph_name in ROOF_GLYPHS})
        build_variant(
            args.source,
            args.output / f"TikkunStamProto-{label}.ttf",
            1.08,
            label,
            factors,
        )


if __name__ == "__main__":
    main()
