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
        let displayed = words.map {
            HebrewText.display($0.readingText, vowels: vowels, trope: trope, verseEndings: trope)
        }.filter { !$0.isEmpty }.joined(separator: " ").replacingOccurrences(of: "־ ", with: "־")
        let text = NSMutableAttributedString(string: displayed)
        text.addAttributes([
            .font: UIFont(name: TorahFont.name, size: fontSize) ?? UIFont.systemFont(ofSize: fontSize),
            .foregroundColor: UIColor.label,
            .paragraphStyle: paragraph
        ], range: NSRange(location: 0, length: text.length))
        if !view.attributedText.isEqual(to: text) { view.attributedText = text }
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextView, context: Context) -> CGSize? {
        guard let width = proposal.width, width > 0 else { return nil }
        return CGSize(width: width, height: ceil(uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height))
    }
}
