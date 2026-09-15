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
    let inspect: (ReadingWord) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        view.isEditable = false
        view.isScrollEnabled = false
        view.backgroundColor = .clear
        view.textContainerInset = .zero
        view.textContainer.lineFragmentPadding = 0
        view.textContainer.lineBreakMode = .byWordWrapping
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        view.delegate = context.coordinator
        return view
    }

    func updateUIView(_ view: UITextView, context: Context) {
        context.coordinator.parent = self
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .justified
        paragraph.baseWritingDirection = .rightToLeft
        paragraph.lineSpacing = lineSpacing
        paragraph.hyphenationFactor = 0
        let text = NSMutableAttributedString(string: "")
        for (index, word) in words.enumerated() {
            if text.length > 0 { text.append(NSAttributedString(string: " ")) }
            let displayed = HebrewText.display(word.text, vowels: vowels, trope: trope, verseEndings: false)
            text.append(NSAttributedString(string: displayed, attributes: [
                .link: URL(string: "tikkun://word/\(index)")!
            ]))
        }
        text.addAttributes([
            .font: UIFont(name: TorahFont.name, size: fontSize) ?? UIFont.systemFont(ofSize: fontSize),
            .foregroundColor: UIColor.label,
            .paragraphStyle: paragraph
        ], range: NSRange(location: 0, length: text.length))
        view.linkTextAttributes = [.foregroundColor: UIColor.label, .underlineStyle: 0]
        if !view.attributedText.isEqual(to: text) { view.attributedText = text }
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextView, context: Context) -> CGSize? {
        guard let width = proposal.width, width > 0 else { return nil }
        return CGSize(width: width, height: ceil(uiView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height))
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: FlowingTextView
        init(parent: FlowingTextView) { self.parent = parent }

        func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange, interaction: UITextItemInteraction) -> Bool {
            guard URL.scheme == "tikkun", let index = Int(URL.lastPathComponent), parent.words.indices.contains(index) else { return false }
            parent.inspect(parent.words[index])
            return false
        }
    }
}
