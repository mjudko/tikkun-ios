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
