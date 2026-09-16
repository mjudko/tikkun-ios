import SwiftUI
import UIKit

/// TextKit provides paragraph justification and measures the complete passage,
/// while SwiftUI owns the surrounding scrolling and reading controls.
struct FlowingTextView: UIViewRepresentable {
    let words: [ReadingWord]
    let fontSize: CGFloat
    let lineSpacing: CGFloat
    let vowels: Bool
    let trope: Bool
    let showAliyahMarkers: Bool

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        view.isEditable = false
        view.isScrollEnabled = false
        view.backgroundColor = .clear
        view.textContainerInset = .zero
        view.textContainer.lineFragmentPadding = 0
        view.textContainer.lineBreakMode = .byWordWrapping
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return view
    }

    func updateUIView(_ view: UITextView, context: Context) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .justified
        paragraph.baseWritingDirection = .rightToLeft
        paragraph.lineSpacing = lineSpacing
        paragraph.hyphenationFactor = 0
        let bodyAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont(name: TorahFont.name, size: fontSize) ?? UIFont.systemFont(ofSize: fontSize),
            .foregroundColor: UIColor.label,
            .paragraphStyle: paragraph
        ]
        let markerAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: max(12, fontSize * 0.48), weight: .semibold),
            .foregroundColor: UIColor.systemBrown,
            .baselineOffset: fontSize * 0.18,
            .paragraphStyle: paragraph
        ]
        let text = NSMutableAttributedString()
        for word in words {
            let displayed = HebrewText.display(
                word.readingText, vowels: vowels, trope: trope, verseEndings: trope
            ).replacingOccurrences(of: "־ ", with: "־")
            if showAliyahMarkers, let aliyah = word.aliyah {
                if text.length > 0 { text.append(NSAttributedString(string: "  ", attributes: bodyAttributes)) }
                text.append(NSAttributedString(string: AliyahLabel.hebrew(aliyah), attributes: markerAttributes))
            }
            guard !displayed.isEmpty else { continue }
            if text.length > 0, !text.string.hasSuffix("־") {
                text.append(NSAttributedString(string: " ", attributes: bodyAttributes))
            }
            text.append(NSAttributedString(string: displayed, attributes: bodyAttributes))
        }
        if !view.attributedText.isEqual(to: text) { view.attributedText = text }
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextView, context: Context) -> CGSize? {
        guard let width = proposal.width, width > 0 else { return nil }
        return CGSize(width: width, height: ceil(uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height))
    }
}
