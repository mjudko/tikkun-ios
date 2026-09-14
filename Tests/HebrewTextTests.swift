import XCTest
@testable import TikkunCore

final class HebrewTextTests: XCTestCase {
    func testConsonantsAndPunctuationSurvivePractice() {
        XCTAssertEqual(HebrewText.display("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים׃", vowels: false, trope: false), "בראשית ברא אלהים׃")
        XCTAssertEqual(HebrewText.display("עַל־פְּנֵ֣י", vowels: false, trope: false), "על־פני")
    }
    func testControlsAreIndependent() {
        let source = "בָּרָ֣א"
        XCTAssertEqual(HebrewText.display(source, vowels: true, trope: false), "בָּרָא")
        XCTAssertEqual(HebrewText.display(source, vowels: false, trope: true), "בר֣א")
        XCTAssertEqual(HebrewText.display(source, vowels: true, trope: true), source)
    }
    func testScribalMarksAndInvertedNunRemain() {
        XCTAssertEqual(HebrewText.display("׆ אׇֽׅׄ׃", vowels: false, trope: false), "׆ אׅׄ׃")
    }
    func testCorpusDecodesAndPreservesQeri() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let data = try Data(contentsOf: root.appendingPathComponent("Tikkun/Resources/learning-corpus.json"))
        let passages = try JSONDecoder().decode([Passage].self, from: data)
        XCTAssertEqual(passages.count, 54)
        XCTAssertEqual(Set(passages.map(\.id)).count, 54)
        let words = passages.flatMap(\.blocks).flatMap(\.words)
        XCTAssertEqual(words.filter { $0.qeri != nil }.count, 33)
        XCTAssertTrue(words.contains { $0.qeri == "הַיְצֵ֣א" && $0.ketiv == "הוצא" })
        XCTAssertTrue(words.allSatisfy { !$0.text.contains("#") })
        XCTAssertEqual(passages.first?.blocks.first?.words.first?.text, "בְּרֵאשִׁ֖ית")
        XCTAssertEqual(passages.last?.blocks.last?.words.last?.text, "כׇּל־יִשְׂרָאֵֽל׃")
        XCTAssertTrue(passages.allSatisfy { !$0.blocks.isEmpty })
    }
}
