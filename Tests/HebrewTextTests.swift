import XCTest
@testable import TikkunCore

final class HebrewTextTests: XCTestCase {
    func testSongBrickAnchorsAndFit() {
        let three = SongLineLayout(widths: [20, 80, 20], availableWidth: 200, minimumGap: 20)
        XCTAssertEqual(three.scale, 1)
        XCTAssertEqual(three.offsetsFromRight, [0, 60, 180])
        let two = SongLineLayout(widths: [100, 100], availableWidth: 180, minimumGap: 40)
        XCTAssertEqual(two.scale, 0.75)
        XCTAssertEqual(two.offsetsFromRight, [0, 105])
    }

    func testUpperReadingInBothDecalogues() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let data = try Data(contentsOf: root.appendingPathComponent("Tikkun/Resources/torah-columns.json"))
        let columns = try JSONDecoder().decode([TorahColumn].self, from: data)
        for pages in [[83, 84], [208, 209]] {
            let words = columns.filter { pages.contains($0.id) }.flatMap(\.rows).flatMap(\.segments).flatMap { $0 }.flatMap { $0 }
            let upper = words.filter { $0.upperReading != nil }
            XCTAssertGreaterThan(upper.count, 100)
            XCTAssertTrue(upper.first!.readingText.contains("אָֽנֹכִי֙"))
            for word in upper {
                let consonants: (String) -> String = { String($0.unicodeScalars.filter { (0x05D0...0x05EA).contains($0.value) }) }
                XCTAssertEqual(consonants(word.text), consonants(word.readingText))
            }
            let zachor = upper.first { HebrewText.display($0.text, vowels: false, trope: false) == "זכור" }
            if pages[0] == 83 {
                XCTAssertEqual(zachor?.readingText, "זָכוֹר֩")
            }
        }
    }

    func testConsonantsAndPunctuationSurvivePractice() {
        XCTAssertEqual(HebrewText.display("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים׃", vowels: false, trope: false), "בראשית ברא אלהים׃")
        XCTAssertEqual(HebrewText.display("עַל־פְּנֵ֣י", vowels: false, trope: false), "על־פני")
    }
    func testReaderVerseEndingsFollowTropeSetting() {
        for vowels in [true, false] {
            for trope in [true, false] {
                let source = "הָאָֽרֶץ׃"
                let displayed = HebrewText.display(source, vowels: vowels, trope: trope, verseEndings: trope)
                XCTAssertEqual(displayed.hasSuffix("׃"), trope)
            }
        }
    }
    func testControlsAreIndependent() {
        let source = "בָּרָ֣א"
        XCTAssertEqual(HebrewText.display(source, vowels: true, trope: false), "בָּרָא")
        XCTAssertEqual(HebrewText.display(source, vowels: false, trope: true), "בר֣א")
        XCTAssertEqual(HebrewText.display(source, vowels: true, trope: true), source)
    }

    func testPaseqFollowsTropeSetting() {
        XCTAssertEqual(HebrewText.display("׀", vowels: true, trope: false), "")
        XCTAssertEqual(HebrewText.display("׀", vowels: true, trope: true), "׀")
    }
    func testScribalMarksAndInvertedNunRemain() {
        XCTAssertEqual(HebrewText.display("׆ אׇֽׅׄ׃", vowels: false, trope: false), "׆ אׅׄ׃")
    }
    func testCorpusDecodesAndPreservesQeri() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let data = try Data(contentsOf: root.appendingPathComponent("Tikkun/Resources/learning-corpus.json"))
        let passages = try JSONDecoder().decode([Passage].self, from: data)
        XCTAssertEqual(passages.count, 54)
        XCTAssertEqual(passages.first?.verseCount, 146)
        XCTAssertEqual(passages.first!.approximateColumns, 5 + 31.0 / 42, accuracy: 0.0001)
        XCTAssertEqual(passages.last?.verseCount, 41)
        XCTAssertEqual(passages.last!.approximateColumns, 70.0 / 42, accuracy: 0.0001)
        XCTAssertTrue(passages.allSatisfy { $0.verseCount > 0 && $0.approximateColumns > 0 })
        // Yitro has alternate accentuation; block count is not its pasuk count.
        XCTAssertEqual(passages.first { $0.id == "yitro" }?.verseCount, 72)
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
