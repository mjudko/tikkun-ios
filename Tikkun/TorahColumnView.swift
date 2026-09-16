import SwiftUI
import CoreText

struct TorahColumnView: View {
    let column: TorahColumn
    let vowels: Bool
    let trope: Bool
    let showAliyahMarkers: Bool
    @Environment(\.colorScheme) private var colorScheme

    private var displaysAliyahMarkers: Bool { showAliyahMarkers && trope }

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("AMUD \(column.id)").font(.caption.weight(.medium)).tracking(2)
                Spacer()
                Text("תיקון קוראים").font(TorahFont.font(20))
            }
            .foregroundStyle(.secondary)
            Rectangle().fill(Color.primary.opacity(0.12)).frame(height: 1)
            ColumnInk(column: column, vowels: vowels, trope: trope)
                .aspectRatio(1 / 3.65, contentMode: .fit)
                .padding(.horizontal, showAliyahMarkers ? 8 : 0)
                .overlay {
                    if displaysAliyahMarkers {
                        GeometryReader { geometry in
                            ForEach(Array(column.rows.enumerated()), id: \.offset) { index, row in
                                if let aliyah = row.aliyah {
                                    Text(AliyahLabel.compact(aliyah))
                                        .font(.system(size: 7, weight: .semibold))
                                        .foregroundStyle(Color(red: 0.90, green: 0.10, blue: 0.12))
                                        .frame(width: 8)
                                        .position(x: geometry.size.width - 4,
                                                  y: (CGFloat(index) + 0.5) * geometry.size.height / 42)
                                        .accessibilityLabel("\(AliyahLabel.hebrew(aliyah)) aliyah")
                                }
                            }
                        }
                    }
                }
                .accessibilityLabel("Amud \(column.id). Torah column with 42 lines.")
                .accessibilityValue(column.rows.flatMap(\.segments).flatMap { $0 }.flatMap { $0 }.map {
                    HebrewText.display($0.readingText, vowels: vowels, trope: trope, verseEndings: trope)
                }.filter { !$0.isEmpty }.joined(separator: " ").replacingOccurrences(of: "־ ", with: "־"))
            Text("\(column.id)").font(.caption).foregroundStyle(.secondary)
        }
        .padding(.horizontal, 8).padding(.vertical, 20)
        .background(colorScheme == .dark ? Color(red: 0.19, green: 0.17, blue: 0.14) : Color(red: 0.98, green: 0.96, blue: 0.90))
    }
}

/// Core Text supplies native Hebrew shaping and justification within each
/// original source fragment. No web view or bitmap text is involved.
private struct ColumnInk: UIViewRepresentable {
    let column: TorahColumn
    let vowels: Bool
    let trope: Bool

    func makeUIView(context: Context) -> ColumnInkView { ColumnInkView() }
    func updateUIView(_ view: ColumnInkView, context: Context) {
        view.column = column
        view.vowels = vowels
        view.trope = trope
        view.backgroundColor = .clear
        view.setNeedsDisplay()
    }
}

private final class ColumnInkView: UIView {
    var column: TorahColumn?
    var vowels = true
    var trope = true

