import XCTest
@testable import TikkunCore

final class HebrewTextTests: XCTestCase {
    func testConsonantsAndPunctuationSurvivePractice() {
        XCTAssertEqual(HebrewText.display("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים׃", vowels: false, trope: false), "בראשית ברא אלהים׃")
        XCTAssertEqual(HebrewText.display("עַל־פְּנֵ֣י", vowels: false, trope: false), "על־פני")
    }
    func testColumnVerseEndingsStayHiddenInEveryMarksSetting() {
        for vowels in [true, false] {
            for trope in [true, false] {
                let source = "הָאָֽרֶץ׃"
                let displayed = HebrewText.display(source, vowels: vowels, trope: trope, verseEndings: false)
                XCTAssertFalse(displayed.contains("׃"))
                XCTAssertEqual(displayed, HebrewText.display("הָאָֽרֶץ", vowels: vowels, trope: trope))
                XCTAssertTrue(HebrewText.display(source, vowels: vowels, trope: trope).hasSuffix("׃"))
            }
        }
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
    func testColumnsPreserveAllReadingWordsAndFortyTwoRows() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let resources = root.appendingPathComponent("Tikkun/Resources")
        let decoder = JSONDecoder()
        let columns = try decoder.decode([TorahColumn].self, from: Data(contentsOf: resources.appendingPathComponent("torah-columns.json")))
        let passages = try decoder.decode([Passage].self, from: Data(contentsOf: resources.appendingPathComponent("learning-corpus.json")))
        XCTAssertEqual(columns.map(\.id), Array(1...245))
        XCTAssertTrue(columns.allSatisfy { $0.rows.count == 42 })
        let columnWords = columns.flatMap(\.rows).flatMap(\.segments).flatMap { $0 }.flatMap { $0 }
        XCTAssertEqual(columnWords, passages.flatMap(\.blocks).flatMap(\.words))
        XCTAssertTrue(columns[77].rows[5].segments.isEmpty)
        XCTAssertTrue(columns[77].rows[36].segments.isEmpty)
        XCTAssertTrue(columns[241].rows.contains { $0.segments.count > 1 })
    }
    func testSectionBreaksKeepNaturalTextAndPutExtraSpaceInTheGap() {
        let closed = SectionLineLayout(widths: [60, 80], availableWidth: 300, minimumGap: 60, openEnding: false)
        XCTAssertEqual(closed.scale, 1)
        XCTAssertEqual(closed.offsetsFromRight.first, 0)
        XCTAssertEqual(closed.offsetsFromRight[1] + 80, 300)
        XCTAssertGreaterThanOrEqual(closed.offsetsFromRight[1] - 60, 60)
        let open = SectionLineLayout(widths: [100], availableWidth: 300, minimumGap: 60, openEnding: true)
        XCTAssertEqual(open.scale, 1)
        XCTAssertEqual(open.offsetsFromRight, [0])
        let crowded = SectionLineLayout(widths: [150, 150], availableWidth: 300, minimumGap: 60, openEnding: false)
        XCTAssertLessThan(crowded.scale, 1)
        XCTAssertEqual(crowded.offsetsFromRight[1] + 150 * crowded.scale, 300, accuracy: 0.001)
        XCTAssertGreaterThan(crowded.offsetsFromRight[1] - 150 * crowded.scale, 0)
        let leadingGap = SectionLineLayout(widths: [0, 80], availableWidth: 300, minimumGap: 60, openEnding: false)
        XCTAssertEqual(leadingGap.offsetsFromRight[1], 220)
    }
}
