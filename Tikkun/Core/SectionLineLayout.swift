import Foundation

/// Places naturally spaced fragments from right to left. Surplus width belongs
/// to the section break, not to the spaces between words inside a fragment.
struct SectionLineLayout {
    let scale: Double
    let offsetsFromRight: [Double]

    init(widths: [Double], availableWidth: Double, minimumGap: Double, openEnding: Bool) {
        let internalGaps = max(0, widths.count - 1)
        let reservedGaps = internalGaps + (openEnding ? 1 : 0)
        let naturalWidth = widths.reduce(0, +)
        let required = naturalWidth + Double(reservedGaps) * minimumGap
        scale = min(1, max(0, availableWidth) / max(1, required))
        let internalGap = !openEnding && internalGaps > 0
            ? max(0, availableWidth - naturalWidth * scale) / Double(internalGaps)
            : minimumGap * scale
        var offset = 0.0
        var offsets: [Double] = []
        for width in widths {
            offsets.append(offset)
            offset += width * scale + internalGap
        }
        offsetsFromRight = offsets
    }
}

/// The song's three-brick rows anchor at both edges and the center; two-brick
/// rows anchor at the edges. Fit the whole row uniformly to preserve type size.
struct SongLineLayout {
    let scale: Double
    let offsetsFromRight: [Double]

    init(widths: [Double], availableWidth: Double, minimumGap: Double) {
        let width = max(1, availableWidth)
        if widths.count == 3 {
            let required = max(2 * widths[0] + widths[1] + 2 * minimumGap,
                               2 * widths[2] + widths[1] + 2 * minimumGap)
            scale = min(1, width / max(1, required))
            offsetsFromRight = [0, (width - widths[1] * scale) / 2, width - widths[2] * scale]
        } else {
            scale = min(1, width / max(1, widths.reduce(0, +) + minimumGap * Double(max(0, widths.count - 1))))
            offsetsFromRight = widths.count == 2 ? [0, width - widths[1] * scale] : [0]
        }
    }
}