    override func draw(_ rect: CGRect) {
        guard let column, let context = UIGraphicsGetCurrentContext() else { return }
        let rowHeight = bounds.height / 42
        let fontSize = bounds.width / 22
        context.textMatrix = .identity
        context.translateBy(x: 0, y: bounds.height)
        context.scaleBy(x: 1, y: -1)
        for (rowIndex, row) in column.rows.enumerated() {
            let columnGap = fontSize * 1.5
            let columnWidth = (bounds.width - columnGap * CGFloat(max(0, row.segments.count - 1))) / CGFloat(max(1, row.segments.count))
            for (index, fragments) in row.segments.enumerated() {
                let texts = fragments.map { words in
                    words.map { HebrewText.display($0.readingText, vowels: vowels, trope: trope, verseEndings: trope) }.filter { !$0.isEmpty }.joined(separator: " ").replacingOccurrences(of: "־ ", with: "־")
                }
                if column.id == 78 && (6...35).contains(rowIndex) {
                    let naturalWidths = texts.map { Double(width(line($0, size: fontSize))) }
                    let placement = SongLineLayout(widths: naturalWidths,
                        availableWidth: Double(columnWidth), minimumGap: Double(fontSize * 1.8))
                    for (fragmentIndex, text) in texts.enumerated() where !text.isEmpty {
                        let original = line(text, size: fontSize * placement.scale)
                        let rendered = texts.count == 1
                            ? (CTLineCreateJustifiedLine(original, 1, columnWidth) ?? original) : original
                        context.textPosition = CGPoint(
                            x: bounds.width - placement.offsetsFromRight[fragmentIndex] - width(rendered),
                            y: bounds.height - CGFloat(rowIndex) * rowHeight - rowHeight * 0.72)
                        CTLineDraw(rendered, context)
                    }
                    continue
                }
                let isPoetry = (column.id == 78 && (6...35).contains(rowIndex)) ||
                    (column.id == 242 && rowIndex >= 7) || (column.id == 243 && rowIndex < 35)
                let isLastText = column.id == 245 && rowIndex == column.rows.lastIndex(where: {
                    !$0.segments.flatMap { $0 }.flatMap { $0 }.isEmpty
                })
                if !isPoetry && (texts.count > 1 || row.petucha || isLastText) {
                    let naturalWidths = texts.map { width(line($0, size: fontSize)) }
                    let placement = SectionLineLayout(widths: naturalWidths.map(Double.init),
                        availableWidth: Double(columnWidth), minimumGap: Double(fontSize * 5.95),
                        openEnding: row.petucha || isLastText)
                    let right = bounds.width - CGFloat(index) * (columnWidth + columnGap)
                    for (fragmentIndex, text) in texts.enumerated() where !text.isEmpty {
                        let rendered = line(text, size: fontSize * placement.scale)
                        context.textPosition = CGPoint(
                            x: right - placement.offsetsFromRight[fragmentIndex] - width(rendered),
                            y: bounds.height - CGFloat(rowIndex) * rowHeight - rowHeight * 0.72)
                        CTLineDraw(rendered, context)
                    }
                    continue
                }
                let gap = fontSize * 1.6
                let usable = max(1, columnWidth - gap * CGFloat(max(0, texts.count - 1)))
                let naturalWidths = texts.map { width(line($0, size: fontSize)) }
                let total = max(1, naturalWidths.reduce(0, +))
                var right = bounds.width - CGFloat(index) * (columnWidth + columnGap)
                for (fragmentIndex, text) in texts.enumerated() {
                    let allotted = usable * naturalWidths[fragmentIndex] / total
                    guard !text.isEmpty else { continue }
                    let fittedSize = fontSize * min(1, allotted / max(1, naturalWidths[fragmentIndex]))
                    let original = line(text, size: fittedSize)
                    // Preserve short petucha endings and the Torah's final line.
                    let isLastText = column.id == 245 && rowIndex == column.rows.lastIndex(where: { !$0.segments.flatMap { $0 }.flatMap { $0 }.isEmpty })
                    let shouldJustify = !isLastText && !(row.petucha && fragmentIndex == texts.lastIndex(where: { !$0.isEmpty }))
                    let rendered = shouldJustify ? (CTLineCreateJustifiedLine(original, 1, allotted) ?? original) : original
                    let y = bounds.height - CGFloat(rowIndex) * rowHeight - rowHeight * 0.72
                    context.textPosition = CGPoint(x: right - width(rendered), y: y)
                    CTLineDraw(rendered, context)
                    right -= allotted + gap
                }
            }
        }
    }

    private func line(_ text: String, size: CGFloat) -> CTLine {
        let paragraph = NSMutableParagraphStyle()
        paragraph.baseWritingDirection = .rightToLeft
        return CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: [
            .font: UIFont(name: TorahFont.name, size: size) ?? UIFont.systemFont(ofSize: size),
            .foregroundColor: UIColor.label,
            .paragraphStyle: paragraph
        ]))
    }

    private func width(_ line: CTLine) -> CGFloat { CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil)) }
}
